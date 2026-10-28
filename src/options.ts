import { DEFAULTS, getSettings, saveSettings, type Settings } from './shared/settings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function load() {
  const s = await getSettings();
  $<HTMLSelectElement>('apiMode').value = s.apiMode;
  $<HTMLInputElement>('apiBaseUrl').value = s.apiBaseUrl;
  $<HTMLInputElement>('oauthClientId').value = s.oauthClientId;
  $<HTMLInputElement>('marker').value = s.marker;
  $<HTMLInputElement>('anchorSelector').value = s.anchorSelector;
  $('redirect').textContent = chrome.identity.getRedirectURL();
}

$('save').addEventListener('click', async () => {
  const status = $('status');
  const s: Settings = {
    apiMode: $<HTMLSelectElement>('apiMode').value as Settings['apiMode'],
    apiBaseUrl: $<HTMLInputElement>('apiBaseUrl').value.trim(),
    oauthClientId: $<HTMLInputElement>('oauthClientId').value.trim(),
    marker: $<HTMLInputElement>('marker').value.trim() || DEFAULTS.marker,
    anchorSelector: $<HTMLInputElement>('anchorSelector').value.trim()
  };
  try {
    if (s.apiMode === 'live' && s.apiBaseUrl) {
      const origin = new URL(s.apiBaseUrl).origin + '/*';
      const ok = await chrome.permissions.request({ origins: [origin] });
      if (!ok) throw new Error('Permission to call the API origin was denied.');
    }
    await saveSettings(s);
    status.textContent = 'Saved.';
  } catch (e) {
    status.textContent = 'Error: ' + (e as Error).message;
  }
});

load();
