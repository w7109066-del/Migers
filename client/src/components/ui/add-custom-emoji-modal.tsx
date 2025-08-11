
import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { X, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface AddCustomEmojiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiAdded: () => void;
}

export function AddCustomEmojiModal({ isOpen, onClose, onEmojiAdded }: AddCustomEmojiModalProps) {
  const { isDarkMode } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    emojiCode: '',
    category: 'custom'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/gif', 'image/webp', 'image/jpeg'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a PNG, GIF, WEBP, or JPEG file');
        return;
      }

      // Validate file size (max 1MB)
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB');
        return;
      }

      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.emojiCode.trim() || !selectedFile) {
      alert('Please fill in all fields and select a file');
      return;
    }

    // Validate emoji code format
    if (!formData.emojiCode.startsWith(':') || !formData.emojiCode.endsWith(':')) {
      alert('Emoji code must be in format :emoji_name:');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadData = new FormData();
      uploadData.append('name', formData.name.trim());
      uploadData.append('emojiCode', formData.emojiCode.trim());
      uploadData.append('category', formData.category);
      uploadData.append('emojiFile', selectedFile);

      const response = await fetch('/api/admin/emojis/add', {
        method: 'POST',
        body: uploadData,
        credentials: 'include',
      });

      if (response.ok) {
        onEmojiAdded();
        handleClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add custom emoji');
      }
    } catch (error) {
      console.error('Error adding custom emoji:', error);
      alert('Failed to add custom emoji');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', emojiCode: '', category: 'custom' });
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  const generateEmojiCode = (name: string) => {
    const code = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    return code ? `:${code}:` : '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      <div className={cn(
        "relative z-50 w-full max-w-md p-6 rounded-lg shadow-lg",
        isDarkMode ? "bg-gray-800" : "bg-white"
      )}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
            Add Custom Emoji
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Emoji Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData(prev => ({
                  ...prev,
                  name,
                  emojiCode: generateEmojiCode(name)
                }));
              }}
              placeholder="e.g., Happy Face"
              maxLength={100}
              className={cn("", isDarkMode ? "bg-gray-700 border-gray-600" : "")}
            />
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Emoji Code
            </label>
            <Input
              value={formData.emojiCode}
              onChange={(e) => setFormData(prev => ({ ...prev, emojiCode: e.target.value }))}
              placeholder=":happy_face:"
              maxLength={50}
              className={cn("", isDarkMode ? "bg-gray-700 border-gray-600" : "")}
            />
            <p className={cn("text-xs mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
              Format: :emoji_name: (will be auto-generated from name)
            </p>
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 border rounded-md",
                isDarkMode 
                  ? "bg-gray-700 border-gray-600 text-white" 
                  : "bg-white border-gray-300 text-gray-900"
              )}
            >
              <option value="custom">Custom</option>
              <option value="reactions">Reactions</option>
              <option value="objects">Objects</option>
              <option value="animals">Animals</option>
              <option value="food">Food</option>
            </select>
          </div>

          <div>
            <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Emoji Image
            </label>
            <div className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center",
              isDarkMode ? "border-gray-600" : "border-gray-300"
            )}>
              {previewUrl ? (
                <div className="space-y-2">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-16 h-16 mx-auto object-contain"
                  />
                  <p className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    {selectedFile?.name}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      if (previewUrl) {
                        URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Click to upload image
                  </p>
                  <p className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-500")}>
                    PNG, GIF, WEBP, JPEG (max 1MB)
                  </p>
                  <input
                    type="file"
                    accept="image/png,image/gif,image/webp,image/jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.emojiCode.trim() || !selectedFile}
              className="bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? "Adding..." : "Add Emoji"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
