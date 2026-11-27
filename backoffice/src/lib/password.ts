/** Règle de mot de passe choisi (identique au serveur et à l'app mobile) : 8 caractères, une majuscule, un chiffre, un symbole. */
export function isCompliantPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)
}

export const PASSWORD_HINT = '8 caractères minimum, avec une majuscule, un chiffre et un symbole'
