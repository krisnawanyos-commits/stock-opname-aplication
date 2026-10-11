/**
 * Image compressor utility to prevent exceeding Firestore's 1MB document limit.
 * Resizes smartphone camera photos (often 3-8MB) to an optimal warehouse thumbnail
 * (e.g. max 1024px, JPEG quality 0.65) resulting in ~80-150KB files with high visual clarity.
 */

export const compressImage = (
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.65
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const processLoadedImage = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
          return;
        }

        // Calculate aspect ratio scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
          return;
        }

        // Better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onload = processLoadedImage;
    img.onerror = (e) => reject(new Error('Failed to load image for compression: ' + e));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          reject(new Error('Failed to read file buffer'));
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
};
