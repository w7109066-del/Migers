
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Gift, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiftAdded: () => void;
}

export function AddGiftModal({ isOpen, onClose, onGiftAdded }: AddGiftModalProps) {
  const { isDarkMode } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'populer'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const allowedTypes = ['image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    
    if (file && allowedTypes.includes(file.type)) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a PNG, GIF, WEBP, or SVG image file.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !imageFile) {
      toast({
        title: "Missing fields",
        description: "Please fill all fields and upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const submitFormData = new FormData();
      submitFormData.append('name', formData.name);
      submitFormData.append('price', formData.price);
      submitFormData.append('category', formData.category);
      submitFormData.append('imageFile', imageFile);

      const response = await fetch('/api/admin/gifts/add', {
        method: 'POST',
        credentials: 'include',
        body: submitFormData,
      });

      if (response.ok) {
        toast({
          title: "Gift added successfully!",
          description: `${formData.name} has been added to the gift collection.`,
        });
        
        // Reset form
        setFormData({ name: '', price: '', category: 'populer' });
        setImageFile(null);
        setImagePreview(null);
        
        onGiftAdded();
        onClose();
      } else {
        const errorText = await response.text();
        toast({
          title: "Failed to add gift",
          description: errorText || "An error occurred while adding the gift.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to add gift:', error);
      toast({
        title: "Network error",
        description: "Failed to add gift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className={cn("rounded-2xl mx-4 p-0 relative shadow-2xl max-h-[90vh] overflow-hidden w-full max-w-md", 
        isDarkMode ? "bg-gray-900" : "bg-white")}>
        
        {/* Header */}
        <div className={cn("p-4 relative border-b", 
          isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
          <button
            onClick={onClose}
            className={cn("absolute top-4 right-4 transition-colors", 
              isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-800")}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-3">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", 
              isDarkMode ? "bg-gray-700" : "bg-gray-200")}>
              <Gift className={cn("w-6 h-6", isDarkMode ? "text-gray-300" : "text-gray-600")} />
            </div>
            <div>
              <h2 className={cn("text-lg font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                Add New Gift
              </h2>
              <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                Upload image file (PNG, GIF, WEBP, SVG)
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Gift Name */}
          <div className="space-y-2">
            <Label className={cn("", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Gift Name
            </Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter gift name"
              className={cn("", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "")}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label className={cn("", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Price (Coins)
            </Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="Enter price in coins"
              min="1"
              className={cn("", isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "")}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className={cn("", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Category
            </Label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className={cn("w-full px-3 py-2 rounded-md border", 
                isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300")}
            >
              <option value="populer">Populer</option>
              <option value="lucky">Lucky</option>
              <option value="setKostum">Set Kostum</option>
              <option value="bangsa">Bangsa</option>
              <option value="tasSaya">Tas Saya</option>
            </select>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className={cn("", isDarkMode ? "text-gray-300" : "text-gray-700")}>
              Gift Image
            </Label>
            <div className={cn("border-2 border-dashed rounded-lg p-4 text-center", 
              isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-300 bg-gray-50")}>
              <input
                type="file"
                accept=".png,.gif,.webp,.svg"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Preview" className="mx-auto h-16 w-16 object-cover rounded" />
                    <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      {imageFile?.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className={cn("mx-auto h-8 w-8", isDarkMode ? "text-gray-400" : "text-gray-400")} />
                    <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      Click to upload image (PNG, GIF, WEBP, SVG)
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className={cn("p-4 border-t", isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
          <div className="flex space-x-3">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? "Adding..." : "Add Gift"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
