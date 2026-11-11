import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPrefsDto {
  /** Alerte 7 jours avant la fin de l'abonnement. */
  @IsOptional()
  @IsBoolean()
  expiryAlert?: boolean;

  /** Rappel 1 heure avant un cours réservé. */
  @IsOptional()
  @IsBoolean()
  classReminder?: boolean;
}
