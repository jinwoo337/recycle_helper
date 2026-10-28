import { ASSIST_IMAGE_TYPES, ASSIST_IMAGE_MAX, ASSIST_UPLOAD_MAX } from '../domain/disposal/ai-assistance.js';

// 브라우저에서 다시 그려 크기를 줄이고 촬영 위치 등 원본 메타데이터를 전송하지 않습니다.
export async function prepareAssistancePhoto(file) {
  if (!file || !ASSIST_IMAGE_TYPES.includes(file.type)) throw new Error('JPG·PNG·WebP 사진을 선택해 주세요. HEIC 사진은 JPG로 바꿔 주세요.');
  if (!file.size || file.size > ASSIST_UPLOAD_MAX) throw new Error('12MB 이하의 사진을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('사진을 열 수 없어요. 다른 사진을 선택해 주세요.')); image.src = url; });
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
