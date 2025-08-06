
import { useState, useEffect } from "react";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { UserAvatar } from "@/components/user/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
  Shield
} from "lucide-react";

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
}

export function ChatRoom({ roomId, roomName, onUserClick, onLeaveRoom }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { sendChatMessage, joinRoom, isConnected, leaveRoom } = useWebSocket();
  const { user } = useAuth();

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
    console.log('ChatRoom useEffect:', { isConnected, roomId, roomName });
    
    if (isConnected && roomId && roomName) {
      console.log('Initializing chat room:', roomId);
      
      // Clear previous messages first
      setMessages([]);
      
      // Join room
      joinRoom(roomId);
      console.log('Joined room:', roomId);
      
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
      console.log('Set welcome messages for room:', roomId);
    } else {
      console.warn('ChatRoom not initialized - missing requirements:', { isConnected, roomId, roomName });
    }
    
    // Cleanup when roomId changes
    return () => {
      console.log('Cleaning up chat room:', roomId);
      setMessages([]);
      setIsUserListOpen(false);
    };
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
    if (roomId) {
      leaveRoom(roomId);
    }
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

  // Show loading if no room data or not connected
  if (!roomId || !roomName || !isConnected) {
    console.log('ChatRoom: Showing loading state:', { roomId, roomName, isConnected });
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
            <p className="text-gray-600">
              {!isConnected ? 'Connecting...' : 'Loading chat room...'}
            </p>
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

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 text-gray-600">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Hash className="w-5 h-5" />
                  <span>{roomName} Settings</span>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Room Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Info className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">Room Information</span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Room ID:</strong> {roomId}</p>
                    <p><strong>Members:</strong> {roomMembers?.length || 0}/25</p>
                    <p><strong>Status:</strong> Active</p>
                    <p><strong>Type:</strong> {roomId && ['1', '3'].includes(roomId) ? 'Official' : 'Community'}</p>
                  </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-orange-500" />
                      <span className="font-medium">Admin Actions</span>
                    </div>
                    
                    {/* Kick Users */}
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">Manage Users</span>
                          <p className="text-xs text-gray-500">Kick users from room</p>
                        </div>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserMinus className="w-4 h-4 mr-1" />
                              Kick
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="w-80">
                            <SheetHeader>
                              <SheetTitle>Kick User</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 space-y-3">
                              {roomMembers?.filter(member => member.user.id !== user?.id).map((member) => (
                                <div
                                  key={member.user.id}
                                  className="flex items-center justify-between p-2 rounded-lg border"
                                >
                                  <div className="flex items-center space-x-3">
                                    <UserAvatar 
                                      username={member.user.username}
                                      size="sm"
                                      isOnline={member.user.isOnline}
                                    />
                                    <div>
                                      <span className="font-medium text-sm">{member.user.username}</span>
                                      <p className="text-xs text-gray-500">Level {member.user.level}</p>
                                    </div>
                                  </div>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="sm">
                                        <UserMinus className="w-3 h-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Kick User</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to kick {member.user.username} from this room?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleKickUser(member.user.id, member.user.username)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Kick User
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              ))}
                              
                              {(!roomMembers || roomMembers.filter(m => m.user.id !== user?.id).length === 0) && (
                                <div className="text-center text-gray-500 py-4">
                                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">No other users to kick</p>
                                </div>
                              )}
                            </div>
                          </SheetContent>
                        </Sheet>
                      </div>
                    </div>

                    {/* Close Room */}
                    {roomId && !['1', '2', '3', '4'].includes(roomId) && (
                      <div className="p-3 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm text-red-700">Close Room</span>
                            <p className="text-xs text-red-500">Permanently close this room</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <X className="w-4 h-4 mr-1" />
                                Close
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Close Room</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently close "{roomName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleCloseRoom}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Close Room
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!isAdmin && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      You need admin privileges to access room management features.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
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
