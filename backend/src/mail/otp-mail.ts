import type { OtpPurpose } from '@prisma/client';
import type { MailMessage } from './mail.service.js';
import { COPY_ICON_PNG_BASE64, HERO_JPG_BASE64 } from './assets.js';

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
  copyAlt: string;
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
      copyAlt: 'Copier le code',
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
      copyAlt: 'Copier le code',
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
      copyAlt: 'Copy the code',
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
      copyAlt: 'Copy the code',
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
      copyAlt: 'نسخ الرمز',
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
      copyAlt: 'نسخ الرمز',
    },
  },
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HERO_CID = 'muscleup-hero';
const COPY_CID = 'muscleup-copy';

/**
 * E-mail d'envoi d'un code à usage unique (valide 10 minutes), traduit dans la langue de l'app et
 * habillé comme l'app (en-tête « MUSCLE / UP » du splash, corps sombre, bouton violet de la connexion).
 * `landingUrl` : page de l'API qui ouvre l'app et copie le code ; absente si PUBLIC_API_URL n'est pas
 * configuré. Le bouton « Ouvrir l'application » n'existe que pour le mot de passe oublié (lien profond).
 */
export function buildOtpMail(params: {
  purpose: OtpPurpose;
  to: string;
  firstName: string;
  code: string;
  brand: string;
  lang?: string | null;
  landingUrl?: string;
}): MailMessage {
  const { purpose, to, firstName, code, brand, landingUrl } = params;
  const lang = toMailLang(params.lang);
  const c = COPY[lang][purpose];
  const rtl = lang === 'ar';
  const dir = rtl ? 'rtl' : 'ltr';
  const align = rtl ? 'right' : 'left';
  const arrow = rtl ? '←' : '→';
  const copyUrl = landingUrl ? `${landingUrl}&a=copy` : undefined;
  const showButton = !!landingUrl && purpose === 'PASSWORD_RESET';

  const copyIcon = copyUrl
    ? `<td width="44" align="center" valign="middle" style="padding:0 0 0 10px">
         <a href="${escapeHtml(copyUrl)}" title="${escapeHtml(c.copyAlt)}" style="display:block;width:40px;height:40px;line-height:40px;border-radius:12px;background:#2E2650;border:1px solid #3F3570;text-align:center">
           <img src="cid:${COPY_CID}" width="22" height="22" alt="${escapeHtml(c.copyAlt)}" style="display:inline-block;vertical-align:middle;border:0;width:22px;height:22px">
         </a>
       </td>`
    : '';

  const button = showButton
    ? `<tr><td align="center" style="padding:6px 28px 6px">
        <a href="${escapeHtml(landingUrl!)}" style="display:block;background-color:#7C3AED;background-image:linear-gradient(180deg,#8B5CF6,#6D28D9);color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;line-height:22px;padding:15px 24px;border-radius:14px;text-align:center">${c.button} ${arrow}</a>
      </td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><title>${escapeHtml(c.subject(brand))}</title></head>
<body style="margin:0;padding:0;background:#0B0817;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0B0817" style="background:#0B0817"><tr><td align="center" style="padding:20px 10px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0F0B1E" style="max-width:520px;background:#0F0B1E;border:1px solid #2E2650;border-radius:24px;overflow:hidden">
    <tr><td style="padding:0;line-height:0;font-size:0">
      <img src="cid:${HERO_CID}" width="520" alt="${escapeHtml(brand)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;background:#6D28D9">
    </td></tr>
    <tr><td dir="${dir}" style="padding:28px 28px 6px;text-align:${align}">
      <h1 style="margin:0 0 12px;font-size:23px;line-height:1.25;font-weight:800;color:#F5F2FF">${c.title}</h1>
      <p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#F5F2FF">${escapeHtml(c.hello(firstName))}</p>
      <p style="margin:0;font-size:15px;line-height:1.55;color:#A29BC2">${c.intro}</p>
    </td></tr>
    <tr><td align="center" style="padding:18px 28px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1A1431" style="background:#1A1431;border:1px solid #2E2650;border-radius:18px"><tr><td align="center" style="padding:16px 12px">
        <div style="font-size:11.5px;font-weight:700;letter-spacing:${rtl ? 0 : 1.6}px;text-transform:uppercase;color:#A78BFA;margin-bottom:10px">${c.codeLabel}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" dir="ltr"><tr>
          <td align="center" style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;line-height:44px;font-weight:800;letter-spacing:9px;padding-left:9px;color:#FFFFFF">${code}</td>
          ${copyIcon}
        </tr></table>
      </td></tr></table>
      <p style="margin:12px 0 0;font-size:12.5px;line-height:1.6;color:#A29BC2">${c.validity}<br>${c.copyHint}</p>
    </td></tr>
    <tr><td style="height:16px;font-size:0;line-height:0">&nbsp;</td></tr>
    ${button}
    <tr><td dir="${dir}" style="padding:20px 28px 4px;text-align:${align}">
      <p style="margin:0;font-size:12.5px;line-height:1.6;color:#A29BC2;border-top:1px solid #2E2650;padding-top:16px">${c.ignore}</p>
    </td></tr>
    <tr><td dir="${dir}" style="padding:10px 28px 26px;text-align:${align}">
      <p style="margin:0;font-size:11.5px;color:#6F6890">${escapeHtml(brand)} · ${c.footer}</p>
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
    ...(landingUrl ? ['', `${showButton ? c.button : c.copyAlt} : ${showButton ? landingUrl : `${landingUrl}&a=copy`}`] : []),
    '',
    c.ignore,
    '',
    `${brand} — ${c.footer}`,
  ].join('\n');

  return {
    to,
    subject: c.subject(brand),
    text,
    html,
    attachments: [
      { filename: 'hero.jpg', content: Buffer.from(HERO_JPG_BASE64, 'base64'), cid: HERO_CID, contentType: 'image/jpeg' },
      ...(copyUrl ? [{ filename: 'copy.png', content: Buffer.from(COPY_ICON_PNG_BASE64, 'base64'), cid: COPY_CID, contentType: 'image/png' }] : []),
    ],
  };
}
