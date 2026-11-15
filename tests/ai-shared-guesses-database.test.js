import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('공용 AI 저장소 PostgreSQL: 누구나 읽고, 서버(service_role)만 쓰며, 숨긴 답은 보이지 않는다', async () => {
  const db = new PGlite();
  const as = async (role, sql, args = []) => {
    await db.exec(`begin;set local role ${role};`);
    try { const result = await db.query(sql, args); await db.exec('commit'); return result.rows; }
    catch (error) { await db.exec('rollback'); throw error; }
  };
  try {
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
    const sql = await readFile(new URL('../supabase/ai-shared-guesses.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    const insert = "insert into public.ai_item_guesses(name_key,canonical_key,display_name,material,route,confidence,reason) values($1,$1,$1,'기타','general','high','이유')";
    await as('service_role', insert, ['실리콘집게']);
    await as('service_role', insert, ['숨긴물건']);
    await as('service_role', "update public.ai_item_guesses set hidden=true where name_key='숨긴물건'");
    for (const role of ['anon', 'authenticated']) {
      assert.deepEqual((await as(role, 'select name_key from public.ai_item_guesses')).map(row => row.name_key), ['실리콘집게']);
      await assert.rejects(as(role, insert, ['조작']), { code: '42501' });
      await assert.rejects(as(role, "update public.ai_item_guesses set route='recyclable'"), { code: '42501' });
      await assert.rejects(as(role, 'delete from public.ai_item_guesses'), { code: '42501' });
    }
    await assert.rejects(as('service_role', "insert into public.ai_item_guesses(name_key,canonical_key,display_name,material,route,confidence) values('x','x','x','기타','general','low')"), /check/);
  } finally { await db.close(); }
});
