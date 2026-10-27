import { getCurrentMember, isAuthReady } from './auth.js';
import { getSupabase } from './supabase.js';
import { databaseError, readAllPages } from './database.js';
import { normalizeItemName } from '../domain/disposal/item-suggestions.js';
import { validItemCategory } from '../domain/disposal/item-categories.js';

export function validFavoriteInput(input) {
  const fields = ['material', 'type', 'contaminated', 'washed', 'removable', 'combined', 'separable', 'foodSeparated'];
  const part = value => value && typeof value === 'object' && !Array.isArray(value) &&
    (value.category === undefined || validItemCategory(value.category)) &&
    fields.every(key => value[key] === undefined || typeof value[key] === 'string');
  return part(input) && typeof input.itemName === 'string' && input.itemName.trim().length > 0 &&
    input.itemName.length <= 80 && (input.components === undefined ||
      (Array.isArray(input.components) && input.components.length <= 5 && input.components.every(part)));
}

export function createMemberTools({ getClient = getSupabase, getMember = getCurrentMember, isReady = isAuthReady } = {}) {
  const guestKey = 'recycle-helper.favorites.v1.guest';
  function owner() {
    if (!isReady()) throw new Error('로그인 상태를 확인하지 못했어요. 연결을 확인하고 새로고침해 주세요.');
    return getMember()?.id || null;
  }
  function check(id) {
    if (owner() !== id) throw new Error('로그인 계정이 변경됐어요. 현재 계정에서 다시 시도해 주세요.');
  }
  async function request(id, operation) {
    check(id);
    const { data, error } = await operation();
    check(id);
    if (error) throw databaseError(error, '요청을 처리');
    return data;
  }
  function guestList() {
    try {
      const data = JSON.parse(localStorage.getItem(guestKey) || '[]');
      return Array.isArray(data) ? data.filter(value => validFavoriteInput(value?.input)) : [];
    } catch { return []; }
  }
  function notify() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('favorites-changed'));
    try { localStorage.setItem('recycle-helper.favorites-updated', crypto.randomUUID()); } catch { /* 알림만 생략 */ }
  }
  return {
    async listFavorites() {
      const id = owner();
      if (!id) return guestList();
      const client = await getClient(); check(id);
      const rows = await readAllPages(() => client.from('disposal_favorites').select('item_key,input,created_at')
        .eq('user_id', id).order('created_at', { ascending: false }).order('item_key'));
      check(id);
      return rows.filter(row => validFavoriteInput(row.input)).map(row => ({ key: row.item_key, input: row.input, createdAt: row.created_at }));
    },
    async setFavorite(input, selected) {
      if (!validFavoriteInput(input)) throw new Error('즐겨찾기에 저장할 입력 조건을 확인해 주세요.');
      const id = owner(), key = normalizeItemName(input.itemName);
      if (!id) {
        const values = guestList().filter(value => value.key !== key);
        if (selected) values.unshift({ key, input: structuredClone(input), createdAt: new Date().toISOString() });
        check(id);
        try { localStorage.setItem(guestKey, JSON.stringify(values)); }
        catch { throw new Error('즐겨찾기를 저장하지 못했어요. 브라우저 저장소를 확인해 주세요.'); }
      } else {
        const client = await getClient(); check(id);
        await request(id, () => selected ? client.from('disposal_favorites').upsert({ user_id: id,
          item_key: key, input: structuredClone(input) }, { onConflict: 'user_id,item_key' })
          : client.from('disposal_favorites').delete().eq('user_id', id).eq('item_key', key));
      }
      notify();
      return selected;
    },
    async submitFeedback({ kind, input, result = null, message }) {
      const id = owner();
      if (!id) throw new Error('제보를 보내려면 로그인해 주세요.');
      if (!['correction', 'missing_item'].includes(kind) || !validFavoriteInput(input) ||
        typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
        throw new Error('제보 종류와 내용을 확인해 주세요. 내용은 10~2,000자로 입력해 주세요.');
      }
      const client = await getClient(); check(id);
      return request(id, () => client.from('disposal_feedback').insert({ id: crypto.randomUUID(), user_id: id,
        kind, item_name: input.itemName, input: structuredClone(input), result: structuredClone(result),
        message: message.trim(), status: 'pending' }).select('id,status').single());
    },
  };
}

export const memberTools = createMemberTools();
