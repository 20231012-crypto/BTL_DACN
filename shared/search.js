export const normalizeSearch = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

function distance(left, right) {
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  );
  for (let i = 0; i <= left.length; i++) rows[i][0] = i;
  for (let j = 0; j <= right.length; j++) rows[0][j] = j;
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      )
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[left.length][right.length];
}

export function searchScore(value, query) {
  const haystack = normalizeSearch(value).slice(0, 3000);
  const needle = normalizeSearch(query).trim().slice(0, 100);
  if (!needle) return 1;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 90;
  if (haystack.includes(needle)) return 75;
  const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  const tokens = needle.split(/[^a-z0-9]+/).filter(Boolean);
  if (!tokens.length) return 0;
  let score = 60;
  for (const token of tokens) {
    if (words.some((word) => word.startsWith(token))) continue;
    if (token.length < 4 || /\d/.test(token) || token.length > 35) return 0;
    const max = token.length >= 8 ? 2 : 1;
    if (
      !words.some(
        (word) =>
          Math.abs(word.length - token.length) <= max &&
          word.length <= 35 &&
          distance(token, word) <= max,
      )
    )
      return 0;
    score -= 10;
  }
  return Math.max(1, score);
}
