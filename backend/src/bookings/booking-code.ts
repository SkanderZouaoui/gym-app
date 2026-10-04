import { randomInt } from 'node:crypto';

// Alphabet sans caractères ambigus (0/O, 1/I/L) pour une saisie manuelle fiable.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateBookingCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
