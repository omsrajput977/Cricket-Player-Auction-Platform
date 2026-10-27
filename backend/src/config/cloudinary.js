import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('☁️ Cloudinary SDK configured successfully.');
} else {
  console.warn('ℹ️ Cloudinary credentials not fully set in .env. Falling back to local Base64/DataURI storage for photos.');
}

/**
 * Upload an image buffer to Cloudinary (or fallback to Data URI)
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Upload options (folder, etc.)
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadToCloudinary = async (buffer, options = {}) => {
  if (!buffer) {
    return { url: '', publicId: '' };
  }

  // If Cloudinary credentials are provided, upload directly via stream
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'cricauction/players',
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'webp' },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary stream upload error:', error);
            return reject(new Error('Cloudinary upload failed: ' + error.message));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  // Fallback: Encode as Data URI so local dev works without mandatory Cloudinary signup
  const mimeType = options.mimetype || 'image/jpeg';
  const base64Data = buffer.toString('base64');
  const dataUri = `data:${mimeType};base64,${base64Data}`;

  return {
    url: dataUri,
    publicId: 'local_fallback_' + Date.now(),
  };
};

export default cloudinary;
