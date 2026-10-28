import { lookupItem } from './item-suggestions.js';
import { detectItemCategory } from './category-keywords.js';
import { guideForHandling } from './special-guides.js';

// 의류·약·전지 등은 이미 검토한 전용 경로를 사용합니다.
export function verifiedNameGuide(name) {
  const known = lookupItem(name);
  return guideForHandling(known?.handling) || guideForHandling(detectItemCategory(name)?.category);
}
