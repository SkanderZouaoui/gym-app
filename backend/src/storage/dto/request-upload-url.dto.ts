import { IsIn, IsInt, Max, Min } from 'class-validator';
import { MAX_UPLOAD_BYTES } from '../storage.service.js';

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class RequestUploadUrlDto {
  @IsIn(ALLOWED_CONTENT_TYPES)
  contentType!: (typeof ALLOWED_CONTENT_TYPES)[number];

  /** Taille exacte du fichier en octets (max 10 Mo). */
  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  sizeBytes!: number;
}
