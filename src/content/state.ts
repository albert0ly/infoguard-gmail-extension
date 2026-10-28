import { DEFAULTS, getSettings, type Settings } from '../shared/settings';

/** Live settings snapshot, kept current via storage change events. */
export let settings: Settings = { ...DEFAULTS };

export async function initSettings(): Promise<void> {
  settings = await getSettings();
  chrome.storage.onChanged.addListener(async () => {
    settings = await getSettings();
  });
}
