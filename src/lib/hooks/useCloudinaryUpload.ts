// src/lib/hooks/useCloudinaryUpload.ts
import { useState } from 'react';
// Assuming you have a helper function to get signature and upload
// This is a simplified example. Your actual implementation might differ.
async function getCloudinarySignature() {
  const response = await fetch('/api/cloudinary-signature'); // You need this API route
  if (!response.ok) throw new Error("Failed to get Cloudinary signature");
  return response.json();
}

async function uploadToCloudinary(file: File, signatureData: any) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signatureData.apiKey);
  formData.append('timestamp', signatureData.timestamp);
  formData.append('signature', signatureData.signature);
  formData.append('upload_preset', signatureData.uploadPreset); // Make sure this preset exists

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!response.ok) throw new Error("Cloudinary upload failed");
  return response.json();
}


interface UseCloudinaryUploadReturn {
  uploading: boolean;
  error: string | null;
  uploadImage: (file: File) => Promise<string | null>;
}

export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    setError(null);
    try {
      const signatureData = await getCloudinarySignature();
      const result = await uploadToCloudinary(file, signatureData);
      if (result && result.secure_url) {
        return result.secure_url;
      }
      throw new Error('Upload successful but secure_url is missing');
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, uploadImage };
}