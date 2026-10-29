/**
 * All Gmail DOM assumptions live here. Gmail has no public DOM contract, so these WILL need
 * occasional fixes. They were written from knowledge of Gmail's markup, not tested against a live
 * Gmail page: verify in DevTools if something does not appear.
 */
export const SEL = {
  /** Gmail top bar. */
  header: 'header[role="banner"]',
  /** Google Account button: its aria-label contains the account e-mail (locale independent). */
  accountButton: '[aria-label*="@"]',
  /** Gmail's own Compose button in the left rail. */
  composeButton: 'div[gh="cm"]',
  /** Compose window (docked, pop-up or full-screen) = dialog that contains an editable body. */
  composeDialog: 'div[role="dialog"]',
  composeBody: 'div[g_editable="true"][role="textbox"]',
  /** Send button candidates within compose. */
  composeSendButton: [
    'div[role="button"][data-tooltip^="Send"]',
    'div[role="button"][data-tooltip*="Send"]',
    'div[role="button"][aria-label^="Send"]',
    'button[aria-label^="Send"]'
  ].join(','),
  /** Send options split-button (arrow/dropdown), used for Schedule send. */
  composeSendOptionsButton: [
    'div[role="button"][data-tooltip*="More send options"]',
    'div[role="button"][aria-label*="More send options"]',
    'div[role="button"][data-tooltip*="Schedule send"]',
    'div[role="button"][aria-label*="Schedule send"]',
    'button[aria-label*="More send options"]',
    'button[aria-label*="Schedule send"]'
  ].join(','),
  /** Recipient chips carry the e-mail in one of these. */
  recipientChip: '[data-hovercard-id], span[email], div[email]',
  /** Ignore chips that are not recipients. */
  recipientIgnore: '[name="from"], [g_editable="true"]'
};
