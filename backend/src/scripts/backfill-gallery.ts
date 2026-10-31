import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ClassesService } from '../classes/classes.service.js';

/** Rattrapage : génère miniatures et aperçus flous des photos de galerie envoyées avant leur introduction.
 * Après `pnpm build` : `node dist/scripts/backfill-gallery.js` (idempotent). */
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const result = await app.get(ClassesService).backfillGalleryMeta();
  console.log(`Photos traitées : ${result.processed}`);
  await app.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
