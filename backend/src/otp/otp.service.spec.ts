import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { OtpService, OTP_MAX_PER_WINDOW } from './otp.service.js';
import { MailService } from '../mail/mail.service.js';

describe('OtpService — envoi du code par e-mail', () => {
  const user = { email: 'ancienne@muscleup.dev', firstName: 'Sami' };
  let prisma: any;
  let mail: { send: ReturnType<typeof vi.fn> };
  let service: OtpService;
  let logged: string[];

  beforeEach(() => {
    prisma = {
      otpCode: { updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      user: { findUnique: vi.fn().mockResolvedValue(user) },
    };
    mail = { send: vi.fn().mockResolvedValue(true) };
    service = new OtpService(prisma, mail as unknown as MailService, new ConfigService({}));

    logged = [];
    for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((msg: unknown) => {
        logged.push(String(msg));
      });
    }
  });
  afterEach(() => vi.restoreAllMocks());

  const sentCode = () => /\b(\d{6})\b/.exec(mail.send.mock.calls[0][0].text)![1];

  it('envoie le code à l\'adresse du compte pour un mot de passe oublié', async () => {
    await service.generateAndStore('u1', 'PASSWORD_RESET');
    await Promise.resolve();

    expect(mail.send).toHaveBeenCalledOnce();
    const msg = mail.send.mock.calls[0][0];
    expect(msg.to).toBe('ancienne@muscleup.dev');
    expect(msg.subject).toContain('réinitialisation');
    expect(msg.text).toContain('Sami');
    expect(sentCode()).toMatch(/^\d{6}$/);
  });

  it('envoie le code à la NOUVELLE adresse pour un changement d\'e-mail', async () => {
    await service.generateAndStore('u1', 'EMAIL_CHANGE', 'nouvelle@muscleup.dev');
    expect(mail.send.mock.calls[0][0].to).toBe('nouvelle@muscleup.dev');
  });

  it('ne stocke que le hash du code et ne le logge jamais', async () => {
    await service.generateAndStore('u1', 'PASSWORD_RESET');
    await Promise.resolve();
    const code = sentCode();

    expect(prisma.otpCode.create.mock.calls[0][0].data.codeHash).not.toContain(code);
    expect(logged.join('\n')).not.toContain(code);
  });

  const codesCreatedAgo = (...minutes: number[]) => minutes.map((m) => ({ createdAt: new Date(Date.now() - m * 60_000) }));

  it('bloque la génération (429) au plafond, sans e-mail, avec le temps restant avant le prochain code', async () => {
    // 5 codes créés il y a 5, 20, 30, 40 et 50 min : le 5e (le plus ancien) libère un créneau dans 10 min.
    prisma.otpCode.findMany.mockResolvedValue(codesCreatedAgo(5, 20, 30, 40, 50));

    const err = await service.generateAndStore('u1', 'PASSWORD_RESET').catch((e) => e);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse()).toMatchObject({ code: 'OTP_RATE_LIMITED' });
    const retry = err.getResponse().details.retryAfterSeconds;
    expect(retry).toBeGreaterThan(9 * 60);
    expect(retry).toBeLessThanOrEqual(10 * 60);
    expect(prisma.otpCode.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('autorise encore un code juste sous le plafond', async () => {
    prisma.otpCode.findMany.mockResolvedValue(codesCreatedAgo(5, 20, 30, 40));
    await service.generateAndStore('u1', 'PASSWORD_RESET');
    expect(prisma.otpCode.create).toHaveBeenCalledOnce();
  });

  it('ne lève pas si l\'envoi échoue (ne révèle rien à l\'appelant)', async () => {
    mail.send.mockResolvedValue(false);
    await expect(service.generateAndStore('u1', 'PASSWORD_RESET')).resolves.toBeUndefined();
  });
});

describe('MailService', () => {
  beforeEach(() => vi.stubEnv('SMTP_HOST', ''));
  afterEach(() => vi.unstubAllEnvs());

  it('sans SMTP_HOST : désactivé, send() renvoie false sans lever', async () => {
    const mail = new MailService(new ConfigService({}));
    expect(mail.enabled).toBe(false);
    await expect(mail.send({ to: 'a@b.co', subject: 's', text: 't' })).resolves.toBe(false);
  });

  it('avec SMTP_HOST : activé', () => {
    const mail = new MailService(new ConfigService({ SMTP_HOST: 'localhost', SMTP_PORT: '1025' }));
    expect(mail.enabled).toBe(true);
  });
});
