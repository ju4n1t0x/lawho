import { describe, expect, it } from 'vitest';
import { validateStorageConfig } from './storage-config';

const valid = {
  AWS_ENDPOINT_URL_S3: 'https://branch.storage.example.test', AWS_REGION: 'us-east-2',
  AWS_ACCESS_KEY_ID: 'test-access-key', AWS_SECRET_ACCESS_KEY: 'test-secret', STORAGE_BUCKET: 'assets',
};

describe('storage configuration', () => {
  it('maps only explicit server configuration', () => {
    expect(validateStorageConfig(valid)).toEqual({ endpoint: valid.AWS_ENDPOINT_URL_S3,
      region: 'us-east-2', accessKeyId: 'test-access-key', secretAccessKey: 'test-secret', bucket: 'assets' });
  });
  it('requires every field without exposing secret values', () => {
    for (const name of Object.keys(valid)) {
      expect(() => validateStorageConfig({ ...valid, [name]: '' })).toThrow(name);
    }
  });
  it('rejects insecure endpoints, credentials in URLs and malformed bucket names', () => {
    for (const endpoint of ['http://example.test', 'https://user:secret@example.test', 'https://example.test/a', 'https://example.test/?secret=x']) {
      expect(() => validateStorageConfig({ ...valid, AWS_ENDPOINT_URL_S3: endpoint })).toThrow();
    }
    expect(() => validateStorageConfig({ ...valid, STORAGE_BUCKET: '../private' })).toThrow();
  });
});
