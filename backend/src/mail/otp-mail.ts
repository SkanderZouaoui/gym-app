import type { OtpPurpose } from '@prisma/client';
import type { MailMessage } from './mail.service.js';

export type MailLang = 'fr' | 'en' | 'ar';
export const MAIL_LANGS: readonly MailLang[] = ['fr', 'en', 'ar'];
export const toMailLang = (lang?: string | null): MailLang => (MAIL_LANGS as readonly string[]).includes(lang ?? '') ? (lang as MailLang) : 'fr';

interface Copy {
  subject: (brand: string) => string;
  preheader: string;
  title: string;
  intro: string;
  codeLabel: string;
  validity: string;
  button: string;
  copyHint: string;
  ignore: string;
  hello: (name: string) => string;
  footer: string;
}

const COPY: Record<MailLang, Record<OtpPurpose, Copy>> = {
  fr: {
    PASSWORD_RESET: {
      subject: (b) => `${b} : votre code de réinitialisation`,
      preheader: 'Votre code à 6 chiffres pour réinitialiser votre mot de passe.',
      title: 'Réinitialisation du mot de passe',
      intro: 'Vous avez demandé à réinitialiser votre mot de passe. Saisissez ce code dans l\'application :',
      codeLabel: 'Votre code',
      validity: 'Valable 10 minutes, utilisable une seule fois.',
      button: 'Ouvrir l\'application',
      copyHint: 'Sur mobile, maintenez le code appuyé pour le copier.',
      ignore: 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé. Ne communiquez jamais ce code.',
      hello: (n) => `Bonjour ${n},`,
      footer: 'Cet e-mail est automatique, merci de ne pas y répondre.',
    },
    EMAIL_CHANGE: {
      subject: (b) => `${b} : confirmez votre nouvelle adresse e-mail`,
      preheader: 'Votre code à 6 chiffres pour confirmer la nouvelle adresse.',
      title: 'Confirmation de votre nouvelle adresse e-mail',
      intro: 'Vous avez demandé à utiliser cette adresse pour votre compte. Saisissez ce code dans l\'application :',
      codeLabel: 'Votre code',
      validity: 'Valable 10 minutes, utilisable une seule fois.',
      button: 'Ouvrir l\'application',
      copyHint: 'Sur mobile, maintenez le code appuyé pour le copier.',
      ignore: 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail : votre adresse reste inchangée. Ne communiquez jamais ce code.',
      hello: (n) => `Bonjour ${n},`,
      footer: 'Cet e-mail est automatique, merci de ne pas y répondre.',
    },
  },
  en: {
    PASSWORD_RESET: {
      subject: (b) => `${b}: your password reset code`,
      preheader: 'Your 6-digit code to reset your password.',
      title: 'Password reset',
      intro: 'You asked to reset your password. Enter this code in the app:',
      codeLabel: 'Your code',
      validity: 'Valid for 10 minutes, single use.',
      button: 'Open the app',
      copyHint: 'On mobile, press and hold the code to copy it.',
      ignore: 'If you did not make this request, ignore this email: your password stays unchanged. Never share this code.',
      hello: (n) => `Hello ${n},`,
      footer: 'This is an automated email, please do not reply.',
    },
    EMAIL_CHANGE: {
      subject: (b) => `${b}: confirm your new email address`,
      preheader: 'Your 6-digit code to confirm the new address.',
      title: 'Confirm your new email address',
      intro: 'You asked to use this address for your account. Enter this code in the app:',
      codeLabel: 'Your code',
      validity: 'Valid for 10 minutes, single use.',
      button: 'Open the app',
      copyHint: 'On mobile, press and hold the code to copy it.',
      ignore: 'If you did not make this request, ignore this email: your address stays unchanged. Never share this code.',
      hello: (n) => `Hello ${n},`,
      footer: 'This is an automated email, please do not reply.',
    },
  },
  ar: {
    PASSWORD_RESET: {
      subject: (b) => `${b}: رمز إعادة تعيين كلمة المرور`,
      preheader: 'رمزك المكوّن من 6 أرقام لإعادة تعيين كلمة المرور.',
      title: 'إعادة تعيين كلمة المرور',
      intro: 'لقد طلبت إعادة تعيين كلمة المرور. أدخل هذا الرمز في التطبيق:',
      codeLabel: 'رمزك',
      validity: 'صالح لمدة 10 دقائق ويُستخدم مرة واحدة.',
      button: 'فتح التطبيق',
      copyHint: 'على الهاتف، اضغط مطولًا على الرمز لنسخه.',
      ignore: 'إذا لم تكن أنت من قدّم هذا الطلب، تجاهل هذه الرسالة: كلمة المرور تبقى كما هي. لا تشارك هذا الرمز مع أحد.',
      hello: (n) => `مرحبًا ${n}،`,
      footer: 'هذه رسالة آلية، يرجى عدم الرد عليها.',
    },
    EMAIL_CHANGE: {
      subject: (b) => `${b}: تأكيد عنوان بريدك الإلكتروني الجديد`,
      preheader: 'رمزك المكوّن من 6 أرقام لتأكيد العنوان الجديد.',
      title: 'تأكيد عنوان بريدك الإلكتروني الجديد',
      intro: 'لقد طلبت استخدام هذا العنوان لحسابك. أدخل هذا الرمز في التطبيق:',
      codeLabel: 'رمزك',
      validity: 'صالح لمدة 10 دقائق ويُستخدم مرة واحدة.',
      button: 'فتح التطبيق',
      copyHint: 'على الهاتف، اضغط مطولًا على الرمز لنسخه.',
      ignore: 'إذا لم تكن أنت من قدّم هذا الطلب، تجاهل هذه الرسالة: عنوانك يبقى كما هو. لا تشارك هذا الرمز مع أحد.',
      hello: (n) => `مرحبًا ${n}،`,
      footer: 'هذه رسالة آلية، يرجى عدم الرد عليها.',
    },
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PRIMARY = '#7C3AED';
const PRIMARY_SOFT = '#EFE9FD';

/**
 * E-mail d'envoi d'un code à usage unique (valide 10 minutes), traduit dans la langue de l'app.
 * `openAppUrl` (mot de passe oublié) : lien https vers la page qui ouvre l'application et propose
 * de copier le code ; absent si PUBLIC_API_URL n'est pas configuré.
 */
export function buildOtpMail(params: {
  purpose: OtpPurpose;
  to: string;
  firstName: string;
  code: string;
  brand: string;
  lang?: string | null;
  openAppUrl?: string;
}): MailMessage {
  const { purpose, to, firstName, code, brand, openAppUrl } = params;
  const lang = toMailLang(params.lang);
  const c = COPY[lang][purpose];
  const rtl = lang === 'ar';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const spacedCode = code.split('').join(' ');

  const button = openAppUrl
    ? `<tr><td align="center" style="padding:4px 32px 8px">
        <a href="${escapeHtml(openAppUrl)}" style="display:inline-block;background:${PRIMARY};color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:12px">${c.button}</a>
      </td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(c.subject(brand))}</title></head>
<body style="margin:0;padding:0;background:#F4F2F8;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2F8;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(20,10,50,.08)">
    <tr><td align="center" style="background:${PRIMARY};padding:22px 24px">
      <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px">${escapeHtml(brand)}</span>
    </td></tr>
    <tr><td dir="${dir}" style="padding:32px 32px 8px;text-align:${align};color:#1B1530">
      <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:#1B1530">${c.title}</h1>
      <p style="margin:0 0 6px;font-size:15px;line-height:1.55">${escapeHtml(c.hello(firstName))}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#3D3556">${c.intro}</p>
    </td></tr>
    <tr><td align="center" style="padding:20px 32px 6px">
      <div style="background:${PRIMARY_SOFT};border:1px solid #D8C8FA;border-radius:16px;padding:18px 12px">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#572AA6;margin-bottom:8px">${c.codeLabel}</div>
        <div dir="ltr" style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:800;letter-spacing:6px;color:#1B1530;user-select:all;-webkit-user-select:all">${code}</div>
      </div>
      <p style="margin:10px 0 0;font-size:12.5px;color:#6B6485">${c.validity}<br>${c.copyHint}</p>
    </td></tr>
    <tr><td style="height:14px"></td></tr>
    ${button}
    <tr><td dir="${dir}" style="padding:20px 32px 4px;text-align:${align}">
      <p style="margin:0;font-size:13px;line-height:1.55;color:#6B6485;border-top:1px solid #ECE8F5;padding-top:16px">${c.ignore}</p>
    </td></tr>
    <tr><td dir="${dir}" style="padding:10px 32px 26px;text-align:${align}">
      <p style="margin:0;font-size:12px;color:#9A94AE">${escapeHtml(brand)} · ${c.footer}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    c.hello(firstName),
    '',
    c.intro,
    '',
    `${c.codeLabel} : ${code}`,
    c.validity,
    ...(openAppUrl ? ['', `${c.button} : ${openAppUrl}`] : []),
    '',
    c.ignore,
    '',
    `${brand} — ${c.footer}`,
  ].join('\n');

  return { to, subject: c.subject(brand), text, html };
}
