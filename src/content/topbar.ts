import { SEL } from './selectors';
import { settings } from './state';

const BTN_ID = 'infoguard-compose-secure';
const STYLE_ID = 'infoguard-topbar-style';

const ICON = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  <rect x="2" y="2" width="9" height="7" rx="1.5" fill="#0b5fff" stroke="#0b5fff"/>
  <path d="M4.2 2V1.2a2.3 2.3 0 0 1 4.6 0V2" stroke="#0b5fff"/>
  <circle cx="6.5" cy="5.5" r="1" fill="#fff" stroke="none"/>
</svg>`;

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
    #${BTN_ID} { display:inline-flex; align-items:center; justify-content:center; align-self:center; flex:0 0 auto;
      width:40px; height:40px; margin:0 4px; border-radius:50%; cursor:pointer; color:inherit; opacity:.8; user-select:none; }
    #${BTN_ID}:hover { background:rgba(128,128,128,.22); opacity:1; }
    #${BTN_ID}.ig-floating { position:fixed; top:10px; right:240px; z-index:2147483000; background:rgba(128,128,128,.12); }
  `;
  document.head.appendChild(st);
}

function findInsertion(): { parent: HTMLElement; before: Element | null } | null {
  if (settings.anchorSelector) {
    try {
      const a = document.querySelector<HTMLElement>(settings.anchorSelector);
      if (a?.parentElement) return { parent: a.parentElement, before: a };
    } catch {
      /* invalid selector: ignore */
    }
  }
  const header = document.querySelector<HTMLElement>(SEL.header);
  const account = header?.querySelector<HTMLElement>(SEL.accountButton);
  if (!header || !account) return null;

  // Climb to the first ancestor row that holds several siblings (Support, Settings, Apps, Account ...).
  let node: HTMLElement = account;
  while (node.parentElement && node.parentElement !== header) {
    const row = node.parentElement;
    if (row.children.length >= 3) {
      // Insert before the first child in the right half of the window = left edge of the icon group.
      const first = Array.from(row.children).find((c) => {
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.left > window.innerWidth * 0.5;
      });
      return { parent: row, before: first ?? null };
    }
    node = row;
  }
  return null;
}

/** Called on every tick; re-adds the button if Gmail re-rendered the header. */
export function ensureTopbarButton(onClick: () => void): void {
  injectStyle();
  let btn = document.getElementById(BTN_ID);

  if (btn?.isConnected) {
    // If the automatic placement ended up outside the top bar, switch to the floating fallback.
    const r = btn.getBoundingClientRect();
    if (!btn.classList.contains('ig-floating') && (r.width === 0 || r.top > 90)) {
      btn.classList.add('ig-floating');
      document.body.appendChild(btn);
    }
    return;
  }

  btn = document.createElement('div');
  btn.id = BTN_ID;
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-label', 'Compose Secure');
  btn.title = 'Compose Secure';
  btn.innerHTML = ICON;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  });

  const spot = findInsertion();
  if (spot) {
    spot.parent.insertBefore(btn, spot.before);
  } else if (document.querySelector(SEL.header)) {
    // Header present but structure not recognised: float it until the next tick can place it.
    btn.classList.add('ig-floating');
    document.body.appendChild(btn);
  }
}
