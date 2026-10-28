export interface PhoneItem {
  email: string;
  mobile: string | null;
}

export type Req =
  | { type: 'lookup'; emails: string[] }
  | { type: 'save'; items: { email: string; mobile: string }[] };

export type Res = { ok: true; data: unknown } | { ok: false; error: string };
