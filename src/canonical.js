/** Canonical JSON: object keys sorted, array order preserved, no timestamps. */
export function canonical(value, depth = 0) {
  if (depth > 32) throw new TypeError('JSON nesting is too deep.');
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new TypeError('Only finite JSON numbers are supported.'); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(v=>canonical(v,depth+1)).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical(value[k],depth+1)}`).join(',')}}`;
  throw new TypeError('Only plain JSON values are supported.');
}
export async function digest(value) {
  const bytes=new TextEncoder().encode(canonical(value));
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
