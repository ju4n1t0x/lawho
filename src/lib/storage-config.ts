export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function validateStorageConfig(values: Record<string, string | undefined>): StorageConfig {
  const names = ['AWS_ENDPOINT_URL_S3', 'AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'STORAGE_BUCKET'];
  for (const name of names) {
    if (!values[name]?.trim()) throw new Error(`Falta configurar ${name}`);
  }
  let endpoint: URL;
  try { endpoint = new URL(values.AWS_ENDPOINT_URL_S3!); }
  catch { throw new Error('AWS_ENDPOINT_URL_S3 no es una URL válida'); }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/') {
    throw new Error('AWS_ENDPOINT_URL_S3 debe ser un origen HTTPS sin credenciales');
  }
  if (!/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(values.AWS_REGION!)) throw new Error('AWS_REGION no es válida');
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(values.STORAGE_BUCKET!) || values.STORAGE_BUCKET!.includes('..')) {
    throw new Error('STORAGE_BUCKET no es válido');
  }
  return {
    endpoint: endpoint.origin, region: values.AWS_REGION!,
    accessKeyId: values.AWS_ACCESS_KEY_ID!, secretAccessKey: values.AWS_SECRET_ACCESS_KEY!,
    bucket: values.STORAGE_BUCKET!,
  };
}
