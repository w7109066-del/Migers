import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserStatus } from "@/components/user/user-status";
import { X, MessageCircle, UserPlus } from "lucide-react";

interface MiniProfileModalProps {
  profile: {
    id: string;
    username: string;
    level: number;
    status: string;
    isOnline: boolean;
  };
  onClose: () => void;
}

export function MiniProfileModal({ profile, onClose }: MiniProfileModalProps) {
  const handleSendMessage = () => {
    // TODO: Navigate to DM with this user
    console.log("Send message to", profile.username);
    onClose();
  };

  const handleAddFriend = () => {
    // TODO: Send friend request
    console.log("Add friend", profile.username);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl mx-4 p-6 max-w-sm w-full relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="mb-4">
            <UserAvatar 
              username={profile.username} 
              size="xl"
              isOnline={profile.isOnline}
            />
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-1">{profile.username}</h3>
          
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Badge variant="secondary" className="bg-warning text-white">
              Level {profile.level}
            </Badge>
            <UserStatus isOnline={profile.isOnline} />
          </div>
          
          <div className="text-sm text-gray-600 mb-6">
            "{profile.status}"
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleSendMessage}
              className="flex-1 bg-primary hover:bg-primary/90 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button 
              onClick={handleAddFriend}
              variant="outline"
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
