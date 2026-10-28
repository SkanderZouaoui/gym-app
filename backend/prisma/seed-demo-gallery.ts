import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

/** Photos de démo pour la galerie des fiches cours :
 *   npx tsx prisma/seed-demo-gallery.ts <dossier-d-images> [--replace]
 * Sans --replace, un type qui a déjà des photos est ignoré ; avec --replace, ses photos sont remplacées.
 * Les fichiers doivent s'appeler <slug>-<n>.jpg, où le slug est le début du nom du type de cours
 * (hiit, cycling, yoga, boxe). Les images sont envoyées dans le stockage S3 puis rattachées au type.
 */
async function main() {
  const dir = process.argv[2];
  const replace = process.argv.includes('--replace');
  if (!dir) throw new Error('Usage : tsx prisma/seed-demo-gallery.ts <dossier>');

  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });

  const types = await prisma.classType.findMany();
  const files = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
  let uploaded = 0;
  for (const type of types) {
    const slug = type.name.toLowerCase().split(' ')[0];
    const mine = files.filter((f) => f.startsWith(`${slug}-`));
    if (mine.length === 0 || (type.galleryKeys.length > 0 && !replace)) continue;
    for (const old of type.galleryKeys) {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: old })).catch(() => undefined);
    }
    const keys: string[] = [];
    for (const file of mine) {
      const key = `class-types/${type.id}/${randomUUID()}.jpeg`;
      await s3.send(
        new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key, Body: readFileSync(join(dir, file)), ContentType: 'image/jpeg' }),
      );
      keys.push(key);
      uploaded++;
    }
    await prisma.classType.update({ where: { id: type.id }, data: { galleryKeys: keys } });
  }
  console.log(`Galerie : ${uploaded} photos envoyées.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
