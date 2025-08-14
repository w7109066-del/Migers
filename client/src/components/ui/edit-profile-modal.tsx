import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogOverlay } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user/user-avatar";
import { X, Camera, Save, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils"; // Assuming cn is available for conditional styling

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    bio: user?.bio || "",
    country: user?.country || "ID",
    phoneNumber: user?.phoneNumber || "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const isDarkMode = false; // Placeholder for dark mode state if it exists in context

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      setSelectedPhoto(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const formDataToSend = new FormData();

      // Add form fields
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('country', formData.country);
      formDataToSend.append('phoneNumber', formData.phoneNumber);


      // Add photo if selected
      if (selectedPhoto) {
        formDataToSend.append('profilePhoto', selectedPhoto);
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        body: formDataToSend, // Don't set Content-Type, let browser set it for FormData
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Profile updated!",
          description: "Your profile has been successfully updated.",
        });
        onClose();
        
        // Force refresh after short delay to ensure server has processed the update
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to update profile",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Network error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogOverlay className="fixed inset-0 z-50 bg-black/50" />
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto relative z-[9999] fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-white shadow-lg border rounded-lg p-4 sm:p-6">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Updating profile...</p>
            </div>
          </div>
        )}

        <DialogHeader className="pb-4">
          <DialogTitle className="text-center text-lg sm:text-xl">Edit Profile</DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm text-gray-500">
            Update your profile information and photo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Avatar Section with Photo Upload */}
          <div className="flex flex-col items-center space-y-3 sm:space-y-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-1">
                <div className="w-full h-full rounded-full bg-white p-1 overflow-hidden">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <UserAvatar
                      username={user.username}
                      size="xl"
                      isOnline={user.isOnline || false}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 rounded-full w-7 h-7 sm:w-8 sm:h-8 p-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="text-center">
              <p className="text-xs sm:text-sm text-gray-500 mb-2">Click camera icon to change photo</p>
              {selectedPhoto && (
                <p className="text-xs text-green-600 truncate max-w-[250px]">New photo: {selectedPhoto.name}</p>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-2 sm:space-y-3">
            {/* Read-only Username */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                value={user.username}
                disabled
                className="bg-gray-100 cursor-not-allowed text-sm"
                placeholder="Username cannot be changed"
              />
              <p className="text-xs text-gray-500">Username cannot be modified</p>
            </div>

            {/* Read-only Email */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-gray-100 cursor-not-allowed text-sm"
                placeholder="Email cannot be changed"
              />
              <p className="text-xs text-gray-500">Email cannot be modified</p>
            </div>

            {/* Bio */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                className="resize-none text-sm"
                rows={2}
                maxLength={200}
              />
              <p className="text-xs text-gray-500">{formData.bio.length}/200 characters</p>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="+628123456789"
                className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
              />
              <p className="text-xs text-gray-500">
                Use international format (e.g., +628123456789). This will be used for OTP verification.
              </p>
            </div>

            {/* Country Input */}
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter your country"
                className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 sm:space-x-3 pt-3 sm:pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 text-sm py-2"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-sm py-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="hidden sm:inline">Saving...</span>
                  <span className="sm:hidden">Save</span>
                </>
              ) : (
                <>
                  <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Save Changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}