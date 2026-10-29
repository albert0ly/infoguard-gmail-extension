import { SEL } from './selectors';

const EMAIL_IN_TEXT = /[^\s<>,;"']+@[^\s<>,;"']+\.[^\s<>,;"']+/;

export function findComposes(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SEL.composeDialog)).filter(
    (d) => d.querySelector(SEL.composeBody) !== null
  );
}

export function getBody(compose: HTMLElement): HTMLElement | null {
  return compose.querySelector<HTMLElement>(SEL.composeBody);
}

function clickLikeUser(el: HTMLElement) {
  for (const type of ['mousedown', 'mouseup', 'click']) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
}

function getSendButton(compose: HTMLElement): HTMLElement | null {
  return compose.querySelector<HTMLElement>(SEL.composeSendButton);
}

function getSendOptionsButton(compose: HTMLElement): HTMLElement | null {
  return compose.querySelector<HTMLElement>(SEL.composeSendOptionsButton);
}

function getLabelNode(button: HTMLElement): HTMLElement {
  const nodes = Array.from(button.querySelectorAll<HTMLElement>('span, div'));
  const textNode = nodes.find((n) => (n.textContent || '').trim().length > 0);
  return textNode ?? button;
}

export function setComposeSecureSendVisual(compose: HTMLElement): void {
  const button = getSendButton(compose);
  const options = getSendOptionsButton(compose);
  if (!button && !options) return;

  if (button) {
    if (!button.dataset.infoguardOrigLabel) {
      button.dataset.infoguardOrigLabel = (button.getAttribute('aria-label') || '').trim();
    }
    if (!button.dataset.infoguardOrigStyle) {
      button.dataset.infoguardOrigStyle = button.getAttribute('style') || '';
    }

    const label = getLabelNode(button);
    if (!label.dataset.infoguardOrigText) {
      label.dataset.infoguardOrigText = (label.textContent || '').trim();
    }

    button.style.background = '#188038';
    button.style.borderColor = '#188038';
    button.style.color = '#ffffff';
    button.setAttribute('aria-label', 'Send Secure');
    label.textContent = 'Send Secure';
  }

  if (options) {
    if (!options.dataset.infoguardOrigStyle) {
      options.dataset.infoguardOrigStyle = options.getAttribute('style') || '';
    }
    options.style.background = '#188038';
    options.style.borderColor = '#188038';
    options.style.color = '#ffffff';
  }
}

export function clearComposeSecureSendVisual(compose: HTMLElement): void {
  const button = getSendButton(compose);
  if (button) {
    const label = getLabelNode(button);
    const origText = label.dataset.infoguardOrigText;
    if (origText !== undefined) label.textContent = origText;

    const origLabel = button.dataset.infoguardOrigLabel;
    if (origLabel !== undefined) {
      if (origLabel) button.setAttribute('aria-label', origLabel);
      else button.removeAttribute('aria-label');
    }

    const origStyle = button.dataset.infoguardOrigStyle;
    if (origStyle !== undefined) {
      if (origStyle) button.setAttribute('style', origStyle);
      else button.removeAttribute('style');
    } else {
      button.style.removeProperty('background');
      button.style.removeProperty('border-color');
      button.style.removeProperty('color');
    }
  }

  const options = getSendOptionsButton(compose);
  if (options) {
    const origStyle = options.dataset.infoguardOrigStyle;
    if (origStyle !== undefined) {
      if (origStyle) options.setAttribute('style', origStyle);
      else options.removeAttribute('style');
    } else {
      options.style.removeProperty('background');
      options.style.removeProperty('border-color');
      options.style.removeProperty('color');
    }
  }
}

export function sendCompose(compose: HTMLElement): boolean {
  const button = getSendButton(compose);
  if (!button) return false;
  clickLikeUser(button);
  return true;
}

/** Unique, lower-cased recipient e-mails (To + Cc + Bcc) read from the recipient chips. */
export function getRecipients(compose: HTMLElement): string[] {
  const found = new Set<string>();
  compose.querySelectorAll<HTMLElement>(SEL.recipientChip).forEach((el) => {
    if (el.closest(SEL.recipientIgnore)) return;
    const raw = el.getAttribute('data-hovercard-id') || el.getAttribute('email') || '';
    const m = raw.match(EMAIL_IN_TEXT);
    if (m) found.add(m[0].toLowerCase());
  });
  return Array.from(found).sort();
}

function fireInput(body: HTMLElement) {
  body.dispatchEvent(new InputEvent('input', { bubbles: true }));
}

export function hasMarker(compose: HTMLElement, marker: string): boolean {
  const body = getBody(compose);
  return !!body && (body.textContent || '').includes(marker);
}

/** Idempotent: never adds a second marker. */
export function addMarker(compose: HTMLElement, marker: string): boolean {
  const body = getBody(compose);
  if (!body) return false;
  if ((body.textContent || '').includes(marker)) return true;
  const div = document.createElement('div');
  div.setAttribute('data-infoguard-marker', '1');
  div.textContent = marker;
  body.appendChild(div);
  fireInput(body);
  return true;
}

export function removeMarker(compose: HTMLElement, marker: string): void {
  const body = getBody(compose);
  if (!body) return;
  body.querySelectorAll('[data-infoguard-marker]').forEach((n) => n.remove());

  // Fallback: marker text typed/pasted/restored by Gmail without our wrapper.
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    if (t.data.includes(marker)) hits.push(t);
  }
  for (const t of hits) {
    t.data = t.data.split(marker).join('');
    const p = t.parentElement;
    if (!t.data.trim() && p && p !== body && !(p.textContent || '').trim()) p.remove();
  }
  fireInput(body);
}
