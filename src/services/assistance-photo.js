import { ASSIST_IMAGE_TYPES, ASSIST_IMAGE_MAX, ASSIST_UPLOAD_MAX } from '../domain/disposal/ai-assistance.js';

const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
export const PHOTO_ACCEPT = [...ASSIST_IMAGE_TYPES, ...HEIC_TYPES, '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].join(',');
const unspecifiedType = file => !file?.type || file.type === 'application/octet-stream';
export const isHeicFile = file => HEIC_TYPES.includes(file?.type) || unspecifiedType(file) && /\.hei[cf]$/i.test(file?.name || '');

async function convertHeicPhoto(file) {
  let timer;
  try {
    return await Promise.race([
      import('../vendor/heic-to-1.6.7/heic-to.js').then(({ heicTo }) => heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('HEIC conversion timed out')), 30_000); }),
    ]);
  } finally { clearTimeout(timer); }
}

const openImage = src => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image); image.onerror = reject; image.src = src;
});

async function openPhoto(file, convertHeic) {
  const url = URL.createObjectURL(file);
  try { return { image: await openImage(url), url }; }
  catch {
    URL.revokeObjectURL(url);
    if (!isHeicFile(file)) throw new Error('사진을 열 수 없어요. 다른 사진을 선택해 주세요.');
  }
  // HEIC를 직접 열 수 없는 브라우저에서는 기기 안에서 JPEG로 변환합니다.
  let converted;
  try {
    converted = await convertHeic(file);
    if (!(converted instanceof Blob) || !converted.size) throw new Error('Empty HEIC conversion');
  } catch { throw new Error('HEIC 사진을 변환하지 못했어요. 다시 시도하거나 JPG·PNG 사진으로 선택해 주세요.'); }
  const convertedUrl = URL.createObjectURL(converted);
  try { return { image: await openImage(convertedUrl), url: convertedUrl }; }
  catch {
    URL.revokeObjectURL(convertedUrl);
    throw new Error('변환한 HEIC 사진을 열 수 없어요. 다른 사진을 선택해 주세요.');
  }
}

// 브라우저에서 다시 그려 크기를 줄이고 촬영 위치 등 원본 메타데이터를 전송하지 않습니다.
export async function prepareAssistancePhoto(file, { convertHeic = convertHeicPhoto } = {}) {
  const imageExtension = unspecifiedType(file) && /\.(jpe?g|png|webp)$/i.test(file?.name || '');
  if (!file || !(ASSIST_IMAGE_TYPES.includes(file.type) || isHeicFile(file) || imageExtension)) throw new Error('JPG·PNG·WebP·HEIC·HEIF 사진을 선택해 주세요.');
  if (!file.size || file.size > ASSIST_UPLOAD_MAX) throw new Error('12MB 이하의 사진을 선택해 주세요.');
  const { image, url } = await openPhoto(file, convertHeic);
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
