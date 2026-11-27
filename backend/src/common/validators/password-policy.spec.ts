import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { IsCompliantPassword, isPasswordCompliant, WEAK_PASSWORD } from './password-policy.js';

class Dto {
  @IsCompliantPassword()
  password!: string;
}

const check = async (password: string) => {
  const dto = new Dto();
  dto.password = password;
  return validate(dto);
};

describe('politique de mot de passe', () => {
  it.each(['Abcdef1!', 'Muscle-Up2026', 'Zz9$zzzz'])('accepte %s', async (p) => {
    expect(isPasswordCompliant(p)).toBe(true);
    expect(await check(p)).toHaveLength(0);
  });

  it.each([
    ['trop court', 'Ab1!'],
    ['sans majuscule', 'abcdef1!'],
    ['sans chiffre', 'Abcdefg!'],
    ['sans symbole', 'Abcdefg1'],
    ['trop long (> 72)', 'Aa1!' + 'x'.repeat(70)],
  ])('refuse un mot de passe %s', async (_label, p) => {
    expect(isPasswordCompliant(p) && p.length <= 72).toBe(false);
    const errors = await check(p);
    expect(errors).toHaveLength(1);
    expect(Object.values(errors[0].constraints ?? {})).toContain(WEAK_PASSWORD);
  });
});
