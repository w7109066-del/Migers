
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { UserAvatar } from "@/components/user/user-avatar";
import { X, Camera, Save, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    bio: user?.bio || "",
    country: user?.country || "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCountryField, setShowCountryField] = useState(!!user?.country);
  const [isLoading, setIsLoading] = useState(false);

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
      if (showCountryField) {
        formDataToSend.append('country', formData.country);
      } else {
        formDataToSend.append('country', ''); // Clear country if toggle is off
      }
      
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
        toast({
          title: "Profile updated!",
          description: "Your profile has been successfully updated.",
        });
        onClose();
        // Optionally trigger a refetch of user data
        window.location.reload();
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Edit Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar Section with Photo Upload */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-1">
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
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
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
              <p className="text-sm text-gray-500 mb-2">Click camera icon to change photo</p>
              {selectedPhoto && (
                <p className="text-xs text-green-600">New photo selected: {selectedPhoto.name}</p>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Read-only Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={user.username}
                disabled
                className="bg-gray-100 cursor-not-allowed"
                placeholder="Username cannot be changed"
              />
              <p className="text-xs text-gray-500">Username cannot be modified</p>
            </div>

            {/* Read-only Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="bg-gray-100 cursor-not-allowed"
                placeholder="Email cannot be changed"
              />
              <p className="text-xs text-gray-500">Email cannot be modified</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                className="resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500">{formData.bio.length}/200 characters</p>
            </div>

            {/* Country Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-country">Show Country</Label>
                <Switch
                  id="show-country"
                  checked={showCountryField}
                  onCheckedChange={setShowCountryField}
                />
              </div>
              
              {showCountryField && (
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Enter your country"
                    maxLength={50}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={isLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
