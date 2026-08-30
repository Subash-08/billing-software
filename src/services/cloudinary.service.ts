import crypto from 'crypto';
import { env } from '@/config/env';
import { BusinessRuleError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export interface CloudinarySignedParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  isMock: boolean;
}

export class CloudinaryService {
  /**
   * Generates a signed upload signature for direct browser -> Cloudinary uploads.
   * Isolates CLOUDINARY_API_SECRET server-side.
   */
  generateUploadSignature(folder = 'niramaalai_business_assets'): CloudinarySignedParams {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'niramaalai_dev';
    const apiKey = process.env.CLOUDINARY_API_KEY || 'dev_api_key';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || 'dev_api_secret';
    const timestamp = Math.round(Date.now() / 1000);

    // Production Rigor check
    if (env.NODE_ENV === 'production') {
      if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new BusinessRuleError('Cloudinary storage service is unconfigured in production.');
      }
    }

    const isMock = env.NODE_ENV === 'development' && (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET);

    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    logger.info('Generated Cloudinary signed upload token server-side', { folder, timestamp, isMock });

    return {
      timestamp,
      signature,
      apiKey,
      cloudName,
      folder,
      isMock,
    };
  }
}

export const cloudinaryService = new CloudinaryService();
