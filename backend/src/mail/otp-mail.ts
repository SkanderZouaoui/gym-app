import type { OtpPurpose } from '@prisma/client';
import type { MailMessage } from './mail.service.js';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Contenu de l'e-mail envoyant un code à usage unique (valide 10 minutes). */
export function buildOtpMail(params: {
  purpose: OtpPurpose;
  to: string;
  firstName: string;
  code: string;
  brand: string;
}): MailMessage {
  const { purpose, to, firstName, code, brand } = params;
  const isReset = purpose === 'PASSWORD_RESET';
  const subject = isReset ? `${brand} : code de réinitialisation du mot de passe` : `${brand} : confirmez votre nouvelle adresse e-mail`;
  const intro = isReset
    ? 'Vous avez demandé la réinitialisation de votre mot de passe.'
    : 'Vous avez demandé à changer l\'adresse e-mail de votre compte.';
  const outro = isReset
    ? 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.'
    : 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail : votre adresse reste inchangée.';

  const text = `Bonjour ${firstName},\n\n${intro}\nVotre code : ${code}\nIl est valable 10 minutes.\n\n${outro}\n\n${brand}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#111">
<p>Bonjour ${escapeHtml(firstName)},</p>
<p>${intro}</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;margin:24px 0">${code}</p>
<p>Ce code est valable <strong>10 minutes</strong>.</p>
<p style="color:#555;font-size:13px">${outro}</p>
<p style="color:#555;font-size:13px">${escapeHtml(brand)}</p>
</div>`;
  return { to, subject, text, html };
}
