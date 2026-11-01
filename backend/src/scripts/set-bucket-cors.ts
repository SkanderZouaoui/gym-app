import { PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Autorise le back-office web (navigateur) à envoyer et lire des photos directement sur le stockage via les URLs
 * présignées : sans règle CORS sur le bucket, le navigateur bloque l'envoi. Les applications mobiles ne sont pas concernées.
 * Après `pnpm build` : `node dist/scripts/set-bucket-cors.js` (origines : CORS_ORIGINS, séparées par des virgules).
 */
async function main() {
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean);
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
  });
  await client.send(
    new PutBucketCorsCommand({
      Bucket: process.env.S3_BUCKET!,
      CORSConfiguration: {
        CORSRules: [{ AllowedOrigins: origins, AllowedMethods: ['GET', 'PUT', 'HEAD'], AllowedHeaders: ['*'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 }],
      },
    }),
  );
  console.log(`CORS du bucket ${process.env.S3_BUCKET} : ${origins.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
