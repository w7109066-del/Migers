import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserStatus } from "@/components/user/user-status";
import { GiftSendModal } from "@/components/ui/gift-send-modal";
import { X, MessageCircle, UserPlus, Gift } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils"; // Assuming cn is imported from utils

interface MiniProfileModalProps {
  profile: {
    id: string;
    username: string;
    level: number;
    status: string;
    bio?: string; // Added bio field
    isOnline: boolean;
    country?: string;
    profilePhotoUrl?: string; // Added profilePhotoUrl field
  };
  onClose: () => void;
  onMessageClick?: (user: any) => void;
}

export function MiniProfileModal({ profile, onClose, onMessageClick }: MiniProfileModalProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [showGiftModal, setShowGiftModal] = useState(false);
  const isDarkMode = false; // Placeholder for dark mode, assuming it might be needed for styling consistency

  const handleSendMessage = () => {
    onMessageClick(profile);
    onClose();
  };

  const handleAddFriend = async () => {
    // Check if user is trying to add themselves
    if (user && user.id === profile.id) {
      toast({
        title: "Cannot add yourself",
        description: "You cannot send a friend request to yourself.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          userId: profile.id,
        }),
      });

      if (response.ok) {
        // Add notification for successful friend request
        addNotification({
          type: 'friend_request',
          title: 'Friend Request Sent',
          message: `Friend request sent to ${profile.username}`,
          fromUser: {
            id: profile.id,
            username: profile.username,
          },
        });

        toast({
          title: "Friend request sent!",
          description: `Your friend request has been sent to ${profile.username}.`,
        });

        // Invalidate and refetch the friends query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['friends'] });

        onClose();
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to send friend request",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast({
        title: "Network error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
    }
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
            {/* Avatar with fancy frame */}
            <div className="relative inline-block">
              <UserAvatar
                username={profile.username}
                size="xl"
                isOnline={profile.isOnline}
                className="w-full h-full"
                profilePhotoUrl={profile.profilePhotoUrl}
              />
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-1">{profile.username}</h2>
            {profile.status && profile.status.length > 0 && profile.status !== 'online' && profile.status !== 'offline' && profile.status !== 'away' && profile.status !== 'busy' ? (
              <p className="text-gray-600 text-sm italic mb-2">"{profile.status}"</p>
            ) : (
              <p className="text-gray-600 text-sm">{profile.isOnline ? 'Online' : 'Offline'}</p>
            )}
            {profile.bio && (
              <div className={cn("text-sm mb-3 p-3 rounded-lg", isDarkMode ? "bg-gray-700 text-gray-200" : "bg-gray-50 text-gray-700")}>
                <div className={cn("text-xs font-medium mb-1", isDarkMode ? "text-gray-400" : "text-gray-500")}>Bio</div>
                <div>{profile.bio}</div>
              </div>
            )}
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
          <div className="space-y-3">
            <div className="flex space-x-2">
              <Button
                onClick={handleSendMessage}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button
                onClick={() => setShowGiftModal(true)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white border-0"
              >
                <Gift className="w-4 h-4 mr-2" />
                Send Gift
              </Button>
            </div>
            <Button
              onClick={handleAddFriend}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </div>
        </div>
      </div>

      {/* Gift Send Modal */}
      <GiftSendModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        recipient={{
          id: profile.id,
          username: profile.username
        }}
      />
    </div>
  );
}