import { useState, useEffect } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuGroup, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, 
  Settings, 
  Hash,
  Info,
  UserMinus,
  X,
  Shield,
  MessageCircle,
  Eye,
  Flag,
  User,
  Crown,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatRoomProps {
  roomId?: string;
  roomName?: string;
  onUserClick: (profile: any) => void;
  onLeaveRoom?: () => void;
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
  role?: string;
}

export function ChatRoom({ roomId, roomName, onUserClick, onLeaveRoom }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { sendChatMessage, joinRoom, isConnected, leaveRoom } = useWebSocket();
  const { user } = useAuth();

  // Room members data
  const { data: roomMembers, refetch: refetchMembers, isLoading: isLoadingMembers } = useQuery<RoomMember[]>({
    queryKey: ["/api/rooms", roomId, "members"],
    enabled: Boolean(roomId),
    refetchInterval: 5000,
    staleTime: 2000,
    retry: 3,
    refetchOnWindowFocus: false
  });

  // Initialize room and messages
  useEffect(() => {
    console.log('ChatRoom useEffect:', { isConnected, roomId, roomName });

    if (roomId && roomName) {
      console.log('Initializing chat room:', roomId);

      // Clear previous messages first
      setMessages([]);

      // Set welcome messages immediately
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
      console.log('Set welcome messages for room:', roomId);

      // Join room if connected, or wait for connection
      if (isConnected) {
        joinRoom(roomId);
        console.log('Joined room:', roomId);
      }
    } else {
      console.warn('ChatRoom not initialized - missing roomId or roomName:', { roomId, roomName });
    }

    // Cleanup when roomId changes - but don't leave room on back navigation
    return () => {
      console.log('Cleaning up chat room:', roomId);
      setMessages([]);
      setIsUserListOpen(false);

      // Don't automatically leave room when component unmounts
      // Users should explicitly leave via the Leave Room option
    };
  }, [roomId, roomName, joinRoom]);

  // Separate effect for joining room when connection is established
  useEffect(() => {
    if (isConnected && roomId) {
      console.log('WebSocket connected, joining room:', roomId);
      // Add a small delay to prevent race conditions
      const timer = setTimeout(() => {
        joinRoom(roomId);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isConnected, roomId, joinRoom]);

  // Note: Removed the "Currently in the room" message to avoid chat spam when users join

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
        // Check if we already have a recent join message for this user to prevent duplicates
        const recentJoinMessages = messages.filter(msg => 
          msg.content.includes(`${username} has entered`) && 
          Date.now() - new Date(msg.createdAt).getTime() < 3000 // within 3 seconds
        );

        if (recentJoinMessages.length === 0) {
          const joinMessage = {
            id: `join-${Date.now()}-${username}`,
            content: `${username} has entered`,
            senderId: 'system',
            createdAt: new Date().toISOString(),
            sender: { id: 'system', username: 'System', level: 0, isOnline: true },
            messageType: 'system'
          };
          setMessages(prev => [...prev, joinMessage]);
        }
        setTimeout(() => refetchMembers(), 100);
      }
    };

    const handleUserLeave = (event: CustomEvent) => {
      const { username, roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId && username && username !== 'undefined') {
        // Check if we already have a recent leave message for this user to prevent duplicates
        const recentLeaveMessages = messages.filter(msg => 
          msg.content.includes(`${username} has left`) && 
          Date.now() - new Date(msg.createdAt).getTime() < 5000 // within 5 seconds
        );

        if (recentLeaveMessages.length === 0) {
          const leaveMessage = {
            id: `leave-${Date.now()}-${username}`,
            content: `${username} has left`,
            senderId: 'system',
            createdAt: new Date().toISOString(),
            sender: { id: 'system', username: 'System', level: 0, isOnline: true },
            messageType: 'system'
          };
          setMessages(prev => [...prev, leaveMessage]);
        }
        setTimeout(() => refetchMembers(), 100);
      }
    };

    const handleForceMemberRefresh = (event: CustomEvent) => {
      const { roomId: eventRoomId } = event.detail;
      if (eventRoomId === roomId) {
        console.log('Force refreshing member list for room:', roomId);
        refetchMembers();
      }
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('userJoined', handleUserJoin as EventListener);
    window.addEventListener('userLeft', handleUserLeave as EventListener);
    window.addEventListener('forceMemberRefresh', handleForceMemberRefresh as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('userJoined', handleUserJoin as EventListener);
      window.removeEventListener('userLeft', handleUserLeave as EventListener);
      window.removeEventListener('forceMemberRefresh', handleForceMemberRefresh as EventListener);
    };
  }, [roomId, refetchMembers]);

  const handleSendMessage = (content: string) => {
    if (roomId) {
      sendChatMessage(content, roomId);
    }
  };

  const handleChatUser = (user: any) => {
    console.log('Opening private chat with:', user.username);
    // Open DM chat without disconnecting from room
    if (onUserClick) {
      onUserClick({
        id: user.id,
        username: user.username,
        level: user.level,
        status: "Available for chat",
        isOnline: user.isOnline,
      });
    }
  };

  const handleViewProfile = (user: any) => {
    // Open mini profile modal
    console.log('Opening mini profile for:', user.username);
    if (onUserClick) {
      onUserClick({
        id: user.id,
        username: user.username,
        level: user.level,
        status: "Available for chat",
        isOnline: user.isOnline,
        profilePhotoUrl: user.profilePhotoUrl,
        country: user.country,
        bio: user.bio,
        showMiniProfile: true // Flag to show mini profile instead of chat
      });
    }
  };

  const handleUserInfo = (username: string) => {
    // Send enhanced whois command with room context
    if (roomId) {
      // Send whois command that will show user info in room context
      sendChatMessage(`/whois ${username}`, roomId);

      // Also show room-specific information
      const roomInfoMessage = {
        id: `room-info-${Date.now()}`,
        content: `🏠 Room: ${roomName} | 👥 Members: ${roomMembers?.length || 0}/25 | 🎯 Viewing info for: ${username}`,
        senderId: 'system',
        roomId: roomId,
        recipientId: null,
        messageType: 'system',
        createdAt: new Date().toISOString(),
        sender: {
          id: 'system',
          username: 'System',
          level: 0,
          isOnline: true,
        }
      };

      // Dispatch event to show room info message
      window.dispatchEvent(new CustomEvent('newMessage', {
        detail: roomInfoMessage
      }));
    }
  };

  // Listen for whois commands from message list
  useEffect(() => {
    const handleWhoisCommand = (event: CustomEvent) => {
      const { content, roomId: commandRoomId } = event.detail;
      if (commandRoomId === roomId || !commandRoomId) {
        sendChatMessage(content, roomId);
      }
    };

    window.addEventListener('sendWhoisCommand', handleWhoisCommand as EventListener);

    return () => {
      window.removeEventListener('sendWhoisCommand', handleWhoisCommand as EventListener);
    };
  }, [roomId, sendChatMessage]);

  const handleReportUser = (user: any) => {
    // Handle user reporting
    console.log('Report user:', user.username);
    // You can implement reporting functionality here
  };

  const handleKickUser = async (userId: string, username: string) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/kick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        // Show success message
        const kickMessage = {
          id: `kick-${Date.now()}`,
          content: `${username} has been kicked from the room`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, kickMessage]);
      }
    } catch (error) {
      console.error('Failed to kick user:', error);
    }
  };

  const handleLeaveRoom = () => {
    // Show confirmation before leaving
    const confirmLeave = window.confirm(`Are you sure you want to leave ${roomName}?`);
    if (confirmLeave) {
      if (roomId) {
        leaveRoom(roomId);
      }
      if (onLeaveRoom) {
        onLeaveRoom();
      }
    }
  };

  const handleBackToRoomList = () => {
    // Just navigate back without disconnecting from room
    if (onLeaveRoom) {
      onLeaveRoom();
    }
  };

  const handleCloseRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        leaveRoom(roomId);
        // Navigate back or show success message
        window.history.back();
      }
    } catch (error) {
      console.error('Failed to close room:', error);
    }
  };

  // Check if current user is admin/moderator
  const isAdmin = user?.level >= 5; // Assuming level 5+ are admins

  // More lenient loading check - only require roomId and roomName
  if (!roomId || !roomName) {
    console.log('ChatRoom: Missing required props:', { roomId, roomName, isConnected });
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header placeholder */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-center flex-shrink-0">
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Loading content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-gray-600">Loading chat room...</p>
            <p className="text-xs text-gray-500 mt-2">Room ID: {roomId || 'Missing'}</p>
            <p className="text-xs text-gray-500">Room Name: {roomName || 'Missing'}</p>
            <p className="text-xs text-gray-500">Connected: {isConnected ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  console.log('ChatRoom: Rendering main component', { roomId, roomName, isConnected, messagesCount: messages.length });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          onUserClick={handleChatUser} 
          roomName={roomName}
          isAdmin={isAdmin}
          currentUserId={user?.id}
        />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0">
        <MessageInput onSendMessage={handleSendMessage} roomId={roomId} />
      </div>


    </div>
  );
}