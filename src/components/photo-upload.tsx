"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useToast } from "@/contexts/ToastContext";
import { AmalaLocation } from '@/types/location';

interface PhotoUploadProps {
  location: AmalaLocation;
  onPhotoUploaded?: (photo: any) => void;
  onClose?: () => void;
}

export function PhotoUpload({ location, onPhotoUploaded, onClose }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, getIdToken } = useAuth();
  const { success, error } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    const validPreviews: string[] = [];
    const validCaptions: string[] = [];

    files.forEach((file) => {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        error(`${file.name} is not a supported image format`, 'Invalid File Type');
        return;
      }

      // Check file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        error(`${file.name} is too large. Maximum size is 5MB`, 'File Too Large');
        return;
      }

      validFiles.push(file);
      validCaptions.push('');
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      validPreviews.push(previewUrl);
    });

    // Limit to 5 photos max
    if (selectedFiles.length + validFiles.length > 5) {
      error('You can upload a maximum of 5 photos at once', 'Too Many Files');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setCaptions(prev => [...prev, ...validCaptions]);
    setPreviewUrls(prev => [...prev, ...validPreviews]);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setCaptions(prev => {
      const newCaptions = [...prev];
      newCaptions[index] = caption;
      return newCaptions;
    });
  };

  const removeFile = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setCaptions(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user) {
      error('Please sign in to upload photos', 'Authentication Required');
      return;
    }

    if (selectedFiles.length === 0) {
      error('Please select at least one photo to upload', 'No Photos Selected');
      return;
    }

    setIsUploading(true);

    try {
      const token = await getIdToken();
      if (!token) {
        error('Authentication failed. Please sign in again.', 'Authentication Error');
        return;
      }

      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('locationId', location.id);
        formData.append('caption', captions[index] || '');

        const response = await fetch('/api/photos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        return response.json();
      });

      const results = await Promise.all(uploadPromises);
      
      // Clean up preview URLs
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Reset form
      setSelectedFiles([]);
      setCaptions([]);
      setPreviewUrls([]);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      success(`Successfully uploaded ${results.length} photo${results.length > 1 ? 's' : ''}!`, 'Upload Complete');
      
      // Notify parent component
      results.forEach(result => {
        if (result.photo && onPhotoUploaded) {
          onPhotoUploaded(result.photo);
        }
      });

      // Close the upload dialog
      if (onClose) {
        onClose();
      }

    } catch (err) {
      console.error('Photo upload error:', err);
      error(err instanceof Error ? err.message : 'Failed to upload photos', 'Upload Failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Add Photos to {location.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* File Input */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || selectedFiles.length >= 5}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-4xl mb-2">📷</div>
              <div className="text-lg font-medium text-gray-700 mb-1">
                Choose Photos
              </div>
              <div className="text-sm text-gray-500">
                JPEG, PNG, WebP up to 5MB each (max 5 photos)
              </div>
            </button>
          </div>

          {/* Selected Photos Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Selected Photos ({selectedFiles.length}/5)
              </h3>
              <div className="space-y-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <Image
                        src={previewUrls[index]}
                        alt={`Preview ${index + 1}`}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {file.name}
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <input
                        type="text"
                        placeholder="Add a caption (optional)"
                        value={captions[index]}
                        onChange={(e) => handleCaptionChange(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 text-xl"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  📤 Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}` : 'Photos'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
