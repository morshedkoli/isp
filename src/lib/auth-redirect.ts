export const DEFAULT_LOGIN_REDIRECT = '/dashboard';

/**
 * Normalise a `callbackUrl` before redirecting to it.
 *
 * The value round-trips through the query string, so it is attacker-controlled:
 * only same-origin, path-relative targets are allowed. Anything else (absolute
 * URLs, protocol-relative `//evil.com`, or a bare fragment) falls back to the
 * dashboard so a crafted login link can't bounce users off-site.
 */
export function safeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback: string = DEFAULT_LOGIN_REDIRECT
): string {
  if (!callbackUrl) {
    return fallback;
  }

  // Tolerate values that were encoded more than once by older links.
  let value = callbackUrl;
  for (let i = 0; i < 3 && value.includes('%'); i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      return fallback;
    }
  }

  // Must be a root-relative path, and not protocol-relative ("//evil.com").
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }

  // Never bounce back to the login page itself — that produces a redirect loop.
  if (value === '/' || value.startsWith('/login')) {
    return fallback;
  }

  return value;
}
