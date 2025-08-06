
import { useState, useEffect } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Settings, 
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
  messageType?: string;
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
  const { sendChatMessage, joinRoom, isConnected } = useWebSocket();

  // Room members data
  const { data: roomMembers, refetch: refetchMembers } = useQuery<RoomMember[]>({
    queryKey: ["/api/rooms", roomId, "members"],
    enabled: Boolean(isConnected && roomId),
    refetchInterval: 3000,
    staleTime: 1000,
    retry: 1
  });

  // Initialize room and messages
  useEffect(() => {
    if (isConnected && roomId && roomName) {
      // Join room
      joinRoom(roomId);
      
      // Set welcome messages
      const welcomeMessages = [
        {
          id: `welcome-${roomId}`,
          content: `Welcome to ${roomName} official chat room.`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        },
        {
          id: `room-managed-${roomId}`,
          content: `This room is managed by ${roomName.toLowerCase()}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        }
      ];
      
      setMessages(welcomeMessages);
    }
  }, [isConnected, roomId, roomName, joinRoom]);

  // Update room members message
  useEffect(() => {
    if (roomMembers && roomMembers.length > 0 && roomId) {
      const memberNames = roomMembers
        .map(m => m.user.username)
        .sort((a, b) => a.localeCompare(b))
        .join(', ');
      
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== `room-info-${roomId}`);
        return [
          ...filtered,
          {
            id: `room-info-${roomId}`,
            content: `Currently in the room: ${memberNames} (${roomMembers.length} users)`,
            senderId: 'system',
            createdAt: new Date().toISOString(),
            sender: { id: 'system', username: 'System', level: 0, isOnline: true },
            messageType: 'system'
          }
        ];
      });
    }
  }, [roomMembers, roomId]);

  // WebSocket event listeners
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      if (newMessage.roomId === roomId) {
        setMessages(prev => [...prev, newMessage]);
      }
    };

    const handleUserJoin = (event: CustomEvent) => {
      const { username, roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId && username && username !== 'undefined') {
        const joinMessage = {
          id: `join-${Date.now()}-${username}`,
          content: `${username} has entered`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, joinMessage]);
        setTimeout(() => refetchMembers(), 100);
      }
    };

    const handleUserLeave = (event: CustomEvent) => {
      const { username, roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId && username && username !== 'undefined') {
        const leaveMessage = {
          id: `leave-${Date.now()}-${username}`,
          content: `${username} has left`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, leaveMessage]);
        setTimeout(() => refetchMembers(), 100);
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
  }, [roomId, refetchMembers]);

  const handleSendMessage = (content: string) => {
    if (roomId) {
      sendChatMessage(content, roomId);
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

  // Show loading if no room data
  if (!roomId || !roomName) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Loading chat room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Chat Room Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Hash className="text-white text-sm" />
          </div>
          <div>
            <div className="font-semibold text-gray-800">{roomName}</div>
            <div className="text-xs text-gray-500">
              {roomMembers?.length || 0}/25 users online
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

                {(!roomMembers || roomMembers.length === 0) && (
                  <div className="text-center text-gray-500 py-4">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members found</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

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
      <div className="flex-shrink-0">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
    </div>
  );
}
