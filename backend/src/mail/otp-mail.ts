import type { OtpPurpose } from '@prisma/client';
import type { MailMessage } from './mail.service.js';
import { HERO_JPG_BASE64 } from './assets.js';

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

const HERO_CID = 'muscleup-hero';

/**
 * Palettes de l'app (useAuthPalette) : clair par défaut (styles en ligne), sombre via
 * `prefers-color-scheme` (Apple Mail, iOS Mail, Outlook…). Gmail ignore ces règles et applique sa
 * propre inversion à un e-mail clair, ce qui donne bien un rendu sombre en mode sombre.
 */
const DARK_RULES: [string, string][] = [
  ['.bg-o', 'background:#0B0817'],
  ['.card', 'background:#0F0B1E;border-color:#2E2650'],
  ['.t-h', 'color:#F5F2FF'],
  ['.t-p', 'color:#F5F2FF'],
  ['.t-m', 'color:#A29BC2'],
  ['.codebox', 'background:#1A1431;border-color:#2E2650'],
  ['.code', 'color:#FFFFFF'],
  ['.lbl', 'color:#A78BFA'],
  ['.sep', 'border-color:#2E2650'],
  ['.t-f', 'color:#6F6890'],
];
const darkCss = DARK_RULES.map(([sel, decl]) => `${sel}{${decl.split(';').map((d) => `${d} !important`).join(';')}}`).join('');
const STYLE = `<style>:root{color-scheme:light dark;supported-color-schemes:light dark}@media (prefers-color-scheme:dark){${darkCss}}${DARK_RULES.map(([sel, decl]) => `[data-ogsc] ${sel}{${decl.split(';').map((d) => `${d} !important`).join(';')}}`).join('')}</style>`;

/**
 * E-mail d'envoi d'un code à usage unique (valide 10 minutes), traduit dans la langue de l'app et
 * habillé comme l'app (en-tête « MUSCLE / UP » du splash, bouton violet de la connexion), en clair
 * ou en sombre selon le réglage du téléphone.
 * `landingUrl` : page de l'API qui ouvre l'app (mot de passe oublié uniquement) ; absente si
 * PUBLIC_API_URL n'est pas configuré. Un e-mail ne peut pas copier dans le presse-papiers : le code
 * est donc affiché en gros, sélectionnable d'un appui long.
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
  const showButton = !!landingUrl && purpose === 'PASSWORD_RESET';

  // Bouton « bulletproof » : cellule colorée + lien ; texte blanc forcé (certains clients recolorent les liens).
  const button = showButton
    ? `<tr><td align="center" style="padding:6px 28px 6px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="center" bgcolor="#7C3AED" style="border-radius:14px;background-color:#7C3AED;background-image:linear-gradient(180deg,#8B5CF6,#6D28D9)">
            <a href="${escapeHtml(landingUrl!)}" style="display:block;padding:15px 24px;color:#ffffff !important;text-decoration:none !important;font-weight:700;font-size:16px;line-height:22px;text-align:center"><font color="#ffffff"><span style="color:#ffffff !important">${c.button} ${arrow}</span></font></a>
          </td>
        </tr></table>
      </td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${STYLE}<title>${escapeHtml(c.subject(brand))}</title></head>
<body style="margin:0;padding:0;background:#F4F2F8;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F4F2F8" class="bg-o" style="background:#F4F2F8"><tr><td align="center" style="padding:20px 10px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" class="card" style="max-width:520px;background:#FFFFFF;border:1px solid #E3DEF0;border-radius:24px;overflow:hidden">
    <tr><td style="padding:0;line-height:0;font-size:0">
      <img src="cid:${HERO_CID}" width="520" alt="${escapeHtml(brand)}" style="display:block;width:100%;max-width:520px;height:auto;border:0;background:#6D28D9">
    </td></tr>
    <tr><td dir="${dir}" style="padding:28px 28px 6px;text-align:${align}">
      <h1 class="t-h" style="margin:0 0 12px;font-size:23px;line-height:1.25;font-weight:800;color:#1B1530">${c.title}</h1>
      <p class="t-p" style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#1B1530">${escapeHtml(c.hello(firstName))}</p>
      <p class="t-m" style="margin:0;font-size:15px;line-height:1.55;color:#6B6485">${c.intro}</p>
    </td></tr>
    <tr><td align="center" style="padding:18px 28px 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F3FB" class="codebox" style="background:#F5F3FB;border:1px solid #E3DEF0;border-radius:18px"><tr><td align="center" style="padding:16px 12px">
        <div class="lbl" style="font-size:11.5px;font-weight:700;letter-spacing:${rtl ? 0 : 1.6}px;text-transform:uppercase;color:#6D28D9;margin-bottom:10px">${c.codeLabel}</div>
        <div class="code" dir="ltr" style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;line-height:44px;font-weight:800;letter-spacing:9px;padding-left:9px;color:#1B1530;-webkit-user-select:all;user-select:all">${code}</div>
      </td></tr></table>
      <p class="t-m" style="margin:12px 0 0;font-size:12.5px;line-height:1.6;color:#6B6485">${c.validity}<br>${c.copyHint}</p>
    </td></tr>
    <tr><td style="height:16px;font-size:0;line-height:0">&nbsp;</td></tr>
    ${button}
    <tr><td dir="${dir}" style="padding:20px 28px 4px;text-align:${align}">
      <p class="t-m sep" style="margin:0;font-size:12.5px;line-height:1.6;color:#6B6485;border-top:1px solid #E3DEF0;padding-top:16px">${c.ignore}</p>
    </td></tr>
    <tr><td dir="${dir}" style="padding:10px 28px 26px;text-align:${align}">
      <p class="t-f" style="margin:0;font-size:11.5px;color:#9A94AE">${escapeHtml(brand)} · ${c.footer}</p>
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
    ...(showButton ? ['', `${c.button} : ${landingUrl}`] : []),
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
    attachments: [{ filename: 'hero.jpg', content: Buffer.from(HERO_JPG_BASE64, 'base64'), cid: HERO_CID, contentType: 'image/jpeg' }],
  };
}
