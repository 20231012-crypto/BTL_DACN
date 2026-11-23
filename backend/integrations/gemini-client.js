const stripQuotes = (s) =>
  String(s || '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();

const splitKeyString = (raw) => {
  const source = stripQuotes(raw);
  if (!source) return [];
  if (source.startsWith('[')) {
    try {
      const parsed = JSON.parse(source);
      if (Array.isArray(parsed)) return parsed.map(stripQuotes).filter(Boolean);
    } catch {
      // Fall back to delimiter split below.
    }
  }
  return source
    .split(/[\s,;]+/)
    .map(stripQuotes)
    .filter(Boolean);
};

export function geminiKeys(extraKeys = []) {
  const values = [];
  if (process.env.GEMINI_API_KEYS) {
    values.push(...splitKeyString(process.env.GEMINI_API_KEYS));
  }
  if (process.env.GEMINI_API_KEY) {
    values.push(...splitKeyString(process.env.GEMINI_API_KEY));
  }
  if (Array.isArray(extraKeys)) {
    for (const item of extraKeys) values.push(...splitKeyString(item));
  } else if (typeof extraKeys === 'string' && extraKeys.trim()) {
    values.push(...splitKeyString(extraKeys));
  }
  return [...new Set(values.filter(Boolean))].slice(0, 5);
}

// timeoutMs là tổng thời gian cho mọi khóa; attemptMs là thời gian tối đa cho mỗi lần gọi một khóa.
export async function geminiRequest(
  endpoint,
  body,
  timeoutMs = 20000,
  attemptMs = 8000,
  extraKeys = [],
) {
  const keys = geminiKeys(extraKeys);
  if (!keys.length) throw new Error('Chưa cấu hình Gemini.');
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  let lastDetail = '';
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
      lastStatus = response.status;
      try {
        const text = await response.text();
        const parsed = JSON.parse(text);
        const msg = parsed?.error?.message || parsed?.error?.status || text;
        lastDetail = String(msg || '').slice(0, 180);
      } catch {
        lastDetail = `HTTP ${response.status}`;
      }
      if (![401, 403, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      if (!['TimeoutError', 'AbortError', 'TypeError'].includes(error.name))
        throw error;
      lastDetail = error.name || 'NetworkError';
    }
  }
  const err = new Error(
    lastStatus
      ? `Gemini HTTP ${lastStatus}${lastDetail ? `: ${lastDetail}` : ''}`
      : `Gemini không phản hồi${lastDetail ? ` (${lastDetail})` : ''}`,
  );
  err.httpStatus = lastStatus;
  throw err;
}
