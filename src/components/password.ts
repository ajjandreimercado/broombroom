// Shared by the site and the API server: 8+ characters with at least one letter and one number.
export const PASSWORD_RULE = 'The password must be at least 8 characters, with letters and numbers.';
export const goodPassword = (p: unknown): p is string =>
  typeof p === 'string' && p.length >= 8 && p.length <= 200 && /[A-Za-z]/.test(p) && /\d/.test(p);
