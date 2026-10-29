import { SEL } from './selectors';
import { settings } from './state';

const BTN_ID = 'infoguard-compose-secure';
const STYLE_ID = 'infoguard-topbar-style';

const ICON_SRC =
  'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/mail_lock/fill1/48px.svg';

function findNativeComposeButton(): HTMLElement | null {
  const compose = document.querySelector<HTMLElement>(SEL.composeButton);
  if (!compose) return null;
  return compose.closest<HTMLElement>('[role="button"],button') ?? compose;
}

function syncWithNativeComposeStyle(btn: HTMLElement): void {
  const native = findNativeComposeButton();
  if (!native) return;

  const s = getComputedStyle(native);
  btn.style.backgroundColor = s.backgroundColor;
  btn.style.color = s.color;
  btn.style.borderRadius = s.borderRadius;
  btn.style.boxShadow = s.boxShadow;
  btn.style.fontFamily = s.fontFamily;
  btn.style.fontSize = s.fontSize;
  btn.style.fontWeight = s.fontWeight;
  btn.style.lineHeight = s.lineHeight;
  btn.style.borderStyle = s.borderStyle;
  btn.style.borderWidth = s.borderWidth;
  btn.style.borderColor = s.borderColor;
  btn.style.height = s.height;
  btn.style.minHeight = s.minHeight;
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
    #${BTN_ID} {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      align-self: center;
      flex: 0 0 auto;
      min-width: 150px;
      height: 48px;
      margin: 0 10px 0 4px;
      padding: 0 18px 0 16px;
      border-radius: 16px;
      border: 1px solid #c6dafc;
      background: #c2e7ff;
      color: #001d35;
      font: 500 14px/20px 'Google Sans', Roboto, Arial, sans-serif;
      letter-spacing: .01em;
      cursor: pointer;
      user-select: none;
      box-shadow: 0 1px 2px rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15);
      transition: filter .15s ease;
    }
    #${BTN_ID}:hover {
      filter: brightness(.97);
    }
    #${BTN_ID}:active {
      filter: brightness(.94);
    }
    #${BTN_ID} .ig-icon {
      width: 20px;
      height: 20px;
      object-fit: contain;
      flex: 0 0 auto;
    }
    #${BTN_ID} .ig-label {
      white-space: nowrap;
    }
    #${BTN_ID}.ig-floating {
      position: fixed;
      top: 14px;
      right: 240px;
      z-index: 2147483000;
    }
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
    syncWithNativeComposeStyle(btn);
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
  const icon = document.createElement('img');
  icon.className = 'ig-icon';
  icon.src = ICON_SRC;
  icon.alt = '';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'ig-label';
  label.textContent = 'Compose Secure';

  btn.append(icon, label);
  syncWithNativeComposeStyle(btn);
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
