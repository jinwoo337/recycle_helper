import { writeFileSync } from 'node:fs';
import { expandedItemEntries, CATALOG_SOURCE, CATALOG_CHECKED_AT } from '../src/domain/disposal/expanded-catalog.js';
import { TYPES, MATERIALS } from '../src/domain/disposal/rules.js';
import { CATALOG_DETAIL_SOURCES } from '../src/domain/disposal/catalog-sources.js';
import { FOOD_SOURCE } from '../src/domain/disposal/food.js';
const sqlText = value => `'${String(value).replaceAll("'", "''")}'`;
const values = expandedItemEntries.map(([aliases,material,type,note],index) => {
  if (!MATERIALS.includes(material) || (type && !TYPES[material]?.some(([id])=>id===type))) throw new Error(`Invalid catalog row ${index}`);
  return `(${sqlText(`expanded-20261027-${String(index+1).padStart(3,'0')}`)}, ARRAY[${aliases.map(sqlText).join(',')}], ${sqlText(material)}, ${sqlText(type)}, ${sqlText(note)})`;
});
writeFileSync(new URL('../supabase/catalog-expansion.sql',import.meta.url), `-- Optional: publish the reviewed public catalog rows in Supabase SQL Editor.\n-- Existing rows, user accounts, records, policies and schemas are unchanged.\n-- Typical editable composition stays in the versioned application catalog.\nbegin;\ninsert into public.disposal_items (id,aliases,material,item_type,note) values\n${values.join(',\n')}\non conflict (id) do nothing;\ncommit;\n`);
const rows = expandedItemEntries.map(([names,material,type,,metadata],index) => {
  const behavior = metadata.handling==='stationery-general' ? '소량 필기구 종량제 안내' : metadata.handling ? '품목별 처리·지역 확인' : metadata.defaults?.components ? `결합·분리 가능 / ${metadata.defaults.components.map(part=>part.label||part.material).join(' + ')}` : metadata.defaults?.combined==='no' ? '단일 구성 예시' : '재질·종류';
  const sourceName = metadata.source===FOOD_SOURCE ? '금천구 음식물 안내 (지역 차이 확인)' : CATALOG_DETAIL_SOURCES[metadata.source] || '공개 분리배출 지침';
  return `| ${index+1} | ${names[0]} | ${names.slice(1).join('、')||'—'} | ${material}${type ? ` / ${type}` : ''} | ${behavior} · [출처: ${sourceName}](${metadata.source}) |`;
});
writeFileSync(new URL('../docs/catalog-expansion.md',import.meta.url), `# 품목 정보 확장\n\n확인일: ${CATALOG_CHECKED_AT}. 대표 품목 ${expandedItemEntries.length}개 유형, 검색 명칭 ${expandedItemEntries.reduce((n,row)=>n+row[0].length,0)}개. 기존 명칭의 보완을 포함하며, 모두 신규 제품이라는 뜻은 아닙니다.\n\n기준: [공개 분리배출 지침](${CATALOG_SOURCE}), [품목사전](https://wasteguide.or.kr/front/dischargeMethod/dictionary.do). 제품별 구성은 물건 이름·재질 표시에 맞춰 확인할 수정 가능한 예시이며 모든 브랜드의 실물을 검증한 것은 아닙니다.\n\n- 재질·종류·대표 결합 구성만 채우고 현재 오염·세척 상태는 입력하지 않습니다.\n- 생수병은 투명 PET와 비닐 라벨 예시를 제공하지만 유색·무라벨·종이 라벨 제품은 수정해야 합니다. 뚜껑은 압착 후 닫는 기존 안내를 유지합니다.\n- 별도 수거 제품은 재질 선택 없이 전지·조명·전자제품 안내를 제공하고 상태/지역/수거처 확인 필요 상태를 유지합니다.\n- 운영 DB의 기존 행을 유지하고 추가 목록을 앱에 병합하므로 DB 연결 성공 시에도 확장 품목을 사용할 수 있습니다. 일반 품목의 DB 재질·종류는 유지하며, 검토된 별도 수거 품목은 오래된 DB 재질보다 전용 안내를 우선합니다.\n- SQL은 선택 사항입니다. 앱 반영에 실행이 필수는 아니며 기존 사용자 데이터·RLS·테이블 구조를 바꾸지 않습니다. DB에 현재 상태 기본값이나 임의 사용자 데이터를 넣지 않습니다.\n\n| 번호 | 대표 명칭 | 함께 찾는 명칭 | 기본 정보 | 자동 입력 범위 |\n| --- | --- | --- | --- | --- |\n${rows.join('\n')}\n`);
console.log(`Catalog: ${expandedItemEntries.length} profiles; SQL and review document generated.`);
