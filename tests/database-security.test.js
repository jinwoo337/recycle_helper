import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { judgeDisposal } from '../src/domain/disposal/rules.js';

test('PostgreSQL: 스키마·품목·사용자 격리·통계·기록 이전·삭제', async t => {
  const db = new PGlite();
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const recordId = '33333333-3333-4333-8333-333333333333';
  const input = { itemName: '투명생수병', material: '페트병', type: 'clear-drink', contaminated: 'no', combined: 'no' };
  const result = judgeDisposal(input);
  async function asUser(user, action, role = 'authenticated') {
    await db.exec(`begin; set local role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [user || '']);
    try { const value = await action(); await db.exec('commit'); return value; }
    catch (error) { await db.exec('rollback'); throw error; }
  }
  const query = (sql, args = []) => db.query(sql, args);
  const insert = (user = owner, id = recordId) => query(
    'insert into public.disposal_records(user_id,id,item_name,input,result) values ($1,$2,$3,$4::jsonb,$5::jsonb)',
    [user, id, input.itemName, JSON.stringify(input), JSON.stringify(result)]);
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;`);
    await query('insert into auth.users(id) values ($1),($2)', [owner, other]);
    const setup = await readFile(new URL('../supabase/setup.sql', import.meta.url), 'utf8');
    await db.exec(setup);
    await db.exec(setup);

    await t.test('셋업 재실행과 공개 품목 조회, 비회원 개인 데이터 접근 차단', async () => {
      const items = await asUser(null, () => query('select * from public.disposal_items'), 'anon');
      assert.equal(items.rows.length, 21);
      await assert.rejects(asUser(null, () => query('select * from public.disposal_records'), 'anon'), { code: '42501' });
      await assert.rejects(asUser(null, () => query("select public.get_disposal_statistics($1)", [owner]), 'anon'), { code: '42501' });
      await assert.rejects(asUser(owner, () => query("update public.disposal_items set material = '기타'")), { code: '42501' });
    });

    await t.test('회원 A 기록만 저장·조회하며 B의 읽기·쓰기·수정·삭제·통계를 차단', async () => {
      await asUser(owner, () => insert());
      assert.equal((await asUser(owner, () => query('select * from public.disposal_records'))).rows.length, 1);
      assert.equal((await asUser(other, () => query('select * from public.disposal_records'))).rows.length, 0);
      await assert.rejects(asUser(other, () => insert(owner, crypto.randomUUID())), { code: '42501' });
      await assert.rejects(asUser(owner, () => query("update public.disposal_records set item_name = '수정'")), { code: '42501' });
      assert.equal((await asUser(other, () => query('delete from public.disposal_records where user_id = $1 returning id', [owner]))).rows.length, 0);
      await assert.rejects(asUser(other, () => query('select public.clear_disposal_history($1)', [owner])), { code: '42501' });
      await assert.rejects(asUser(other, () => query('select public.get_disposal_statistics($1)', [owner])), { code: '42501' });
      const stats = await asUser(owner, () => query('select public.get_disposal_statistics($1) as stats', [owner]));
      assert.deepEqual(stats.rows[0].stats.counts, { pet: 1 });
    });

    await t.test('이전 기록은 중복되지 않고 삭제 후 재이전해도 되살아나지 않는다', async () => {
      const importedId = crypto.randomUUID();
      const rows = [{ id: importedId, item_name: input.itemName, input, result, created_at: new Date().toISOString() }];
      const migrate = () => asUser(owner, () => query('select public.import_disposal_history($1,$2::jsonb,$3::jsonb)',
        [owner, JSON.stringify(rows), JSON.stringify([input.itemName, '옛물품'])]));
      await migrate(); await migrate();
      assert.equal((await asUser(owner, () => query('select * from public.disposal_records'))).rows.length, 2);
      await asUser(owner, () => query('select public.delete_disposal_history($1,$2,null)', [owner, importedId]));
      await migrate();
      assert.equal((await asUser(owner, () => query('select * from public.disposal_records where id=$1', [importedId]))).rows.length, 0);
      assert.equal((await asUser(owner, () => query('select * from public.disposal_legacy_names'))).rows.length, 1);
      await asUser(owner, () => query('select public.clear_disposal_history($1)', [owner]));
      await migrate();
      assert.equal((await asUser(owner, () => query('select * from public.disposal_records'))).rows.length, 0);
      assert.equal((await asUser(owner, () => query('select * from public.disposal_legacy_names'))).rows.length, 0);
    });

    await t.test('잘못된 이전 요청은 전체 롤백하며 통계는 저장된 입력·결과로 집계한다', async () => {
      const bad = [{ id: crypto.randomUUID(), item_name: '잘못된이름', input, result, created_at: new Date().toISOString() }];
      await assert.rejects(asUser(owner, () => query('select public.import_disposal_history($1,$2::jsonb,$3::jsonb)',
        [owner, JSON.stringify(bad), '[]'])), { code: '23514' });
      const receipt = await asUser(owner, () => query('select * from public.disposal_import_receipts where import_key=$1', [`record:${bad[0].id}`]));
      assert.equal(receipt.rows.length, 0);
      for (const status of ['recycle', 'general', 'mixed', 'check']) {
        await asUser(owner, () => query('insert into public.disposal_records(user_id,id,item_name,input,result) values($1,$2,$3,$4::jsonb,$5::jsonb)',
          [owner, crypto.randomUUID(), input.itemName, JSON.stringify(input), JSON.stringify({ ...result, status })]));
      }
      const stats = await asUser(owner, () => query('select public.get_disposal_statistics($1) as stats', [owner]));
      assert.deepEqual(stats.rows[0].stats.counts, { pet: 1, general: 1, mixed: 1, check: 1 });
      const otherStats = await asUser(other, () => query('select public.get_disposal_statistics($1) as stats', [other]));
      assert.deepEqual(otherStats.rows[0].stats.counts, {});
    });
  } finally { await db.close(); }
});
