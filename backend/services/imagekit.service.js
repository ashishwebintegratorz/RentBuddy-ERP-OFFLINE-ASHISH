import { getImageKitInstance, isImageKitConfigured } from '../config/imagekit.config.js';

class ImageKitService {
  /**
   * Check if ImageKit credentials are validly set
   */
  isConfigured() {
    return isImageKitConfigured();
  }

  /**
   * Generates client authentication parameters for direct SDK uploads (Flutter Rider App, Web Admin)
   * Returns: { token, expire, signature }
   */
  getAuthenticationParameters() {
    const ik = getImageKitInstance();
    if (!ik) {
      throw new Error('ImageKit is not configured. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in .env');
    }
    return ik.getAuthenticationParameters();
  }

  /**
   * Uploads a file buffer directly to ImageKit CDN
   */
  async uploadBuffer({ fileBuffer, fileName, folder = 'rentbuddy_general', tags = [], customMetadata = {} }) {
    const ik = getImageKitInstance();
    if (!ik) {
      throw new Error('ImageKit credentials are not configured in .env');
    }

    const response = await ik.upload({
      file: fileBuffer,
      fileName,
      folder: `rentbuddy/${folder}`,
      tags: ['rentbuddy', ...tags],
      customMetadata,
      useUniqueFileName: true
    });

    return {
      fileId: response.fileId,
      name: response.name,
      url: response.url,
      thumbnailUrl: response.thumbnailUrl,
      size: response.size,
      filePath: response.filePath,
      fileType: response.fileType
    };
  }

  /**
   * Upload driver KYC documents into organized folders
   * folder: rentbuddy/drivers/kyc/{driverId}
   */
  async uploadDriverKYC(driverId, docType, fileBuffer, originalName) {
    const ext = originalName.split('.').pop() || 'jpg';
    const fileName = `driver_${driverId}_${docType}_${Date.now()}.${ext}`;
    
    return await this.uploadBuffer({
      fileBuffer,
      fileName,
      folder: `drivers/kyc/${driverId}`,
      tags: ['driver_kyc', docType, driverId],
      customMetadata: { driverId, docType }
    });
  }

  /**
   * Upload inventory asset photo
   */
  async uploadAssetPhoto(assetId, fileBuffer, originalName) {
    const ext = originalName.split('.').pop() || 'jpg';
    const fileName = `asset_${assetId}_${Date.now()}.${ext}`;

    return await this.uploadBuffer({
      fileBuffer,
      fileName,
      folder: `inventory/assets`,
      tags: ['asset_image', assetId],
      customMetadata: { assetId }
    });
  }

  /**
   * Delete file by ImageKit fileId
   */
  async deleteFile(fileId) {
    const ik = getImageKitInstance();
    if (!ik) return;
    return await ik.deleteFile(fileId);
  }

  /**
   * Generate real-time optimized thumbnail / responsive URL
   */
  getOptimizedUrl(filePath, { width, height, quality = 80, format = 'webp' } = {}) {
    const ik = getImageKitInstance();
    if (!ik) return filePath;

    const transformation = [];
    if (width) transformation.push({ width: String(width) });
    if (height) transformation.push({ height: String(height) });
    if (quality) transformation.push({ quality: String(quality) });
    if (format) transformation.push({ format });

    return ik.url({
      path: filePath,
      transformation
    });
  }
}

export default new ImageKitService();
