
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users, Crown, Star, Gamepad2 } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { ChatRoom } from "@/components/chat/chat-room";

interface Room {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  capacity: number;
  isOfficial: boolean;
  category: "official" | "recent" | "favorite" | "game";
  isPrivate: boolean;
}

interface RoomListPageProps {
  onUserClick?: (profile: any) => void;
}

// Mock data untuk fallback
const mockRoomsFallback: Room[] = [
  {
    id: "1",
    name: "MeChat",
    description: "Official main chat room",
    memberCount: 0,
    capacity: 25,
    isOfficial: true,
    category: "official",
    isPrivate: false
  },
  {
    id: "2", 
    name: "Indonesia",
    description: "Chat for Indonesian users",
    memberCount: 0,
    capacity: 25,
    isOfficial: false,
    category: "recent",
    isPrivate: false
  },
  {
    id: "3",
    name: "MeChat",
    description: "Your favorite chat room",
    memberCount: 0,
    capacity: 25,
    isOfficial: true,
    category: "favorite", 
    isPrivate: false
  },
  {
    id: "4",
    name: "lowcard",
    description: "Card game room",
    memberCount: 0,
    capacity: 25,
    isOfficial: false,
    category: "game",
    isPrivate: false
  }
];

export default function RoomListPage({ onUserClick }: RoomListPageProps = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomMemberCounts, setRoomMemberCounts] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  // Listen for real-time member count updates
  useEffect(() => {
    const handleRoomMemberCountUpdate = (event: CustomEvent) => {
      const { roomId, memberCount } = event.detail;
      setRoomMemberCounts(prev => ({
        ...prev,
        [roomId]: memberCount
      }));
    };

    window.addEventListener('room_member_count_updated', handleRoomMemberCountUpdate as EventListener);

    return () => {
      window.removeEventListener('room_member_count_updated', handleRoomMemberCountUpdate as EventListener);
    };
  }, []);

  const { data: rooms = mockRoomsFallback, isLoading } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/rooms', {
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch rooms');
        }
        return response.json();
      } catch (error) {
        console.warn('Failed to fetch rooms, using fallback:', error);
        return mockRoomsFallback;
      }
    },
    enabled: true,
    refetchInterval: 5000,
    staleTime: 1000,
    retry: 1
  });

  const joinRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to join room');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    },
  });

  // Always use rooms data or fallback
  const displayRooms = rooms && rooms.length > 0 ? rooms : mockRoomsFallback;

  const filteredRooms = displayRooms.filter((room: Room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomClick = async (room: Room) => {
    try {
      await joinRoomMutation.mutateAsync(room.id);
      console.log('Successfully joined room');
    } catch (error) {
      console.error('Failed to join room:', error);
    }
    setSelectedRoom(room);
  };

  const handleBackToRoomList = () => {
    // Reset selected room immediately
    setSelectedRoom(null);
    
    // Refresh room data
    queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
  };

  const categorizedRooms = {
    official: filteredRooms.filter((room: Room) => room.category === "official"),
    recent: filteredRooms.filter((room: Room) => room.category === "recent"),
    favorite: filteredRooms.filter((room: Room) => room.category === "favorite"),
    game: filteredRooms.filter((room: Room) => room.category === "game")
  };

  const CategorySection = ({ 
    title, 
    icon, 
    rooms, 
    color = "text-gray-600" 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    rooms: Room[];
    color?: string;
  }) => {
    if (rooms.length === 0) return null;

    return (
      <div className="mb-6">
        <div className={`flex items-center space-x-2 mb-3 ${color}`}>
          {icon}
          <h3 className="font-semibold text-sm uppercase tracking-wide">{title}</h3>
        </div>
        <div className="space-y-2">
          {rooms.map((room) => (
            <Card 
              key={room.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleRoomClick(room)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <UserAvatar 
                        username={room.name}
                        size="md"
                        isOnline={true}
                      />
                      {room.isOfficial && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-800">{room.name}</span>
                        {room.category === "favorite" && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        {room.category === "game" && (
                          <Gamepad2 className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 truncate">{room.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {roomMemberCounts[room.id] !== undefined ? roomMemberCounts[room.id] : room.memberCount}/{room.capacity}
                      </span>
                    </div>
                    {room.isPrivate && (
                      <Badge variant="secondary" className="text-xs">Private</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Show chat room if selected
  if (selectedRoom) {
    return (
      <div className="h-full w-full bg-white flex flex-col">
        {/* Chat room header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center relative flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToRoomList}
            className="text-gray-600 absolute left-4 hover:bg-gray-100"
          >
            ← Back
          </Button>
          <div className="flex items-center space-x-2">
            <UserAvatar 
              username={selectedRoom.name}
              size="sm"
              isOnline={true}
            />
            <span className="font-semibold text-gray-800">{selectedRoom.name}</span>
          </div>
        </div>
        
        {/* Chat room content */}
        <div className="flex-1 overflow-hidden">
          <ChatRoom 
            key={selectedRoom.id} 
            roomId={selectedRoom.id}
            roomName={selectedRoom.name}
            onUserClick={onUserClick || (() => {})}
            onLeaveRoom={handleBackToRoomList}
          />
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full w-full bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading rooms...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show room list - ensure we always have data to display
  const safeDisplayRooms = displayRooms && displayRooms.length > 0 ? displayRooms : mockRoomsFallback;
  const safeFilteredRooms = safeDisplayRooms.filter((room: Room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const safeCategorizedRooms = {
    official: safeFilteredRooms.filter((room: Room) => room.category === "official"),
    recent: safeFilteredRooms.filter((room: Room) => room.category === "recent"),
    favorite: safeFilteredRooms.filter((room: Room) => room.category === "favorite"),
    game: safeFilteredRooms.filter((room: Room) => room.category === "game")
  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800">Chat Rooms</h1>
          <Button size="sm" className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />
            New Room
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Room Categories */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="p-4 space-y-6">
          <CategorySection
            title="Room Official"
            icon={<Crown className="w-4 h-4" />}
            rooms={safeCategorizedRooms.official}
            color="text-primary"
          />

          <CategorySection
            title="Recent Room"
            icon={<Users className="w-4 h-4" />}
            rooms={safeCategorizedRooms.recent}
            color="text-green-600"
          />

          <CategorySection
            title="Favorite Room"
            icon={<Star className="w-4 h-4" />}
            rooms={safeCategorizedRooms.favorite}
            color="text-yellow-600"
          />

          <CategorySection
            title="Game Room"
            icon={<Gamepad2 className="w-4 h-4" />}
            rooms={safeCategorizedRooms.game}
            color="text-blue-600"
          />

          {safeFilteredRooms.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No rooms found</p>
              <p className="text-sm text-gray-400">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
