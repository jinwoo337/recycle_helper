import { readFile, writeFile } from 'node:fs/promises';
import { bundledItemEntries } from '../src/domain/disposal/item-suggestions.js';

const quote = value => `'${value.replaceAll("'", "''")}'`;
const rows = bundledItemEntries.map(([aliases, material, type, note], index) =>
  `(${quote(`catalog-${String(index + 1).padStart(3, '0')}`)}, ARRAY[${aliases.map(quote).join(',')}], ${quote(material)}, ${quote(type)}, ${quote(note || '실제 재질 표시를 확인해 주세요. 오염과 결합 상태는 직접 선택해 주세요.')})`);
const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const seed = `\n-- 기존 품목의 관리자 수정은 덮어쓰지 않습니다.\ninsert into public.disposal_items(id,aliases,material,item_type,note) values\n${rows.join(',\n')}\non conflict (id) do nothing;\n`;
await writeFile(new URL('../supabase/setup.sql', import.meta.url), schema.replace(/commit;\s*$/, `${seed}\nnotify pgrst, 'reload schema';\ncommit;\n`));
console.log(`supabase/setup.sql: ${rows.length}개 품목 묶음 생성`);
