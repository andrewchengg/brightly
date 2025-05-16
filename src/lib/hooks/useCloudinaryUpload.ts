import { useState } from 'react';
import { uploadImageToCloudinary } from '../cloudinary';

interface UseCloudinaryUploadReturn {
  uploading: boolean;
  error: string | null;
  imageUrl: string | null;
  uploadImage: (file: File) => Promise<string | null>;
}

/**
 * Custom hook for handling Cloudinary signed uploads
 */
export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  /**
   * Uploads an image to Cloudinary with a signed upload
   * @param file The file to upload
   * @returns The secure URL of the uploaded image, or null on error
   */
  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);

    try {
      const result = await uploadImageToCloudinary(file);
      
      if (result && result.secure_url) {
        setImageUrl(result.secure_url);
        return result.secure_url;
      } else {
        throw new Error('Upload successful but secure_url is missing');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to upload image';
      setError(errorMessage);
      console.error('Upload error:', errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    imageUrl,
    uploadImage,
  };
} 