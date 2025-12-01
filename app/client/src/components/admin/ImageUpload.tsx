import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  currentImagePath?: string;
  presetId?: string;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  disabled?: boolean;
}


const ImageIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImagePath,
  onUpload,
  onDelete,
  disabled = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build full image URL
  const currentImageUrl = currentImagePath ?
    (currentImagePath.startsWith('http') ? currentImagePath : `${currentImagePath}`) : null;

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return false;
    }

    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setIsUploading(true);
      setError(null);
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      setIsUploading(true);
      setError(null);
      await onDelete();
      setPreviewUrl(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    } finally {
      setIsUploading(false);
    }
  };

  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        Preset Image
      </label>

      {/* Drop Zone / Image Display */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg transition-all
          ${isDragging ? 'border-zinc-500 bg-zinc-500/10' : 'border-zinc-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${displayImageUrl ? 'p-2' : 'p-8'}
        `}
      >
        {displayImageUrl ? (
          // Image preview
          <div className="relative group">
            <img
              src={displayImageUrl}
              alt="Preset preview"
              className="w-full h-48 object-cover rounded-lg"
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                  disabled={isUploading}
                >
                  Replace
                </button>
                {onDelete && currentImageUrl && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    disabled={isUploading}
                  >
                    <DeleteIcon />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          // Upload zone
          <div
            onClick={() => !disabled && fileInputRef.current?.click()}
            className="text-center"
          >
            <div className="flex justify-center mb-4">
              <ImageIcon />
            </div>
            <p className="text-zinc-300 mb-2">
              {isDragging ? 'Drop image here' : 'Click or drag image to upload'}
            </p>
            <p className="text-xs text-zinc-500">
              JPEG, PNG, WebP up to 5MB
            </p>
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}

      {/* Helper text */}
      <p className="text-xs text-zinc-500 mt-2">
        Upload a preview image for this preset effect. The image will be displayed in the effects sidebar.
      </p>
    </div>
  );
};