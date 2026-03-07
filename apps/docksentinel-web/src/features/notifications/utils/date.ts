export function toEpoch(value: string) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

export function sortNewestFirst<T extends { id: string; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const dateDiff = toEpoch(b.createdAt) - toEpoch(a.createdAt);
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });
}
