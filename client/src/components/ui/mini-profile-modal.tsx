import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { UserStatus } from "@/components/user/user-status";
import { GiftSendModal } from "@/components/ui/gift-send-modal";
import { X, MessageCircle, UserPlus, Gift, Check, MapPin, Users, UserMinus } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils"; // Assuming cn is imported from utils

// Define MiniProfileData interface for clarity, assuming it's used elsewhere
interface MiniProfileData {
  id: string;
  username: string;
  level: number;
  status: string;
  bio?: string;
  isOnline: boolean;
  country?: string;
  profilePhotoUrl?: string;
  fansCount?: number;
  followingCount?: number;
  isFriend?: boolean;
  isAdmin?: boolean;
}

interface MiniProfileModalProps {
  profile: MiniProfileData;
  onClose: () => void;
  onMessageClick?: (user: MiniProfileData) => void; // Made optional
}

export function MiniProfileModal({ profile, onClose, onMessageClick }: MiniProfileModalProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [showGiftModal, setShowGiftModal] = useState(false);
  const isDarkMode = false; // Placeholder for dark mode, assuming it might be needed for styling consistency
  const [isFriend, setIsFriend] = useState<boolean>(profile.isFriend || false); // State to track friend status

  // Fetch friend status when the component mounts or profile changes
  useEffect(() => {
    const fetchFriendStatus = async () => {
      if (!user || user.id === profile.id) {
        setIsFriend(false); // Not a friend if it's the current user
        return;
      }
      try {
        const response = await fetch(`/api/friends/status?userId=${profile.id}`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setIsFriend(data.isFriend);
        } else {
          // Handle potential errors in fetching friend status
          setIsFriend(false);
        }
      } catch (error) {
        console.error("Failed to fetch friend status:", error);
        setIsFriend(false); // Assume not a friend on error
      }
    };

    fetchFriendStatus();
  }, [profile.id, user, user?.id]); // Re-fetch if profile or user changes


  const handleSendMessage = () => {
    // Only call onMessageClick if it's provided
    if (onMessageClick) {
      onMessageClick(profile);
    }
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

        // Update the friend status in the UI immediately
        setIsFriend(true);
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

  const handleUnfriend = async () => {
    if (!user || user.id === profile.id) return; // Cannot unfriend self

    try {
      const response = await fetch('/api/friends/unfriend', {
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
        addNotification({
          type: 'friend_remove',
          title: 'Friend Removed',
          message: `${profile.username} has been removed from your friends.`,
          fromUser: {
            id: profile.id,
            username: profile.username,
          },
        });

        toast({
          title: "Friend removed!",
          description: `You have unfriended ${profile.username}.`,
        });

        // Update the friend status in the UI immediately
        setIsFriend(false);
        // Invalidate and refetch the friends query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        onClose();
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to remove friend",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to remove friend:', error);
      toast({
        title: "Network error",
        description: "Failed to remove friend. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl mx-4 p-4 max-w-xs w-full relative shadow-2xl">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-1 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="mb-3 relative">
            {/* Avatar with fancy frame */}
            <div className="relative inline-block">
              <UserAvatar
                username={profile.username}
                size="sm"
                isOnline={profile.isOnline}
                className="w-[75px] h-[75px]"
                profilePhotoUrl={profile.profilePhotoUrl}
                isAdmin={profile.isAdmin} // Pass isAdmin prop
              />
            </div>
          </div>

          {/* User Info */}
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-1">{profile.username}</h2>
            {profile.status && profile.status.length > 0 && profile.status !== 'online' && profile.status !== 'offline' && profile.status !== 'away' && profile.status !== 'busy' ? (
              <p className="text-gray-600 text-xs italic mb-2">"{profile.status}"</p>
            ) : (
              <p className="text-gray-600 text-xs">{profile.isOnline ? 'Online' : 'Offline'}</p>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center justify-center space-x-1 mb-3">
            <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs">
              Level {profile.level}
            </Badge>
            <Badge variant="outline" className="border-gray-300 text-gray-700 text-xs flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              ID
            </Badge>
            <UserStatus isOnline={profile.isOnline} />
            {profile.isAdmin && ( // Conditionally render admin badge
              <Badge variant="default" className="bg-red-600 text-white text-xs font-semibold">
                Admin
              </Badge>
            )}
          </div>

          {/* Fans and Following Stats */}
          <div className="flex items-center justify-center space-x-6 mb-4">
            <div className="flex items-center text-gray-600">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{profile.fansCount || 0} Fans</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Users className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">{profile.followingCount || 0} Following</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <div className="flex space-x-2">
              {onMessageClick && ( // Conditionally render Message button
                <Button
                  onClick={handleSendMessage}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 text-sm py-2"
                >
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Message
                </Button>
              )}
              <Button
                onClick={() => setShowGiftModal(true)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 text-sm py-2"
              >
                <Gift className="w-4 h-4 mr-1" />
                Send Gift
              </Button>
            </div>
            {user && user.id !== profile.id && ( // Don't show add/unfriend button for self
              <div className="w-full">
                {isFriend ? (
                  <Button
                    onClick={handleUnfriend}
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm py-2"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Friends
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddFriend}
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm py-2"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Friend
                  </Button>
                )}
              </div>
            )}
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