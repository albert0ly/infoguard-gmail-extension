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
  /** Recipient chips carry the e-mail in one of these. */
  recipientChip: '[data-hovercard-id], span[email], div[email]',
  /** Ignore chips that are not recipients. */
  recipientIgnore: '[name="from"], [g_editable="true"]'
};
