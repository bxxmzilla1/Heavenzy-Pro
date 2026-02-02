/**
 * Compress and resize an image to reduce file size
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 1920)
 * @param maxHeight - Maximum height in pixels (default: 1920)
 * @param quality - JPEG/PNG quality 0-1 (default: 0.85 for JPEG, 0.9 for PNG)
 * @returns Promise resolving to compressed File with preserved format
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

        // Preserve PNG format for PNG files, use JPEG for others
        const isPNG = file.type === 'image/png';
        const outputType = isPNG ? 'image/png' : 'image/jpeg';
        // PNG compression uses a different quality scale (0-1, but typically 0.9 works well)
        const compressionQuality = isPNG ? Math.min(quality, 0.95) : quality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            // Create a new File preserving the original format
            const compressedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputType,
          compressionQuality
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
      // Preserve the original format (PNG stays PNG, JPEG stays JPEG, etc.)
      mimeType = fileToProcess.type;
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
      // Preserve the original file extension based on mime type
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `image.${extension}`;
      const file = new File([blob], fileName, { type: blob.type });
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
