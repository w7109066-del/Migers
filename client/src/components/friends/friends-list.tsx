import { useQuery } from "@tanstack/react-query";
import { UserAvatar } from "@/components/user/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

interface Friend extends User {
  friendshipStatus: string;
}

interface FriendsListProps {
  onUserClick: (profile: any) => void;
}

export function FriendsList({ onUserClick }: FriendsListProps) {
  const { user } = useAuth();
  
  const { data: friends, isLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    enabled: Boolean(user),
  });

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
    <div className="space-y-3">
      {friends.map((friend) => (
        <Card 
          key={friend.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
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
  );
}
