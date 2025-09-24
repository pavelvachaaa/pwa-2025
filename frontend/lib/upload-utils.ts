// File upload utilities for chat application

export interface UploadedFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

// Mock upload function - replace with actual implementation
export async function uploadFile(file: File, options?: FileUploadOptions): Promise<UploadedFile> {
  // Validate file size
  if (options?.maxSize && file.size > options.maxSize) {
    throw new Error(`File size exceeds limit of ${options.maxSize} bytes`);
  }

  // Validate file type
  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }

  // Mock upload - in real implementation this would upload to a server
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `file_${Date.now()}`,
        filename: `${Date.now()}_${file.name}`,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // Temporary URL for demo
        uploadedAt: new Date().toISOString(),
      });
    }, 1000); // Simulate upload delay
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}