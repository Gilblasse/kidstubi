import 'server-only';

export function isCronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get('authorization');
  if (!header) return false;
  return header === `Bearer ${expected}`;
}
