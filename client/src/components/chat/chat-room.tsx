import { useState, useEffect } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Gift, 
  Settings, 
  X, 
  Hash 
} from "lucide-react";

interface ChatRoomProps {
  roomId?: string;
  roomName?: string;
  onUserClick: (profile: any) => void;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    level: number;
    isOnline: boolean;
  };
}

interface RoomMember {
  user: {
    id: string;
    username: string;
    level: number;
    isOnline: boolean;
  };
}

export function ChatRoom({ roomId, roomName, onUserClick }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const { sendChatMessage, joinRoom, isConnected } = useWebSocket();

  // Fetch available rooms first
  const { data: availableRooms } = useQuery<any[]>({
    queryKey: ["/api/rooms"],
    enabled: Boolean(isConnected),
  });

  // Mock room messages for now
  const { data: roomMessages } = useQuery<Message[]>({
    queryKey: ["/api/rooms", currentRoom?.id, "messages"],
    enabled: Boolean(isConnected && currentRoom?.id),
    queryFn: () => {
      // Return empty messages initially - server will send welcome message
      return Promise.resolve([]);
    }
  });

  // Room members data
  const { data: roomMembers, refetch: refetchMembers } = useQuery<RoomMember[]>({
    queryKey: ["/api/rooms", currentRoom?.id, "members"],
    enabled: Boolean(isConnected && currentRoom?.id),
    refetchInterval: 2000, // Refetch every 2 seconds for faster updates
    staleTime: 0, // Always consider data stale to ensure fresh updates
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Set up room from props or use first available room
  useEffect(() => {
    if (roomId && roomName) {
      setCurrentRoom({ id: roomId, name: roomName });
    } else if (availableRooms && availableRooms.length > 0) {
      setCurrentRoom(availableRooms[0]);
    }
  }, [roomId, roomName, availableRooms]);

  useEffect(() => {
    if (roomMessages) {
      setMessages(roomMessages);
    }
  }, [roomMessages]);

  useEffect(() => {
    if (isConnected && currentRoom?.id) {
      joinRoom(currentRoom.id);
      
      // Clear previous messages and add welcome messages only once
      const welcomeMessages = [
        {
          id: `welcome-${currentRoom.id}`,
          content: `Welcome to ${currentRoom.name} official chat room.`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        },
        {
          id: `room-managed-${currentRoom.id}`,
          content: `This room is managed by ${currentRoom.name.toLowerCase()}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        }
      ];
      
      setMessages(welcomeMessages);
    }
  }, [isConnected, joinRoom, currentRoom?.id]);

  // Update the "Currently in the room" message when members change
  useEffect(() => {
    if (roomMembers && roomMembers.length > 0 && currentRoom?.id) {
      setMessages(prev => {
        // Check if room info message already exists
        const hasRoomInfo = prev.some(msg => msg.id === `room-info-${currentRoom.id}`);
        
        const memberNames = roomMembers
          .map(m => m.user.username)
          .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
          .join(', ');
        
        if (hasRoomInfo) {
          // Update existing room info message
          return prev.map(msg => 
            msg.id === `room-info-${currentRoom.id}` 
              ? {
                  ...msg,
                  content: `Currently in the room: ${memberNames} (${roomMembers.length} users)`
                }
              : msg
          );
        } else {
          // Add new room info message
          return [
            ...prev,
            {
              id: `room-info-${currentRoom.id}`,
              content: `Currently in the room: ${memberNames} (${roomMembers.length} users)`,
              senderId: 'system',
              createdAt: new Date().toISOString(),
              sender: { id: 'system', username: 'System', level: 0, isOnline: true },
              messageType: 'system'
            }
          ];
        }
      });
    } else if (currentRoom?.id) {
      // If no members, remove room info message
      setMessages(prev => prev.filter(msg => msg.id !== `room-info-${currentRoom.id}`));
    }
  }, [roomMembers, currentRoom?.id]);

  useEffect(() => {
    // Listen for new messages
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      if (newMessage.roomId === currentRoom?.id) {
        setMessages(prev => [...prev, newMessage]);
      }
    };

    // Listen for user join/leave events
    const handleUserJoin = (event: CustomEvent) => {
      const { username, roomId } = event.detail;
      if (roomId === currentRoom?.id && username && username !== 'undefined') {
        const joinMessage = {
          id: `join-${Date.now()}-${username}`,
          content: `${username} has entered`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, joinMessage]);
        
        // Force immediate refetch with invalidation
        setTimeout(() => {
          refetchMembers();
        }, 100);
      }
    };

    const handleUserLeave = (event: CustomEvent) => {
      const { username, roomId } = event.detail;
      if (roomId === currentRoom?.id && username && username !== 'undefined') {
        const leaveMessage = {
          id: `leave-${Date.now()}-${username}`,
          content: `${username} has left`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, leaveMessage]);
        
        // Force immediate refetch with invalidation  
        setTimeout(() => {
          refetchMembers();
        }, 100);
      }
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('userJoined', handleUserJoin as EventListener);
    window.addEventListener('userLeft', handleUserLeave as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('userJoined', handleUserJoin as EventListener);
      window.removeEventListener('userLeft', handleUserLeave as EventListener);
    };
  }, [currentRoom?.id]);

  const handleSendMessage = (content: string) => {
    if (currentRoom?.id) {
      sendChatMessage(content, currentRoom.id);
    }
  };

  const handleUserClick = (user: any) => {
    onUserClick({
      id: user.id,
      username: user.username,
      level: user.level,
      status: "Available for chat",
      isOnline: user.isOnline,
    });
  };

  // If no rooms available, show message
  if (!currentRoom) {
    return (
      <div className="h-full flex flex-col bg-gray-50 items-center justify-center">
        <div className="text-center p-8">
          <Hash className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Chat Rooms Available</h3>
          <p className="text-gray-500">Chat rooms will appear here when available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat Room Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Hash className="text-white text-sm" />
          </div>
          <div>
            <div className="font-semibold text-gray-800">{currentRoom.name}</div>
            <div className="text-xs text-gray-500">
              {roomMembers?.length || 0} users online
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Sheet open={isUserListOpen} onOpenChange={setIsUserListOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 text-gray-600">
                <Users className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Room Members ({roomMembers?.length || 0})</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {roomMembers?.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleUserClick(member.user)}
                  >
                    <UserAvatar 
                      username={member.user.username}
                      size="sm"
                      isOnline={member.user.isOnline}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-800">{member.user.username}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.user.isOnline ? "Online" : "Offline"}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Show message if no members found */}
                {(!roomMembers || roomMembers.length === 0) && (
                  <div className="text-center text-gray-500 py-4">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members found</p>
                    <p className="text-xs">Members will appear here when they join</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="sm" className="p-2 text-gray-600">
            <Gift className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" className="p-2 text-gray-600">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} onUserClick={handleUserClick} />
      </div>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}