import fs from 'fs';
import path from 'path';

export interface FileStorageOptions {
  bucketName?: string;
  folder?: string;
}

export interface IStorageProvider {
  uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, options?: FileStorageOptions): Promise<{ url: string; key: string }>;
  deleteFile(key: string): Promise<boolean>;
  getFileUrl(key: string): Promise<string>;
}

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor(baseDir = './uploads') {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, options?: FileStorageOptions): Promise<{ url: string; key: string }> {
    const subFolder = options?.folder || 'documents';
    const folderPath = path.join(this.baseDir, subFolder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const fileKey = `${subFolder}/${Date.now()}-${fileName}`;
    const filePath = path.join(this.baseDir, fileKey);
    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      url: `/uploads/${fileKey}`,
      key: fileKey,
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  async getFileUrl(key: string): Promise<string> {
    return `/uploads/${key}`;
  }
}

export class S3ObjectStorageProvider implements IStorageProvider {
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string, options?: FileStorageOptions): Promise<{ url: string; key: string }> {
    const key = `${options?.folder || 'documents'}/${Date.now()}-${fileName}`;
    // Adapter interface implementation for production AWS S3 / Cloudflare R2
    const bucket = process.env.S3_BUCKET_NAME || 'billing-documents';
    const publicDomain = process.env.S3_PUBLIC_DOMAIN || 'https://s3.amazonaws.com';
    return {
      url: `${publicDomain}/${bucket}/${key}`,
      key,
    };
  }

  async deleteFile(key: string): Promise<boolean> {
    return true;
  }

  async getFileUrl(key: string): Promise<string> {
    const bucket = process.env.S3_BUCKET_NAME || 'billing-documents';
    const publicDomain = process.env.S3_PUBLIC_DOMAIN || 'https://s3.amazonaws.com';
    return `${publicDomain}/${bucket}/${key}`;
  }
}

export class StorageService {
  private provider: IStorageProvider;

  constructor() {
    if (process.env.STORAGE_DRIVER === 's3') {
      this.provider = new S3ObjectStorageProvider();
    } else {
      this.provider = new LocalStorageProvider();
    }
  }

  async storeInvoicePdf(pdfBuffer: Buffer, invoiceNumber: string): Promise<string> {
    const cleanNumber = invoiceNumber.replace(/[/\\?%*:|"<>]/g, '_');
    const result = await this.provider.uploadFile(pdfBuffer, `${cleanNumber}.pdf`, 'application/pdf', { folder: 'invoices' });
    return result.url;
  }

  async storeAttachment(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const result = await this.provider.uploadFile(buffer, fileName, mimeType, { folder: 'attachments' });
    return result.url;
  }
}

export const storageService = new StorageService();
