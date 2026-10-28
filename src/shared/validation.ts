/** International mobile format: +<country><number>, 8-15 digits total. Spaces, dashes, dots, parentheses are stripped. */
export function normalizeMobile(raw: string): string | null {
  const s = (raw || '').replace(/[\s\-().]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}
