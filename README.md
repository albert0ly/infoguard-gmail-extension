# InfoGuard for Gmail - Chrome extension

Gmail equivalent of the InfoGuard Outlook add-in, as a Manifest V3 Chrome extension (TypeScript, esbuild).

## What it does
1. **Compose Secure** icon on Gmail's top bar (left of Support / Settings / Google apps / Account). Click = opens Gmail's Compose and opens the Make Secure panel on it.
2. Every compose window gets a pill above it: **Make Secure** (blue) / **Secure ✓** (green). The green pill is the visual indication, visible with the panel closed.
3. Panel: reads To/Cc/Bcc chips, looks up stored mobile numbers (REST), shows one input per e-mail, you fill the missing ones. It re-syncs when recipients change.
4. **Make Secure**: validates every number (international format `+9725...`), saves only added/changed numbers (REST), appends the marker `[[INFOGUARD-SECURE:1]]` to the body (never twice). **Remove security** deletes it.
5. You send normally. A Gmail routing rule matches the marker and routes the mail to your SMTP server (see below).

Unlike the add-on, the extension can read and delete the marker, so the state is always accurate.

## Setup (VS Code)
```
npm install
npm run build          # output in dist/
```
Chrome: `chrome://extensions` > Developer mode > **Load unpacked** > select the `dist` folder.
Reload the Gmail tab. After code changes: `npm run build` (or `npm run watch`), click reload on the extension, refresh Gmail.

For a demo on another computer without npm: `npm run zip` creates `infoguard-extension-dist.zip`; unzip there and Load unpacked.

## Settings (extension Options page; click the extension icon)
- **API mode**: `mock` (default; numbers stored in this browser, no server needed) or `live`.
- **API base URL**: live mode. Endpoints:
  - `POST /api/phones/lookup` `{ "emails": ["a@x.com"] }` -> `{ "items": [ { "email": "a@x.com", "mobile": "+972..." | null } ] }`
  - `POST /api/phones/save` `{ "items": [ { "email": "a@x.com", "mobile": "+972..." } ] }`
  - Header `Authorization: Bearer <Google ID token>`
- **OAuth client ID**: live mode. Google Cloud Console > Credentials > OAuth client ID, type **Web application**; Authorized redirect URI = the value shown on the Options page (`https://<extension-id>.chromiumapp.org/`). The ID changes if the unpacked folder path changes.
- **Marker text**, **Top-bar anchor selector** (only if auto placement breaks).

Server token validation (same as the add-on design):
```csharp
var payload = await GoogleJsonWebSignature.ValidateAsync(token, new GoogleJsonWebSignature.ValidationSettings
{
    Audience = new[] { "<OAuth client ID>" },
    HostedDomain = "customer-domain.com"
});
```

## Gmail routing rule (unchanged)
Admin console > Apps > Google Workspace > Gmail > Hosts: add the SMTP server. Compliance > Content compliance: outbound, Advanced content match on the marker text, action Modify message > Change route to that host. The server strips the marker and delivers onward without re-matching the rule.

## Structure
```
public/manifest.json      MV3 manifest, icons, options.html
src/background.ts         REST calls, mock store, Google ID token (launchWebAuthFlow)
src/options.ts            settings page
src/content/main.ts       tick loop, "Compose Secure" action
src/content/topbar.ts     top-bar button injection (+ floating fallback)
src/content/panel.ts      pill + panel (Shadow DOM) per compose window
src/content/dom.ts        recipients, marker add/remove
src/content/selectors.ts  ALL Gmail DOM selectors - fix here when Gmail changes
```

## Not verified against live Gmail (check first)
The project typechecks and builds. It has NOT been run against Gmail. Everything below depends on Gmail's undocumented DOM:
- Top-bar placement (`selectors.ts`: header `header[role="banner"]`, account button found by `aria-label` containing `@`). If it is not placed correctly it falls back to a floating button at top-right; use the anchor selector setting to fix.
- Recipient chips (`data-hovercard-id` / `email`) and the From-field exclusion.
- Compose window detection (`div[role="dialog"]` containing `div[g_editable="true"]`) and body editing; pop-out windows and inline replies are not handled.
- Opening Compose via synthetic clicks on `div[gh="cm"]`, with fallback to `#inbox?compose=new`.
- Whether Gmail keeps the marker `div` exactly as inserted when sending (the routing rule only needs the marker text).
- Live auth: `launchWebAuthFlow` with `response_type=id_token`, and the redirect URI registration.
- Marker is visible text in the sent mail until the server strips it; no custom header can be set from Gmail web.
