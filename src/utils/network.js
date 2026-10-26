export async function fetchWithTimeout(resource, options = {}, timeoutMs = 12000, fetcher = fetch) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try { return await fetcher(resource, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
