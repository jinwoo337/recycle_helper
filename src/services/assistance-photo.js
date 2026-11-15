import { ASSIST_IMAGE_TYPES, ASSIST_IMAGE_MAX, ASSIST_UPLOAD_MAX } from '../domain/disposal/ai-assistance.js';

// 아이폰 기본 사진 형식(HEIC/HEIF)도 받습니다. 브라우저가 바로 못 열면 JPG로 바꾼 뒤 처리합니다.
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const HEIC_CONVERTER = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
const unspecifiedType = file => !file?.type || file.type === 'application/octet-stream';
export const isHeicFile = file => HEIC_TYPES.includes(file?.type) || unspecifiedType(file) && /\.hei[cf]$/i.test(file?.name || '');

let converterLoading;
function loadHeicConverter() {
  if (globalThis.heic2any) return Promise.resolve(globalThis.heic2any);
  converterLoading ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HEIC_CONVERTER; script.async = true;
    const finish = () => {
      clearTimeout(timer);
      script.remove();
      if (globalThis.heic2any) resolve(globalThis.heic2any);
      else reject(new Error('HEIC converter unavailable'));
    };
    const timer = setTimeout(finish, 10_000);
    script.onload = finish;
    script.onerror = finish;
    document.head.append(script);
  }).catch(error => { converterLoading = null; throw error; });
  return converterLoading;
}

const openImage = src => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image); image.onerror = reject; image.src = src;
});

async function openPhoto(file) {
  const url = URL.createObjectURL(file);
  try { return { image: await openImage(url), url }; }
  catch {
    URL.revokeObjectURL(url);
    if (!isHeicFile(file)) throw new Error('사진을 열 수 없어요. 다른 사진을 선택해 주세요.');
  }
  // 사파리 외 브라우저는 HEIC를 직접 못 열어서 변환기를 불러와 JPG로 바꿉니다.
  let converted;
  try {
    const heic2any = await loadHeicConverter();
    const output = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    converted = Array.isArray(output) ? output[0] : output;
  } catch { throw new Error('HEIC 사진을 변환하지 못했어요. 인터넷 연결을 확인하거나 JPG 사진으로 다시 선택해 주세요.'); }
  const url2 = URL.createObjectURL(converted);
  try { return { image: await openImage(url2), url: url2 }; }
  catch { URL.revokeObjectURL(url2); throw new Error('사진을 열 수 없어요. 다른 사진을 선택해 주세요.'); }
}

// 브라우저에서 다시 그려 크기를 줄이고 촬영 위치 등 원본 메타데이터를 전송하지 않습니다.
export async function prepareAssistancePhoto(file) {
  const imageExtension = unspecifiedType(file) && /\.(jpe?g|png|webp)$/i.test(file?.name || '');
  if (!file || !(ASSIST_IMAGE_TYPES.includes(file.type) || isHeicFile(file) || imageExtension)) throw new Error('JPG·PNG·WebP·HEIC 사진을 선택해 주세요.');
  if (!file.size || file.size > ASSIST_UPLOAD_MAX) throw new Error('12MB 이하의 사진을 선택해 주세요.');
  const { image, url } = await openPhoto(file);
  try {
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 80_000_000) throw new Error('사진 해상도가 너무 커요. 작은 크기로 저장한 뒤 다시 선택해 주세요.');
    const ratio = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서 사진을 처리하지 못했어요. 이름이나 설명으로 찾아주세요.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.65, 0.45]) {
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const data = dataUrl.split(',')[1];
      if (data && data.length * 3 / 4 <= ASSIST_IMAGE_MAX) return { image: { mimeType: 'image/jpeg', data }, preview: dataUrl };
    }
    throw new Error('사진 용량을 충분히 줄이지 못했어요. 더 작은 사진을 선택해 주세요.');
  } finally { URL.revokeObjectURL(url); }
}
