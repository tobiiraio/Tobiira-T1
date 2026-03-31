export interface UploadResult {
  key: string;     // storage path/key
  url: string;     // public or pre-signed URL
}

export interface StorageProvider {
  /**
   * Upload a buffer to storage and return the key and a pre-signed URL.
   * @param key    Storage path, e.g. 'receipts/org-id/payment-id.pdf'
   * @param buffer PDF or file buffer
   * @param contentType MIME type, e.g. 'application/pdf'
   * @param expiresInSeconds How long the pre-signed URL is valid (default 3600)
   */
  upload(
    key: string,
    buffer: Buffer,
    contentType: string,
    expiresInSeconds?: number,
  ): Promise<UploadResult>;

  /**
   * Generate a pre-signed URL for an existing object.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
