/** Open-redirect guard for ?next=: only same-site absolute paths survive. `//evil.com` and `/\evil.com` are protocol-relative. */
export const safeNext = (next: string | null | undefined, fallback = '/') =>
  next && /^\/(?![/\\])/.test(next) ? next : fallback
