import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Images intégrées au corps HTML via `<img src="cid:…">`. */
  attachments?: { filename: string; content: Buffer; cid: string; contentType: string }[];
}

/**
 * Envoi d'e-mails transactionnels via SMTP (Brevo, Resend, SES, OVH, Mailpit en dev…).
 * Configuré par SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / MAIL_FROM.
 * Sans SMTP_HOST, rien n'est envoyé : l'échec est loggé (jamais le contenu du message).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('MAIL_FROM') ?? 'MuscleUP <no-reply@muscleup.local>';

    if (!host) {
      this.transporter = null;
      this.logger.warn('SMTP_HOST non défini : aucun e-mail ne sera envoyé (reset de mot de passe inclus).');
      return;
    }

    const port = Number(config.get('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.transporter = createTransport({
      host,
      port,
      // true = TLS implicite (port 465) ; sinon STARTTLS négocié par le serveur.
      secure: config.get('SMTP_SECURE') === 'true' || port === 465,
      auth: user ? { user, pass } : undefined,
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  /** Envoie un e-mail ; ne lève jamais (les erreurs sont loggées sans le contenu). */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error(`E-mail "${message.subject}" non envoyé : SMTP non configuré.`);
      return false;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...message });
      return true;
    } catch (err) {
      this.logger.error(`Échec d'envoi de l'e-mail "${message.subject}" : ${(err as Error).message}`);
      return false;
    }
  }
}
