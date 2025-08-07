import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { RefreshCw, Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { NotificationDropdown } from "../ui/notification-dropdown";

interface Friend extends User {
  friendshipStatus: string;
}

interface FriendsListProps {
  onUserClick: (profile: any) => void;
  showRefreshButton?: boolean;
}

export function FriendsList({ onUserClick, showRefreshButton = false }: FriendsListProps) {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotifications(); // Assuming useNotifications provides notifications and a way to mark them as read
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: friends, isLoading, refetch } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    enabled: Boolean(user),
    staleTime: 0, // Always consider data stale to force fresh requests
    cacheTime: 0, // Don't cache the data
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Manual refresh triggered');

      // Clear cache completely
      queryClient.removeQueries({ queryKey: ["/api/friends"] });

      // Force refetch
      await refetch();

      console.log('Manual refresh completed');
    } catch (error) {
      console.error('Failed to refresh friends:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Listen for friend list updates
  useEffect(() => {
    const handleFriendListUpdate = async () => {
      console.log('Friend list update event received, forcing refresh...');

      // Clear cache first
      queryClient.removeQueries({ queryKey: ["/api/friends"] });

      // Force immediate refetch
      try {
        await refetch();
        console.log('Friend list successfully refreshed');
      } catch (error) {
        console.error('Failed to refresh friend list:', error);
      }
    };

    window.addEventListener('friendListUpdate', handleFriendListUpdate);
    return () => {
      window.removeEventListener('friendListUpdate', handleFriendListUpdate);
    };
  }, [queryClient]);

  const handleUserClick = (friend: Friend) => {
    onUserClick({
      id: friend.id,
      username: friend.username,
      level: friend.level,
      status: friend.status || "Available",
      isOnline: friend.isOnline,
    });
  };

  const getLastSeenText = (lastSeen: string | null, isOnline: boolean) => {
    if (isOnline) return "Active now";
    if (!lastSeen) return "Last seen a while ago";

    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `Last seen ${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `Last seen ${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return `Last seen ${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const filteredFriends = friends?.filter(friend =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-2">No friends yet</div>
        <div className="text-sm text-gray-500">
          Start chatting to make new friends!
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">Friends</h1>
          {showRefreshButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-primary border-primary hover:bg-primary hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>

          {/* User Avatar and Level */}
          <div className="flex items-center space-x-3">
            <UserAvatar username={user?.username || ""} size="sm" isOnline={true} />
            <div className="flex flex-col">
              <span className="font-medium text-sm text-gray-700">{user?.username}</span>
              <span className="text-xs text-gray-500">Level {user?.level || 1}</span>
            </div>
          </div>

          {/* Notification Icon */}
          <NotificationDropdown
            notifications={notifications}
            onMarkAsRead={markAsRead}
            trigger={
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications && notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </Button>
            }
          />
        </div>
      </div>

      <div className="p-4 flex-grow overflow-y-auto">
        {filteredFriends.length === 0 && searchQuery && (
          <div className="text-center py-12 text-gray-400">No friends found matching your search.</div>
        )}
        {!searchQuery && friends.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">No friends yet</div>
            <div className="text-sm text-gray-500">
              Start chatting to make new friends!
            </div>
          </div>
        )}

        {filteredFriends.map((friend) => (
          <Card
            key={friend.id}
            className="cursor-pointer hover:shadow-md transition-shadow mb-3"
            onClick={() => handleUserClick({
              ...friend,
              country: friend.country || "ID"
            })}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserAvatar
                    username={friend.username}
                    size="md"
                    isOnline={friend.isOnline || false}
                  />
                  <div>
                    <div className="font-semibold text-gray-800">{friend.username}</div>
                    <div className="text-sm text-gray-500">
                      {friend.status && friend.status.length > 0 && friend.status !== 'online' && friend.status !== 'offline' && friend.status !== 'away' && friend.status !== 'busy' ? (
                        <div className="text-xs text-gray-600 mb-1 italic">"{friend.status}"</div>
                      ) : null}
                      {getLastSeenText(friend.lastSeen ? friend.lastSeen.toString() : null, friend.isOnline || false)}
                    </div>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}