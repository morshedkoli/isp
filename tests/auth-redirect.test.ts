import test from 'node:test';
import assert from 'node:assert/strict';
import { safeCallbackUrl, DEFAULT_LOGIN_REDIRECT } from '../src/lib/auth-redirect';

test('returns the dashboard when no callback url is supplied', () => {
  assert.equal(safeCallbackUrl(undefined), DEFAULT_LOGIN_REDIRECT);
  assert.equal(safeCallbackUrl(null), DEFAULT_LOGIN_REDIRECT);
  assert.equal(safeCallbackUrl(''), DEFAULT_LOGIN_REDIRECT);
});

test('keeps a relative path with its query string', () => {
  assert.equal(safeCallbackUrl('/reports?year=2026&month=7'), '/reports?year=2026&month=7');
  assert.equal(safeCallbackUrl('/commissions'), '/commissions');
});

test('decodes callback urls that were encoded more than once', () => {
  assert.equal(safeCallbackUrl('%2Fcommissions'), '/commissions');
  assert.equal(safeCallbackUrl('%252Fcommissions'), '/commissions');
});

test('rejects absolute urls pointing off-site', () => {
  assert.equal(safeCallbackUrl('https://evil.example.com'), DEFAULT_LOGIN_REDIRECT);
  assert.equal(safeCallbackUrl('http://evil.example.com/x'), DEFAULT_LOGIN_REDIRECT);
});

test('rejects protocol-relative and backslash-smuggled hosts', () => {
  assert.equal(safeCallbackUrl('//evil.example.com'), DEFAULT_LOGIN_REDIRECT);
  assert.equal(safeCallbackUrl('/\\evil.example.com'), DEFAULT_LOGIN_REDIRECT);
});

test('never redirects back to the login page', () => {
  assert.equal(safeCallbackUrl('/login'), DEFAULT_LOGIN_REDIRECT);
  assert.equal(safeCallbackUrl('/login?callbackUrl=%2Flogin'), DEFAULT_LOGIN_REDIRECT);
  assert.equal(safeCallbackUrl('/'), DEFAULT_LOGIN_REDIRECT);
});

test('falls back when the callback url is malformed', () => {
  assert.equal(safeCallbackUrl('%E0%A4%A'), DEFAULT_LOGIN_REDIRECT);
});

test('honours a caller supplied fallback', () => {
  assert.equal(safeCallbackUrl(null, '/settings'), '/settings');
});
