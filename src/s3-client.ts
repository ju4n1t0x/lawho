import { S3Client } from '@aws-sdk/client-s3';
import {
  AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, STORAGE_BUCKET,
} from 'astro:env/server';
import { validateStorageConfig } from './lib/storage-config';

let storage: { client: S3Client; bucket: string } | undefined;

/** Import-safe: configuration and the client are created only when storage is used. */
export function getStorage() {
  if (!storage) {
    const config = validateStorageConfig({
      AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, STORAGE_BUCKET,
    });
    storage = {
      bucket: config.bucket,
      client: new S3Client({
        endpoint: config.endpoint, region: config.region, forcePathStyle: true,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
        requestChecksumCalculation: 'WHEN_REQUIRED',
        retryMode: 'standard', maxAttempts: 3,
      }),
    };
  }
  return storage;
}
