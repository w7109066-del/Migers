import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Users, Crown, Star, Gamepad2, X } from "lucide-react";
import { UserAvatar } from "@/components/user/user-avatar";
import { ChatRoom } from "@/components/chat/chat-room";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils"; // Assuming cn is imported from lib/utils

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
  onUserClick?: (user: any) => void;
  onRoomSelect?: (room: { id: string; name: string }) => void;
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

export default function RoomListPage({ onUserClick, onRoomSelect }: RoomListPageProps = {}) {
  // All state hooks must be at the top and called unconditionally
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomMemberCounts, setRoomMemberCounts] = useState<Record<string, number>>({});
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [roomMessages, setRoomMessages] = useState<Record<string, any[]>>({});

  // All context hooks must be called unconditionally
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // All query hooks must be called unconditionally
  const { data: rooms = mockRoomsFallback, isLoading, error } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      console.log('Fetching rooms from API...');
      const response = await fetch('/api/rooms', {
        credentials: 'include',
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`Failed to fetch rooms: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);
      return data;
    },
    enabled: true,
    refetchInterval: false,
    staleTime: Infinity,
    retry: false
  });

  const { data: memberCounts, refetch: refetchMemberCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/rooms/member-counts"],
    refetchInterval: 3000,
    staleTime: 1000,
    enabled: !!rooms,
  });

  const joinRoomMutation = useMutation({
    mutationFn: async (roomData: Room) => {
      const response = await fetch(`/api/rooms/${roomData.id}/join`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        console.log('Successfully joined room:', roomData.name);
        setSelectedRoom({ id: roomData.id, name: roomData.name });
        return roomData;
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          toast({
            title: "Access Denied",
            description: errorData.message || "You are banned from accessing chat rooms.",
            variant: "destructive",
          });
        } else {
          console.error('Failed to join room:', response.status, errorData);
          toast({
            title: "Error",
            description: errorData.message || "Failed to join room. Please try again.",
            variant: "destructive",
          });
        }
        throw new Error(errorData.message || 'Failed to join room');
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      if (typeof onRoomSelect === 'function' && data) {
        onRoomSelect({ id: data.id, name: data.name });
      }
    },
    onError: (error: Error) => {
      console.error('Room join mutation error:', error);
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: { name: string; description: string }) => {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: roomData.name,
          description: roomData.description,
          isPublic: true,
          maxMembers: 25
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setIsCreateRoomOpen(false);
      setNewRoomName("");
      setNewRoomDescription("");
      toast({
        title: "Room Created",
        description: "Your room has been created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // All useEffect hooks must be called unconditionally
  useEffect(() => {
    const handleMemberCountUpdate = (event: CustomEvent) => {
      console.log('Member count updated:', event.detail);
      refetchMemberCounts();
    };

    window.addEventListener('room_member_count_updated', handleMemberCountUpdate as EventListener);

    return () => {
      window.removeEventListener('room_member_count_updated', handleMemberCountUpdate as EventListener);
    };
  }, [refetchMemberCounts]);

  useEffect(() => {
    if (!selectedRoom && rooms && rooms.length === 0 && !isLoading && !error) {
      console.log('RoomList: No rooms available, forcing refetch');
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    }
  }, [selectedRoom, rooms, isLoading, error, queryClient]);

  // Process data after all hooks are called
  const displayRooms = rooms && rooms.length > 0 ? rooms : mockRoomsFallback;
  
  console.log('Using rooms data:', {
    hasRoomsData: !!rooms,
    roomsLength: rooms?.length,
    usingFallback: !rooms || rooms.length === 0,
    error: error?.message
  });

  if (error) {
    console.error('Room fetch error:', error);
  }

  const filteredRooms = displayRooms.filter((room: Room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomClick = async (room: Room) => {
    console.log('Room clicked:', room);

    // Validate room data before proceeding
    if (!room || !room.id || !room.name) {
      console.error('Invalid room data:', room);
      toast({
        title: "Error",
        description: "Invalid room data. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous join attempts
    if (joinRoomMutation.isPending) {
      console.log('Room join already in progress');
      return;
    }

    console.log('Attempting to join room:', room.id);
    joinRoomMutation.mutate(room);
  };

  const handleBackToRoomList = () => {
    console.log('Back to room list clicked - staying connected to room');
    
    // Clear selected room state
    setSelectedRoom(null);

    // Refresh room data to ensure clean state
    queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    refetchMemberCounts();

    // Dispatch event to notify parent component that we're back to room list
    window.dispatchEvent(new CustomEvent('backToRoomList'));
  };

  // Handler to save messages when leaving room view
  const handleSaveRoomMessages = (roomId: string, messages: any[]) => {
    setRoomMessages(prev => ({
      ...prev,
      [roomId]: [...messages]
    }));
  };

  // Handler to get saved messages for a room
  const getSavedRoomMessages = (roomId: string) => {
    return roomMessages[roomId] || [];
  };

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      toast({
        title: "Error",
        description: "Room name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newRoomDescription.trim()) {
      toast({
        title: "Error",
        description: "Room description is required",
        variant: "destructive",
      });
      return;
    }

    // Filter description to prevent "This room is managed by" text
    const filteredDescription = newRoomDescription.trim()
      .replace(/this room is managed by/gi, '')
      .replace(/room is managed by/gi, '')
      .replace(/managed by/gi, '')
      .trim();

    if (!filteredDescription) {
      toast({
        title: "Error",
        description: "Please provide a valid room description",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate({
      name: newRoomName.trim(),
      description: filteredDescription
    });
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
              className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{room.name}</span>
                        {room.category === "favorite" && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        {room.category === "game" && (
                          <Gamepad2 className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{room.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">
                        {memberCounts?.[room.id] || 0}/{room.capacity}
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
    console.log('RoomList: Rendering chat room for:', selectedRoom);
    console.log('RoomList: Selected room details:', {
      id: selectedRoom.id,
      name: selectedRoom.name,
      hasId: !!selectedRoom.id,
      hasName: !!selectedRoom.name
    });

    // Validate selected room before rendering
    if (!selectedRoom.id || !selectedRoom.name) {
      console.error('RoomList: Invalid selected room, resetting:', selectedRoom);
      setSelectedRoom(null);
      return null;
    }

    console.log('RoomList: About to render ChatRoom component');

    return (
      <div className="h-full w-full bg-white dark:bg-gray-900 flex flex-col">
        {/* Chat room header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-center relative flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToRoomList}
            className="text-gray-600 dark:text-gray-300 absolute left-4 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            ← Back
          </Button>
          <div className="flex items-center space-x-2">
            <UserAvatar
              username={selectedRoom.name}
              size="sm"
              isOnline={true}
            />
            <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedRoom.name}</span>
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
            savedMessages={getSavedRoomMessages(selectedRoom.id)}
            onSaveMessages={(messages) => handleSaveRoomMessages(selectedRoom.id, messages)}
          />
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full w-full bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading rooms...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state for debugging
  if (error) {
    return (
      <div className="h-full w-full bg-white dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-red-50 dark:bg-red-900/20">
          <div className="text-center p-4">
            <div className="text-red-500 dark:text-red-400 mb-2">⚠️ Error Loading Rooms</div>
            <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error.message}</p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/rooms"] })}
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
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
    <div className="h-full w-full bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">Chat Rooms</h1>
          <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />
                New Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  Create New Room
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateRoomOpen(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    placeholder="Enter room name..."
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room-description">Description</Label>
                  <Textarea
                    id="room-description"
                    placeholder="Enter room description..."
                    value={newRoomDescription}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Filter out forbidden text patterns in real-time
                      const filteredValue = value
                        .replace(/this room is managed by/gi, '')
                        .replace(/room is managed by/gi, '')
                        .replace(/managed by/gi, '');
                      setNewRoomDescription(filteredValue);
                    }}
                    maxLength={200}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="created-by">Created By</Label>
                  <Input
                    id="created-by"
                    value={user?.username || 'Unknown User'}
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    value="25 users"
                    disabled
                    className="bg-gray-100 dark:bg-gray-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateRoomOpen(false)}
                  disabled={createRoomMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRoom}
                  disabled={createRoomMutation.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
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
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No rooms found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}