
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
    country?: string;
  };
  onClose: () => void;
  onMessageClick?: (user: any) => void;
}

export function MiniProfileModal({ profile, onClose, onMessageClick }: MiniProfileModalProps) {
  const handleSendMessage = () => {
    if (onMessageClick) {
      onMessageClick({
        id: profile.id,
        username: profile.username,
        level: profile.level,
        status: profile.status,
        isOnline: profile.isOnline,
      });
    }
    onClose();
  };

  const handleAddFriend = async () => {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId: profile.id }),
      });

      if (response.ok) {
        console.log("Friend request sent to", profile.username);
        // You could add a toast notification here
      } else {
        console.error("Failed to send friend request");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
    }
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
          <div className="mb-4 relative">
            {/* Avatar with frame */}
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-1">
                <div className="w-full h-full rounded-full bg-white p-1">
                  <UserAvatar 
                    username={profile.username} 
                    size="xl"
                    isOnline={profile.isOnline}
                    className="w-full h-full"
                  />
                </div>
              </div>
              {/* Online indicator */}
              {profile.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 mb-2">{profile.username}</h3>
          
          {/* Status text */}
          <div className="text-sm text-gray-600 mb-4">
            {profile.status || "..."}
          </div>
          
          {/* Badges row */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
              Level {profile.level}
            </Badge>
            {profile.country && (
              <Badge variant="outline" className="border-gray-300 text-gray-700">
                {profile.country}
              </Badge>
            )}
            <UserStatus isOnline={profile.isOnline} />
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button 
              onClick={handleSendMessage}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Message
            </Button>
            <Button 
              onClick={handleAddFriend}
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
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
