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
