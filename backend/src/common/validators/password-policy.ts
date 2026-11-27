import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Règle de mot de passe choisi par l'utilisateur — identique à celle affichée dans l'app mobile et le back-office :
 * 8 caractères minimum, au moins une majuscule, un chiffre et un symbole.
 */
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).+$/;

/** Code d'erreur renvoyé au client (l'app le traduit). */
export const WEAK_PASSWORD = 'WEAK_PASSWORD';

export function isPasswordCompliant(password: string): boolean {
  return password.length >= 8 && PASSWORD_POLICY_REGEX.test(password);
}

/** À poser sur tout champ où l'utilisateur CHOISIT son mot de passe (inscription, réinitialisation, changement). */
export function IsCompliantPassword() {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: WEAK_PASSWORD }),
    // bcrypt ignore tout au-delà de 72 octets : on borne pour éviter une fausse impression de sécurité.
    MaxLength(72, { message: WEAK_PASSWORD }),
    Matches(PASSWORD_POLICY_REGEX, { message: WEAK_PASSWORD }),
  );
}
