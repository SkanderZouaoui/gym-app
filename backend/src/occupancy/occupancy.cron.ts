import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OccupancyService } from './occupancy.service.js';

@Injectable()
export class OccupancyCron {
  private readonly logger = new Logger(OccupancyCron.name);

  constructor(private readonly occupancy: OccupancyService) {}

  /** Historique horaire de l'estimation (futur graphique de fréquentation). */
  @Cron(CronExpression.EVERY_HOUR)
  async snapshot() {
    try {
      await this.occupancy.snapshot();
    } catch (err) {
      this.logger.warn(`Photo d'occupation non enregistrée : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Purge des signaux de présence de plus de 7 jours. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purge() {
    const removed = await this.occupancy.purgeStaleSignals();
    if (removed > 0) this.logger.log(`Présence : ${removed} signal(aux) ancien(s) supprimé(s)`);
  }
}
