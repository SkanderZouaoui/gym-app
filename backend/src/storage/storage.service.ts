import { Injectable } from '@nestjs/common';
import { S3Client, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const PRESIGN_EXPIRY_SECONDS = 300;

/** Stockage objet S3-compatible (Garage — voir /minio). Les photos de
 * progression sont privées par défaut : jamais d'URL publique permanente,
 * seulement des URLs présignées à durée limitée (upload et lecture).
 *
 * Deux clients S3 pointent vers le même Garage avec des hôtes différents :
 * `client` (S3_ENDPOINT, ex. localhost) pour les appels serveur-à-serveur
 * (delete), et `presignClient` (S3_PUBLIC_ENDPOINT, ex. IP LAN) pour générer
 * des URLs présignées que le téléphone doit pouvoir atteindre directement —
 * `localhost` côté backend ne résout jamais vers Garage depuis l'appareil. */
@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET!;
    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    };
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
    const region = process.env.S3_REGION;

    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region,
      forcePathStyle,
      credentials,
    });
    this.presignClient = new S3Client({
      endpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT,
      region,
      forcePathStyle,
      credentials,
      // Le SDK v3 ajoute par défaut un checksum CRC32 calculé sur un corps
      // vide aux URLs présignées (il ne connaît pas le contenu à l'avance) —
      // Garage rejette ensuite l'upload réel avec "InvalidDigest" dès que le
      // corps n'est pas vide. Désactivé ici puisque la requête présignée ne
      // porte aucun contenu au moment de la signature.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  /** Génère une clé d'objet unique sous un préfixe donné (ex. "body-metrics/<userId>/..."). */
  buildKey(prefix: string, contentType: string): string {
    const ext = contentType.split('/')[1] ?? 'bin';
    return `${prefix}/${randomUUID()}.${ext}`;
  }

  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.presignClient, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
  }

  async getReadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.presignClient, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
