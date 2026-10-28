import { getSupabase } from './supabase.js';
import { setItemCatalog } from '../domain/disposal/item-suggestions.js';
import { readAllPages } from './database.js';
import { TYPES, MATERIALS } from '../domain/disposal/rules.js';

let pending;
let message = '';
export function getCatalogMessage() { return message; }

export async function loadItemCatalog(client) {
  const database = client || await getSupabase();
  const rows = await readAllPages(() => database.from('disposal_items')
    .select('id,aliases,material,item_type,note').eq('active', true).order('id'));
  if (rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('품목 데이터 형식을 확인해 주세요.');
  if (rows.some(row => (row.material && !MATERIALS.includes(row.material)) ||
    (row.item_type && !TYPES[row.material]?.some(([type]) => type === row.item_type)))) {
    throw new Error('품목의 재질 또는 세부 종류 설정을 확인해 주세요.');
  }
  setItemCatalog(rows);
  message = '';
  return rows;
}

export function initializeItemCatalog() {
  if (!pending) pending = loadItemCatalog().catch(error => {
    message = `${error.message} 현재는 마지막으로 확인한 품목 정보로 안내해요.`;
    pending = undefined;
  });
  return pending;
}
