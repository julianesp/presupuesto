/**
 * Configuración de autenticación
 * Emails autorizados para acceder al sistema
 */

export const AUTHORIZED_EMAILS = [
  'marthacer7@gmail.com',
  'julii1295@gmail.com',
] as const;

export type AuthorizedEmail = typeof AUTHORIZED_EMAILS[number];

/**
 * Verifica si un email está autorizado
 */
export function isEmailAuthorized(email: string | null | undefined): boolean {
  if (!email) return false;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase() as AuthorizedEmail);
}
