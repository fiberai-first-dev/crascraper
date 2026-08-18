export function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s : null;
}
