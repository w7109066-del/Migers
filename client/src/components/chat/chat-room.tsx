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
      {/* Chat Room Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToRoomList}
            className="text-gray-600 hover:bg-gray-100 p-2"
          >
            ← Back
          </Button>
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
              <Button variant="ghost" size="sm" className="p-2 text-gray-600" aria-label="View room members">
                <Users className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80" aria-describedby="member-list-description">
              <SheetHeader>
                <SheetTitle>Room Members ({roomMembers?.length || 0})</SheetTitle>
                <div id="member-list-description" className="sr-only">
                  List of all members currently in this chat room with their online status and user actions
                </div>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                {isLoadingMembers ? (
                  <div className="text-center text-gray-500 py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm">Loading members...</p>
                  </div>
                ) : roomMembers && roomMembers.length > 0 ? (
                  roomMembers.map((member) => (
                    <ContextMenu key={member.user.id}>
                      <ContextMenuTrigger asChild>
                        <div 
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-200 group relative"
                          onClick={(e) => {
                            // Left click also opens context menu for mobile/touch devices
                            e.preventDefault();
                            console.log('Click on member:', member.user.username);
                          }}
                          onContextMenu={(e) => {
                            console.log('Right click on member:', member.user.username);
                            e.preventDefault();
                          }}
                          title={`Click for options: ${member.user.username}`}
                        >
                          <UserAvatar 
                            username={member.user.username}
                            size="sm"
                            isOnline={member.user.isOnline}
                            profilePhotoUrl={member.user.profilePhotoUrl}
                            isAdmin={member.user.isAdmin}
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-800">{member.user.username}</span>
                              {(member.role === 'admin' || member.user.level >= 5) && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                              {member.user.isAdmin && (
                                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Level {member.user.level} • {member.user.isOnline ? "Online" : "Offline"}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity text-sm text-gray-400 flex items-center space-x-1">
                            <span className="text-xs">Click</span>
                            <Settings className="w-3 h-3" />
                          </div>
                        </div>
                      </ContextMenuTrigger>
                    <ContextMenuContent className="w-64 text-base">
                      <ContextMenuGroup>
                        <ContextMenuItem 
                          onClick={() => handleViewProfile(member.user)}
                          className="py-3 px-4 text-base hover:bg-blue-50 focus:bg-blue-50"
                        >
                          <Eye className="w-5 h-5 mr-3 text-blue-600" />
                          <div className="flex flex-col">
                            <span>View Profile</span>
                            <span className="text-xs text-gray-500">Mini profile preview</span>
                          </div>
                        </ContextMenuItem>

                        <ContextMenuItem 
                          onClick={() => handleUserInfo(member.user.username)}
                          className="py-3 px-4 text-base hover:bg-green-50 focus:bg-green-50"
                        >
                          <Info className="w-5 h-5 mr-3 text-green-600" />
                          <div className="flex flex-col">
                            <span>User Info</span>
                            <span className="text-xs text-gray-500">Room information</span>
                          </div>
                        </ContextMenuItem>

                        <ContextMenuSeparator />

                        <ContextMenuItem 
                          onClick={() => handleChatUser(member.user)}
                          className="py-3 px-4 text-base hover:bg-purple-50 focus:bg-purple-50"
                        >
                          <MessageCircle className="w-5 h-5 mr-3 text-purple-600" />
                          <div className="flex flex-col">
                            <span>Private Chat</span>
                            <span className="text-xs text-gray-500">Send direct message</span>
                          </div>
                        </ContextMenuItem>
                      </ContextMenuGroup>

                      {/* Show kick option only for admins and not for current user */}
                      {isAdmin && member.user.id !== user?.id && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={() => handleKickUser(member.user.id, member.user.username)}
                            className="text-red-600 focus:text-red-600 hover:bg-red-50 focus:bg-red-50 py-3 px-4 text-base"
                          >
                            <UserMinus className="w-5 h-5 mr-3" />
                            <div className="flex flex-col">
                              <span>Kick User</span>
                              <span className="text-xs text-red-400">Remove from room</span>
                            </div>
                          </ContextMenuItem>
                        </>
                      )}

                      {/* Show leave option only for current user */}
                      {member.user.id === user?.id && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={handleLeaveRoom}
                            className="text-orange-600 focus:text-orange-600 hover:bg-orange-50 focus:bg-orange-50 py-3 px-4 text-base"
                          >
                            <X className="w-5 h-5 mr-3" />
                            <div className="flex flex-col">
                              <span>Leave Room</span>
                              <span className="text-xs text-orange-400">Disconnect from room</span>
                            </div>
                          </ContextMenuItem>
                        </>
                      )}

                      {/* Show report option for all users except current user */}
                      {member.user.id !== user?.id && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={() => handleReportUser(member.user)}
                            className="text-gray-600 focus:text-gray-600 hover:bg-gray-50 focus:bg-gray-50 py-3 px-4 text-base"
                          >
                            <Flag className="w-5 h-5 mr-3" />
                            <div className="flex flex-col">
                              <span>Report User</span>
                              <span className="text-xs text-gray-400">Report inappropriate behavior</span>
                            </div>
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members found</p>
                    {!isConnected && (
                      <p className="text-xs text-red-500 mt-2">
                        Connection lost - reconnecting...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2 text-gray-600" aria-label="Open room settings">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Hash className="w-5 h-5" />
                  <span>{roomName} Settings</span>
                </DialogTitle>
                <DialogDescription>
                  View and manage settings for the {roomName} room.
                </DialogDescription>
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
                                      profilePhotoUrl={member.user.profilePhotoUrl}
                                      isAdmin={member.user.isAdmin}
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