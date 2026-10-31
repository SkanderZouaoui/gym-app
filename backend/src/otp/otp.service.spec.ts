import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'node:crypto';
import { OtpService, OTP_MAX_ATTEMPTS } from './otp.service.js';
import { buildOtpMail } from '../mail/otp-mail.js';
import { OpenAppController } from '../auth/open-app.controller.js';
import { MailService } from '../mail/mail.service.js';

describe('OtpService — envoi du code par e-mail', () => {
  const user = { email: 'ancienne@muscleup.dev', firstName: 'Sami' };
  let prisma: any;
  let mail: { send: ReturnType<typeof vi.fn> };
  let service: OtpService;
  let logged: string[];

  beforeEach(() => {
    prisma = {
      otpCode: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
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

describe('OtpService.verify — plafond d\'essais', () => {
  const hash = (c: string) => createHash('sha256').update(c).digest('hex');
  const otp = { id: 'o1', expiresAt: new Date(Date.now() + 60_000), codeHash: hash('123456') };
  let prisma: any;
  let service: OtpService;

  beforeEach(() => {
    prisma = { otpCode: { findFirst: vi.fn().mockResolvedValue(otp), updateMany: vi.fn().mockResolvedValue({ count: 1 }) } };
    service = new OtpService(prisma, {} as MailService, new ConfigService({}));
  });

  it('accepte le bon code et compte un essai', async () => {
    await expect(service.verify('u1', 'PASSWORD_RESET', '123456')).resolves.toBe(otp);
    expect(prisma.otpCode.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'o1', attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
  });

  it('refuse un mauvais code (401 OTP_INVALID)', async () => {
    await expect(service.verify('u1', 'PASSWORD_RESET', '000000')).rejects.toMatchObject({ status: 401 });
  });

  it('verrouille (429 OTP_TOO_MANY_ATTEMPTS) quand les essais sont épuisés, même avec le bon code', async () => {
    prisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
    const err = await service.verify('u1', 'PASSWORD_RESET', '123456').catch((e) => e);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse()).toMatchObject({ code: 'OTP_TOO_MANY_ATTEMPTS' });
  });
});

describe('buildOtpMail', () => {
  const base = { purpose: 'PASSWORD_RESET' as const, to: 'a@b.co', firstName: 'Sami', code: '123456', brand: 'MuscleUP' };

  it('contient le code, le lien et le texte brut', () => {
    const m = buildOtpMail({ ...base, openAppUrl: 'https://api.x.com/v1/auth/open-app#c=123456' });
    expect(m.html).toContain('123456');
    expect(m.html).toContain('href="https://api.x.com/v1/auth/open-app#c=123456"');
    expect(m.text).toContain('123456');
    expect(m.subject).toContain('MuscleUP');
  });

  it('sans lien configuré : pas de bouton', () => {
    expect(buildOtpMail(base).html).not.toContain('<a href');
  });

  it('traduit en anglais et en arabe (RTL), repli sur le français', () => {
    expect(buildOtpMail({ ...base, lang: 'en' }).subject).toContain('password reset code');
    const ar = buildOtpMail({ ...base, lang: 'ar' });
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.subject).toContain('رمز');
    expect(buildOtpMail({ ...base, lang: 'xx' }).subject).toContain('réinitialisation');
  });

  it('échappe le prénom et la marque (pas d\'injection HTML)', () => {
    const m = buildOtpMail({ ...base, firstName: '<script>x</script>', brand: 'A&B' });
    expect(m.html).not.toContain('<script>x</script>');
    expect(m.html).toContain('A&amp;B');
  });
});

describe('OpenAppController — CSP', () => {
  it('le hash du CSP correspond au script inline de la page', () => {
    const c = new OpenAppController(new ConfigService({}));
    const html = (c as any).html as string;
    const script = html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>'));
    const hash = createHash('sha256').update(script).digest('base64');
    expect((c as any).csp).toContain(`'sha256-${hash}'`);
    expect(script).toContain('muscleup://forgot-password');
  });
});
