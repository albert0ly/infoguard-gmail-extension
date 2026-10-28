import type { PhoneItem, Req, Res } from '../shared/types';
import { normalizeMobile } from '../shared/validation';
import { addMarker, getBody, getRecipients, hasMarker, removeMarker } from './dom';
import { settings } from './state';

function send<T>(req: Req): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(req, (res: Res | undefined) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        if (!res) return reject(new Error('No response from extension.'));
        res.ok ? resolve(res.data as T) : reject(new Error(res.error));
      });
    } catch (e) {
      reject(new Error('Extension was reloaded. Refresh the Gmail tab.'));
    }
  });
}

const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
  .pill { position: fixed; z-index: 2147483000; padding: 4px 10px; border-radius: 14px; font-size: 12px; cursor: pointer;
    color: #fff; background: #0b5fff; box-shadow: 0 1px 4px rgba(0,0,0,.35); user-select: none; white-space: nowrap; }
  .pill.secure { background: #188038; }
  .panel { position: fixed; z-index: 2147483001; width: 330px; overflow-y: auto; background: #fff; color: #202124;
    border-radius: 8px; box-shadow: 0 4px 18px rgba(0,0,0,.35); padding: 12px; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: center; font-weight: 600; margin-bottom: 8px; }
  .x { cursor: pointer; font-size: 18px; line-height: 1; padding: 0 4px; }
  .row { margin: 8px 0; }
  .row label { display: block; font-size: 12px; color: #5f6368; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
  .row input { width: 100%; padding: 6px 8px; border: 1px solid #dadce0; border-radius: 4px; font-size: 13px; }
  .row input.bad { border-color: #d93025; }
  .status { margin: 8px 0; min-height: 16px; }
  .status.err { color: #d93025; }
  .status.ok { color: #188038; }
  .btns { display: flex; gap: 6px; flex-wrap: wrap; }
  button { padding: 6px 12px; border-radius: 4px; border: 1px solid #dadce0; background: #fff; cursor: pointer; font-size: 13px; }
  button.primary { background: #0b5fff; border-color: #0b5fff; color: #fff; }
  button:disabled { opacity: .55; cursor: default; }
`;

type Kind = '' | 'ok' | 'err';

export class ComposeUI {
  private host = document.createElement('div');
  private root = this.host.attachShadow({ mode: 'open' });
  private pill = document.createElement('div');
  private panel = document.createElement('div');

  private open = false;
  private busy = false;
  private emails: string[] = [];
  private lastSig = '';
  private stored = new Map<string, string | null>(); // from server
  private values = new Map<string, string>(); // typed by user
  private bad = new Set<string>();
  private status: { text: string; kind: Kind } = { text: '', kind: '' };
  private pillSecure: boolean | null = null;

  constructor(private compose: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.pill.className = 'pill';
    this.panel.className = 'panel';
    this.panel.style.display = 'none';
    this.pill.addEventListener('click', () => (this.open ? this.close() : this.openPanel()));
    this.root.append(style, this.pill, this.panel);
    document.body.appendChild(this.host);
    this.update();
  }

  destroy() {
    this.host.remove();
  }

  openPanel() {
    this.open = true;
    this.lastSig = '';
    this.status = { text: '', kind: '' };
    this.update();
  }

  private close() {
    this.open = false;
    this.update();
  }

  /** Called every tick by main.ts. */
  update() {
    const r = this.compose.getBoundingClientRect();
    const hidden = r.width === 0 || r.height === 0;
    this.host.style.display = hidden ? 'none' : '';
    if (hidden) return;

    const secure = hasMarker(this.compose, settings.marker);
    if (secure !== this.pillSecure) {
      this.pillSecure = secure;
      this.pill.classList.toggle('secure', secure);
      this.pill.textContent = secure ? '\u{1F512} Secure \u2713' : '\u{1F512} Make Secure';
      if (this.open) this.render();
    }

    // Pill sits just above the compose window (inside it when the window touches the top of the screen).
    if (r.top > 34) {
      this.pill.style.top = r.top - 30 + 'px';
      this.pill.style.left = Math.max(4, r.left) + 'px';
    } else {
      this.pill.style.top = r.top + 6 + 'px';
      this.pill.style.left = r.left + 170 + 'px';
    }

    // Panel opens upward from the pill, or overlays the compose window when there is no room above.
    this.panel.style.display = this.open ? 'block' : 'none';
    if (this.open) {
      if (r.top > 300) {
        this.panel.style.left = Math.max(4, r.left) + 'px';
        this.panel.style.top = 'auto';
        this.panel.style.bottom = window.innerHeight - (r.top - 34) + 'px';
        this.panel.style.maxHeight = r.top - 46 + 'px';
      } else {
        this.panel.style.left = Math.max(4, r.right - 340) + 'px';
        this.panel.style.top = r.top + 50 + 'px';
        this.panel.style.bottom = 'auto';
        this.panel.style.maxHeight = Math.max(200, window.innerHeight - r.top - 70) + 'px';
      }

      // Recipients changed while the panel is open: re-sync (typed values are kept).
      const sig = getRecipients(this.compose).join(',');
      if (!this.busy && sig !== this.lastSig) void this.refresh();
    }
  }

  private async refresh() {
    this.emails = getRecipients(this.compose);
    this.lastSig = this.emails.join(',');
    this.bad.clear();
    const unknown = this.emails.filter((e) => !this.stored.has(e));
    if (unknown.length) {
      this.busy = true;
      this.setStatus('Looking up numbers...', '');
      try {
        const items = await send<PhoneItem[]>({ type: 'lookup', emails: unknown });
        const byEmail = new Map(items.map((i) => [i.email.toLowerCase(), i.mobile]));
        for (const e of unknown) this.stored.set(e, byEmail.get(e) ?? null);
        this.setStatus('', '');
      } catch (e) {
        this.setStatus('Lookup failed: ' + (e as Error).message, 'err');
      } finally {
        this.busy = false;
      }
    } else if (!this.emails.length) {
      this.setStatus('Add at least one recipient.', '');
    } else {
      this.setStatus('', '');
    }
    this.render();
  }

  private setStatus(text: string, kind: Kind) {
    this.status = { text, kind };
    const el = this.panel.querySelector('.status');
    if (el) {
      el.textContent = text;
      el.className = 'status ' + kind;
    }
  }

  private currentValue(email: string): string {
    return this.values.get(email) ?? this.stored.get(email) ?? '';
  }

  private render() {
    const p = this.panel;
    p.textContent = '';

    const head = document.createElement('div');
    head.className = 'head';
    const title = document.createElement('span');
    title.textContent = 'InfoGuard - Make Secure';
    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = '\u00d7';
    x.addEventListener('click', () => this.close());
    head.append(title, x);
    p.append(head);

    for (const email of this.emails) {
      const row = document.createElement('div');
      row.className = 'row';
      const label = document.createElement('label');
      label.textContent = email;
      const input = document.createElement('input');
      input.type = 'tel';
      input.placeholder = '+972501234567';
      input.value = this.currentValue(email);
      if (this.bad.has(email)) input.className = 'bad';
      input.addEventListener('input', () => {
        this.values.set(email, input.value);
        input.classList.remove('bad');
      });
      row.append(label, input);
      p.append(row);
    }

    const status = document.createElement('div');
    status.className = 'status ' + this.status.kind;
    status.textContent = this.status.text;
    p.append(status);

    const btns = document.createElement('div');
    btns.className = 'btns';
    const secure = hasMarker(this.compose, settings.marker);

    const make = document.createElement('button');
    make.className = 'primary';
    make.textContent = secure ? 'Update numbers' : 'Make Secure';
    make.disabled = this.busy || !this.emails.length;
    make.addEventListener('click', () => void this.makeSecure());
    btns.append(make);

    if (secure) {
      const rm = document.createElement('button');
      rm.textContent = 'Remove security';
      rm.addEventListener('click', () => {
        removeMarker(this.compose, settings.marker);
        this.setStatus('Security removed.', '');
        this.update();
      });
      btns.append(rm);
    }

    const rf = document.createElement('button');
    rf.textContent = 'Refresh';
    rf.addEventListener('click', () => {
      this.stored.clear();
      this.lastSig = '';
      void this.refresh();
    });
    btns.append(rf);
    p.append(btns);
  }

  private async makeSecure() {
    if (this.busy) return;
    this.emails = getRecipients(this.compose);
    if (!this.emails.length) return this.setStatus('Add at least one recipient.', 'err');
    if (!getBody(this.compose)) return this.setStatus('Compose body not found.', 'err');

    // Validate every recipient's number.
    const normalized = new Map<string, string>();
    this.bad.clear();
    for (const email of this.emails) {
      const n = normalizeMobile(this.currentValue(email));
      if (n) normalized.set(email, n);
      else this.bad.add(email);
    }
    if (this.bad.size) {
      this.render();
      return this.setStatus(
        'Enter a valid international mobile (e.g. +972501234567) for: ' + Array.from(this.bad).join(', '),
        'err'
      );
    }

    // Save only added or updated numbers.
    const changed = this.emails
      .filter((e) => normalized.get(e) !== this.stored.get(e))
      .map((e) => ({ email: e, mobile: normalized.get(e)! }));

    this.busy = true;
    this.render();
    try {
      if (changed.length) {
        await send<void>({ type: 'save', items: changed });
        for (const c of changed) {
          this.stored.set(c.email, c.mobile);
          this.values.set(c.email, c.mobile);
        }
      }
      addMarker(this.compose, settings.marker);
      this.busy = false;
      this.render();
      this.setStatus('Secure. Send the mail as usual.', 'ok');
      this.update();
    } catch (e) {
      this.busy = false;
      this.render();
      this.setStatus('Failed: ' + (e as Error).message, 'err');
    }
  }
}
