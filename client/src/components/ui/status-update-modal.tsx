
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StatusUpdateModal({ isOpen, onClose }: StatusUpdateModalProps) {
  const { user } = useAuth();
  const [statusMessage, setStatusMessage] = useState(user?.status || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (!statusMessage.trim()) {
        toast({
          title: "Status message required",
          description: "Please enter a status message.",
          variant: "destructive",
        });
        return;
      }

      if (statusMessage.length > 200) {
        toast({
          title: "Status message too long",
          description: "Please keep your status message under 200 characters.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/user/status-message', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ statusMessage: statusMessage.trim() }),
      });

      if (response.ok) {
        toast({
          title: "Status updated!",
          description: "Your status message has been updated successfully.",
        });
        onClose();
        // Optionally trigger a refetch of user data
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to update status",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast({
        title: "Network error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Update Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
              placeholder="What's on your mind?"
              className="resize-none min-h-[100px]"
              maxLength={200}
            />
            <div className="text-right text-xs text-gray-500">
              {statusMessage.length}/200 characters
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
              disabled={isLoading || !statusMessage.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
