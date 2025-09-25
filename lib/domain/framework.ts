// Pure domain helpers: ref codes, sort order, grouping.

export function refCode(pIdx: number, tIdx?: number, sIdx?: number) {
  const p = `P${pIdx + 1}`;
  if (tIdx === undefined) return p;
  const t = `T${tIdx + 1}`;
  if (sIdx === undefined) return `${p}.${t}`;
  const s = `S${sIdx + 1}`;
  return `${p}.${t}.${s}`;
}

export function sortKey(pIdx: number, tIdx?: number, sIdx?: number) {
  // 3-level sortable integer: p * 1e6 + t * 1e3 + s
  const a = (pIdx + 1) * 1_000_000;
  const b = tIdx !== undefined ? (tIdx + 1) * 1_000 : 0;
  const c = sIdx !== undefined ? (sIdx + 1) : 0;
  return a + b + c;
}
