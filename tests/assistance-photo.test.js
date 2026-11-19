import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAssistancePhoto } from '../src/services/assistance-photo.js';
import { parseAssistanceInput, ASSIST_UPLOAD_MAX, ASSIST_IMAGE_MAX } from '../src/domain/disposal/ai-assistance.js';
import { hasImageSignature } from '../api/assist.js';

const jpegData = Buffer.from([255, 216, 255, 224, 0, 0, 0, 0]).toString('base64');
const jpegUrl = `data:image/jpeg;base64,${jpegData}`;
const photo = (type = 'image/heic', name = 'IMG_0001.HEIC') => ({ type, name, size: 1024 });

async function withBrowser(run, { failImages = [], width = 4032, height = 3024, encode = () => jpegUrl } = {}) {
  const previous = { Image: globalThis.Image, document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const created = [], revoked = [], qualities = [], draws = [];
  const canvas = { getContext: () => ({ fillRect() {}, drawImage: (...args) => draws.push(args) }),
    toDataURL: (type, quality) => { assert.equal(type, 'image/jpeg'); qualities.push(quality); return encode(quality); } };
  URL.createObjectURL = blob => { created.push(blob); return `blob:photo-${created.length}`; };
  URL.revokeObjectURL = url => revoked.push(url);
  globalThis.Image = class {
    naturalWidth = width; naturalHeight = height;
    set src(url) { queueMicrotask(() => failImages.includes(url) ? this.onerror(new Error('Decode failed')) : this.onload()); }
  };
  globalThis.document = { createElement: tag => { assert.equal(tag, 'canvas'); return canvas; } };
  try { await run({ created, revoked, canvas, qualities, draws }); }
  finally {
    URL.createObjectURL = previous.create; URL.revokeObjectURL = previous.revoke;
    if (previous.Image === undefined) delete globalThis.Image; else globalThis.Image = previous.Image;
    if (previous.document === undefined) delete globalThis.document; else globalThis.document = previous.document;
  }
}

test('HEIC/HEIF MIME와 확장자를 받아 네이티브 실패 시 변환한 JPEG를 분석 입력으로 준비한다', async () => {
  for (const [type, name] of [
    ['image/heic', 'photo'], ['image/heif', 'photo'], ['image/heic-sequence', 'photo'], ['image/heif-sequence', 'photo'],
    ['', 'IMG.HEIC'], ['', 'IMG.HEIF'], ['application/octet-stream', 'IMG.heic'], ['application/octet-stream', 'IMG.heif'],
  ]) {
    await withBrowser(async ({ created, revoked, canvas, draws }) => {
      const file = photo(type, name), converted = new Blob(['converted'], { type: 'image/jpeg' });
      let calls = 0;
      const prepared = await prepareAssistancePhoto(file, { convertHeic: async original => { calls++; assert.equal(original, file); return converted; } });
      assert.equal(calls, 1);
      assert.deepEqual(created, [file, converted]);
      assert.deepEqual(revoked, ['blob:photo-1', 'blob:photo-2']);
      assert.equal(canvas.width, 1440); assert.equal(canvas.height, 1080); assert.equal(draws.length, 1);
      assert.equal(prepared.preview, jpegUrl);
      const input = parseAssistanceInput({ mode: 'photo', description: '', image: prepared.image });
      assert.ok(input); assert.equal(input.image.mimeType, 'image/jpeg'); assert.ok(hasImageSignature(input.image));
    }, { failImages: ['blob:photo-1'] });
  }
});

test('JPG·PNG·WebP와 직접 열리는 HEIC는 변환기를 사용하지 않고 같은 분석 흐름을 따른다', async () => {
  for (const [type, name] of [['image/jpeg', 'a.jpg'], ['image/png', 'a.png'], ['image/webp', 'a.webp'], ['image/heic', 'a.heic'], ['', 'a.JPEG'], ['', 'a.PNG'], ['application/octet-stream', 'a.WEBP']]) {
    await withBrowser(async ({ created, revoked, canvas }) => {
      const prepared = await prepareAssistancePhoto(photo(type, name), { convertHeic: () => assert.fail('불필요한 HEIC 변환') });
      assert.equal(prepared.image.data, jpegData); assert.equal(created.length, 1);
      assert.deepEqual(revoked, ['blob:photo-1']); assert.equal(canvas.width, 800); assert.equal(canvas.height, 600);
    }, { width: 800, height: 600 });
  }
});

test('지원하지 않는 파일·빈 파일·12MB 초과 파일은 디코딩 전에 거부한다', async () => {
  await withBrowser(async ({ created }) => {
    for (const file of [null, photo('image/gif', 'a.gif'), photo('text/html', 'a.heic'), photo('', 'a.svg')]) {
      await assert.rejects(prepareAssistancePhoto(file), /JPG·PNG·WebP·HEIC·HEIF/);
    }
    for (const type of ['image/jpeg', 'image/heic']) for (const size of [0, ASSIST_UPLOAD_MAX + 1]) {
      await assert.rejects(prepareAssistancePhoto({ ...photo(type), size }), /12MB/);
    }
    assert.equal(created.length, 0);
    await prepareAssistancePhoto({ ...photo(), size: ASSIST_UPLOAD_MAX });
  });
});

test('손상된 HEIC·변환 실패·변환 후 열기 실패에도 URL을 해제하고 오류를 안내한다', async () => {
  for (const convertHeic of [async () => { throw new Error('Decoder failed'); }, async () => null, async () => new Blob([])]) {
    await withBrowser(async ({ revoked }) => {
      await assert.rejects(prepareAssistancePhoto(photo(), { convertHeic }), /HEIC 사진을 변환하지 못했어요/);
      assert.deepEqual(revoked, ['blob:photo-1']);
    }, { failImages: ['blob:photo-1'] });
  }
  await withBrowser(async ({ revoked }) => {
    await assert.rejects(prepareAssistancePhoto(photo(), { convertHeic: async () => new Blob(['broken']) }), /변환한 HEIC 사진을 열 수 없어요/);
    assert.deepEqual(revoked, ['blob:photo-1', 'blob:photo-2']);
  }, { failImages: ['blob:photo-1', 'blob:photo-2'] });
  await withBrowser(async ({ revoked }) => {
    await assert.rejects(prepareAssistancePhoto(photo('image/png', 'bad.png'), { convertHeic: () => assert.fail('PNG는 변환하지 않음') }), /사진을 열 수 없어요/);
    assert.deepEqual(revoked, ['blob:photo-1']);
  }, { failImages: ['blob:photo-1'] });
});

test('변환한 HEIC에도 해상도·전송 용량 제한을 적용한다', async () => {
  await withBrowser(async ({ revoked }) => {
    await assert.rejects(prepareAssistancePhoto(photo(), { convertHeic: async () => new Blob(['converted']) }), /해상도가 너무 커요/);
    assert.deepEqual(revoked, ['blob:photo-1', 'blob:photo-2']);
  }, { failImages: ['blob:photo-1'], width: 10000, height: 10000 });
  const oversized = `data:image/jpeg;base64,${Buffer.alloc(ASSIST_IMAGE_MAX + 3).toString('base64')}`;
  await withBrowser(async ({ qualities, revoked }) => {
    await assert.rejects(prepareAssistancePhoto(photo()), /용량을 충분히 줄이지 못했어요/);
    assert.deepEqual(qualities, [0.85, 0.65, 0.45]); assert.deepEqual(revoked, ['blob:photo-1']);
  }, { encode: () => oversized });
});
