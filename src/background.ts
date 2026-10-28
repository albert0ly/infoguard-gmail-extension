import { getSettings, type Settings } from './shared/settings';
import type { PhoneItem, Req, Res } from './shared/types';

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((msg: Req, _sender, sendResponse) => {
  handle(msg).then(
    (data) => sendResponse({ ok: true, data } satisfies Res),
    (err) => sendResponse({ ok: false, error: String(err?.message ?? err) } satisfies Res)
  );
  return true; // async response
});

async function handle(msg: Req): Promise<unknown> {
  const s = await getSettings();
  switch (msg.type) {
    case 'lookup':
      return s.apiMode === 'mock' ? mockLookup(msg.emails) : liveLookup(s, msg.emails);
    case 'save':
      return s.apiMode === 'mock' ? mockSave(msg.items) : liveSave(s, msg.items);
  }
}

/* ---------- mock mode: numbers kept in chrome.storage.local ---------- */

const MOCK_KEY = 'mockPhones';

async function readMock(): Promise<Record<string, string>> {
  const r = await chrome.storage.local.get(MOCK_KEY);
  return (r[MOCK_KEY] as Record<string, string> | undefined) ?? {};
}

async function mockLookup(emails: string[]): Promise<PhoneItem[]> {
  const db = await readMock();
  return emails.map((email) => ({ email, mobile: db[email.toLowerCase()] ?? null }));
}

async function mockSave(items: { email: string; mobile: string }[]): Promise<void> {
  const db = await readMock();
  for (const it of items) db[it.email.toLowerCase()] = it.mobile;
  await chrome.storage.local.set({ [MOCK_KEY]: db });
}

/* ---------- live mode: REST + Google ID token ---------- */

async function liveLookup(s: Settings, emails: string[]): Promise<PhoneItem[]> {
  const r = await post<{ items: PhoneItem[] }>(s, '/api/phones/lookup', { emails });
  return r.items ?? [];
}

async function liveSave(s: Settings, items: { email: string; mobile: string }[]): Promise<void> {
  await post<unknown>(s, '/api/phones/save', { items });
}

async function post<T>(s: Settings, path: string, body: unknown): Promise<T> {
  if (!s.apiBaseUrl) throw new Error('API base URL is not set (extension settings).');
  const token = await getIdToken(s);
  const resp = await fetch(s.apiBaseUrl.replace(/\/+$/, '') + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body)
  });
  if (resp.status === 401) await chrome.storage.session.remove('idToken');
  if (!resp.ok) throw new Error(`Server returned HTTP ${resp.status}`);
  const text = await resp.text();
  return (text ? JSON.parse(text) : {}) as T;
}

interface CachedToken {
  token: string;
  exp: number;
}

/** Google ID token via launchWebAuthFlow (implicit id_token flow). Cached until shortly before expiry. */
async function getIdToken(s: Settings): Promise<string> {
  const cached = (await chrome.storage.session.get('idToken')).idToken as CachedToken | undefined;
  if (cached && cached.exp - 60 > Date.now() / 1000) return cached.token;

  if (!s.oauthClientId) throw new Error('OAuth client ID is not set (extension settings).');
  const nonce = crypto.randomUUID();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: s.oauthClientId,
    response_type: 'id_token',
    redirect_uri: chrome.identity.getRedirectURL(),
    scope: 'openid email profile',
    nonce
  }).toString();

  const redirected = await chrome.identity.launchWebAuthFlow({ url: url.toString(), interactive: true });
  if (!redirected) throw new Error('Sign-in was cancelled.');
  const token = new URLSearchParams(new URL(redirected).hash.slice(1)).get('id_token');
  if (!token) throw new Error('Google did not return an ID token.');

  const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.nonce !== nonce) throw new Error('ID token nonce mismatch.');
  await chrome.storage.session.set({ idToken: { token, exp: payload.exp } satisfies CachedToken });
  return token;
}
