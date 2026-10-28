export interface Settings {
  apiMode: 'mock' | 'live';
  apiBaseUrl: string;
  oauthClientId: string;
  marker: string;
  anchorSelector: string;
}

export const DEFAULTS: Settings = {
  apiMode: 'mock',
  apiBaseUrl: '',
  oauthClientId: '',
  marker: '[[INFOGUARD-SECURE:1]]',
  anchorSelector: ''
};

export async function getSettings(): Promise<Settings> {
  const s = await chrome.storage.sync.get(DEFAULTS as unknown as Record<string, unknown>);
  return { ...DEFAULTS, ...(s as Partial<Settings>) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.sync.set(s as unknown as Record<string, unknown>);
}
