import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper function to generate upload options
export function getUploadOptions(folder: string, publicId?: string) {
  return {
    folder,
    public_id: publicId,
    resource_type: 'image' as const,
    quality: 'auto',
    flags: 'progressive',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' }, // Limit max size
      { quality: 'auto:good' }, // Automatic quality optimization
    ],
  };
}

// Helper function to generate secure URLs
export function getOptimizedUrl(publicId: string, options?: any) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 800, height: 600, crop: 'fill' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
    ],
    ...options,
  });
}
