/**
 * Cloudinary signed upload utilities
 */

/**
 * Fetches a signature from the server for Cloudinary uploads
 */
export async function getCloudinarySignature() {
  try {
    const response = await fetch('/api/cloudinary-signature');
    if (!response.ok) {
      throw new Error(`Failed to get signature: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching cloudinary signature:', error);
    throw error;
  }
}

/**
 * Uploads an image to Cloudinary using a signed upload
 * @param file The file to upload
 * @returns The upload result with the secure_url
 */
export async function uploadImageToCloudinary(file: File) {
  try {
    // Get the signature and other required data
    const { signature, timestamp, cloudName, apiKey, uploadPreset } = await getCloudinarySignature();
    
    // Create form data for the upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('upload_preset', uploadPreset);
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    // Return the response with secure_url
    return await response.json();
  } catch (error) {
    console.error('Error uploading to cloudinary:', error);
    throw error;
  }
} 