import { findComposes } from './dom';
import { ComposeUI } from './panel';
import { SEL } from './selectors';
import { initSettings } from './state';
import { ensureTopbarButton } from './topbar';

const uis = new Map<HTMLElement, ComposeUI>();

function tick() {
  ensureTopbarButton(openSecureCompose);

  const composes = findComposes();
  for (const c of composes) if (!uis.has(c)) uis.set(c, new ComposeUI(c));
  for (const [c, ui] of uis) {
    if (!c.isConnected || !composes.includes(c)) {
      ui.destroy();
      uis.delete(c);
    } else {
      ui.update();
    }
  }
}

function clickLikeUser(el: HTMLElement) {
  for (const type of ['mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
}

/** Top-bar "Compose Secure": open Gmail's Compose, then open the Make Secure panel on the new window. */
function openSecureCompose() {
  const before = new Set(findComposes());
  const gmailCompose = document.querySelector<HTMLElement>(SEL.composeButton);
  let usedFallback = false;
  if (gmailCompose) clickLikeUser(gmailCompose);
  else {
    location.hash = '#inbox?compose=new';
    usedFallback = true;
  }

  const started = Date.now();
  const timer = setInterval(() => {
    const fresh = findComposes().find((c) => !before.has(c));
    if (fresh) {
      clearInterval(timer);
      let ui = uis.get(fresh);
      if (!ui) {
        ui = new ComposeUI(fresh);
        uis.set(fresh, ui);
      }
      ui.openPanel();
      return;
    }
    const elapsed = Date.now() - started;
    if (!usedFallback && elapsed > 1000) {
      // Button click did not open a compose window: use Gmail's compose URL instead.
      usedFallback = true;
      location.hash = '#inbox?compose=new';
    }
    if (elapsed > 4000) clearInterval(timer);
  }, 150);
}

initSettings().then(() => setInterval(tick, 300));
