/**
 * Compress and resize an image to reduce file size
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Promise resolving to compressed File
 */
const compressImage = (file: File, maxWidth: number = 1920, maxHeight: number = 1920, quality: number = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            // Create a new File with the same name and type
            const compressedFile = new File([blob], file.name, {
              type: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
  });
};

export const fileToBase64 = async (file: File, compress: boolean = true): Promise<string> => {
  const result = await fileToBase64WithMetadata(file, compress);
  return result.base64;
};

export interface Base64WithMetadata {
  base64: string;
  mimeType: string;
}

export const fileToBase64WithMetadata = async (file: File, compress: boolean = true): Promise<Base64WithMetadata> => {
  // Compress image if it's an image file and compression is enabled
  let fileToProcess = file;
  let mimeType = file.type;
  
  if (compress && file.type.startsWith('image/')) {
    try {
      fileToProcess = await compressImage(file);
      // After compression, images are converted to JPEG
      mimeType = 'image/jpeg';
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      // Continue with original file if compression fails
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileToProcess);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result is a data URL, like "data:image/png;base64,iVBORw0KGgo..."
        // We need to strip the prefix to get just the base64 string.
        const base64String = reader.result.split(',')[1];
        resolve({ base64: base64String, mimeType });
      } else {
        reject(new Error('Failed to read file as a base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

export const blobToBase64 = async (blob: Blob, compress: boolean = true): Promise<string> => {
  const result = await blobToBase64WithMetadata(blob, compress);
  return result.base64;
};

export const blobToBase64WithMetadata = async (blob: Blob, compress: boolean = true): Promise<Base64WithMetadata> => {
  // If it's an image blob and compression is enabled, convert to File and compress
  if (compress && blob.type.startsWith('image/')) {
    try {
      const file = new File([blob], 'image.jpg', { type: blob.type });
      return await fileToBase64WithMetadata(file, true);
    } catch (error) {
      console.warn('Blob compression failed, using original:', error);
      // Continue with original blob if compression fails
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result is a data URL, like "data:image/png;base64,iVBORw0KGgo..."
        // We need to strip the prefix to get just the base64 string.
        const base64String = reader.result.split(',')[1];
        resolve({ base64: base64String, mimeType: blob.type });
      } else {
        reject(new Error('Failed to read blob as a base64 string.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
