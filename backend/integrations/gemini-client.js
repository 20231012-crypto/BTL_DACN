export function geminiKeys() {
  const source = process.env.GEMINI_API_KEYS?.trim();
  let values = [];
  if (source) {
    try {
      values = JSON.parse(source);
    } catch {
      values = source.split(/[\s,;]+/);
    }
    if (!Array.isArray(values)) values = [];
  }
  if (process.env.GEMINI_API_KEY) values.push(process.env.GEMINI_API_KEY);
  return [
    ...new Set(
      values
        .filter((key) => typeof key === 'string' && key.trim())
        .map((key) => key.trim()),
    ),
  ].slice(0, 5);
}

// timeoutMs là tổng thời gian cho mọi khóa; attemptMs là thời gian tối đa cho mỗi lần gọi một khóa.
export async function geminiRequest(
  endpoint,
  body,
  timeoutMs = 20000,
  attemptMs = 8000,
) {
  const keys = geminiKeys();
  if (!keys.length) throw new Error('Chưa cấu hình Gemini.');
  const deadline = Date.now() + timeoutMs;
  for (const key of keys) {
    const remaining = deadline - Date.now();
    if (remaining < 500) break;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${endpoint}`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(Math.min(attemptMs, remaining)),
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify(body),
        },
      );
      if (response.ok) return await response.json();
      await response.body?.cancel();
      if (![401, 403, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      if (!['TimeoutError', 'AbortError', 'TypeError'].includes(error.name))
        throw error;
    }
  }
  throw new Error('Gemini tạm thời chưa xử lý được. Vui lòng thử lại sau.');
}
