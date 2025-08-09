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
  UserMinus,
  X,
  Shield,
  MessageCircle,
  Eye,
  Flag,
  User,
  Crown,
  LogOut,
  EyeOff,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatRoomProps {
  roomId?: string;
  roomName?: string;
  onUserClick: (profile: any) => void;
  onLeaveRoom?: () => void;
  savedMessages?: any[];
  onSaveMessages?: (messages: any[]) => void;
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

export function ChatRoom({ roomId, roomName, onUserClick, onLeaveRoom, savedMessages = [], onSaveMessages }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [voteKicks, setVoteKicks] = useState<Map<string, Set<string>>>(new Map()); // userId -> Set of voter IDs
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const { sendChatMessage, joinRoom, isConnected, leaveRoom } = useWebSocket();
  const { user } = useAuth();

  // State for active kick votes and their timers
  const [activeKickVotes, setActiveKickVotes] = useState<{ [key: string]: { voters: Set<string>; remainingTime: number; targetUser: any } }>({});
  const kickVoteDuration = 60; // seconds

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
    console.log('ChatRoom useEffect:', { isConnected, roomId, roomName, savedMessagesCount: savedMessages.length });

    if (roomId && roomName) {
      console.log('Initializing chat room:', roomId);

      // Check if we have saved messages for this room
      if (savedMessages.length > 0) {
        console.log('Restoring saved messages for room:', roomId, savedMessages.length);
        setMessages(savedMessages);
      } else {
        // Set welcome messages for new room entry
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
      }

      // Join room if connected, or wait for connection
      if (isConnected) {
        joinRoom(roomId);
        console.log('Joined room:', roomId);
      }
    } else {
      console.warn('ChatRoom not initialized - missing roomId or roomName:', { roomId, roomName });
    }

    // Cleanup when roomId changes - save messages before cleanup
    return () => {
      console.log('Cleaning up chat room:', roomId);
      
      // Save current messages before cleanup
      if (onSaveMessages && roomId && messages.length > 0) {
        console.log('Saving messages for room:', roomId, messages.length);
        onSaveMessages(messages);
      }
      
      setIsUserListOpen(false);

      // Don't automatically leave room when component unmounts
      // Users should explicitly leave via the Leave Room option
    };
  }, [roomId, roomName, joinRoom, savedMessages.length]);

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

  // Timer effect for kick votes
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveKickVotes(prevVotes => {
        const updatedVotes = { ...prevVotes };
        let changed = false;
        for (const userId in updatedVotes) {
          updatedVotes[userId].remainingTime--;
          if (updatedVotes[userId].remainingTime <= 0) {
            // Vote expired
            const kickMessage = {
              id: `kick-fail-${Date.now()}-${updatedVotes[userId].targetUser.username}`,
              content: `A kick vote for ${updatedVotes[userId].targetUser.username} has failed (timed out).`,
              senderId: 'system',
              createdAt: new Date().toISOString(),
              sender: { id: 'system', username: 'System', level: 0, isOnline: true },
              messageType: 'system'
            };
            setMessages(prev => [...prev, kickMessage]);
            delete updatedVotes[userId];
            changed = true;
          } else {
            // Update remaining time text
            if (updatedVotes[userId].remainingTime === 20 || updatedVotes[userId].remainingTime === 10 || updatedVotes[userId].remainingTime === 5) {
              const timerMessage = {
                id: `kick-timer-${Date.now()}-${userId}`,
                content: `${updatedVotes[userId].remainingTime}s remaining`,
                senderId: 'system',
                createdAt: new Date().toISOString(),
                sender: { id: 'system', username: 'System', level: 0, isOnline: true },
                messageType: 'system'
              };
              setMessages(prev => [...prev, timerMessage]);
            }
          }
        }
        return changed ? updatedVotes : prevVotes;
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [setMessages]); // Include setMessages in dependency array

  // Note: Removed the "Currently in the room" message to avoid chat spam when users join

  // WebSocket event listeners
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const newMessage = event.detail;
      if (newMessage.roomId === roomId) {
        // Don't show messages from blocked users
        if (blockedUsers.has(newMessage.senderId)) {
          return;
        }
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

    const handleUserKicked = (event: CustomEvent) => {
      const { username, roomId: eventRoomId, kickedBy } = event.detail;
      if (eventRoomId === roomId) {
        const kickMessage = {
          id: `kick-${Date.now()}-${username}`,
          content: `${username} was kicked from the room by ${kickedBy}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, kickMessage]);
        setTimeout(() => refetchMembers(), 100);
      }
    };

    const handleForcedLeave = (event: CustomEvent) => {
      const { roomId: eventRoomId, reason } = event.detail;
      if (eventRoomId === roomId) {
        alert(reason);
        if (onLeaveRoom) {
          onLeaveRoom();
        }
      }
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('userJoined', handleUserJoin as EventListener);
    window.addEventListener('userLeft', handleUserLeave as EventListener);
    window.addEventListener('forceMemberRefresh', handleForceMemberRefresh as EventListener);
    window.addEventListener('userKicked', handleUserKicked as EventListener);
    window.addEventListener('forcedLeaveRoom', handleForcedLeave as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('userJoined', handleUserJoin as EventListener);
      window.removeEventListener('userLeft', handleUserLeave as EventListener);
      window.removeEventListener('forceMemberRefresh', handleForceMemberRefresh as EventListener);
      window.removeEventListener('userKicked', handleUserKicked as EventListener);
      window.removeEventListener('forcedLeaveRoom', handleForcedLeave as EventListener);
    };
  }, [roomId, refetchMembers, messages, blockedUsers]); // Added messages and blockedUsers to dependencies

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

  // Kick command handler
  const handleKickCommand = async (targetUsername: string) => { // Added async keyword
    const targetUser = roomMembers?.find(member => member.user.username.toLowerCase() === targetUsername.toLowerCase())?.user;

    if (!targetUser) {
      const systemMessage = {
        id: `kick-error-${Date.now()}`,
        content: `User "${targetUsername}" not found in this room.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      return;
    }

    if (targetUser.id === user?.id) {
      const systemMessage = {
        id: `kick-error-${Date.now()}`,
        content: `You cannot kick yourself.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      return;
    }

    // Prevent kicking admin users
    if (targetUser.level >= 5) {
      const errorMessage = {
        id: `kick-error-${Date.now()}`,
        content: `❌ Cannot kick admin users.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }


    // Check if a kick vote is already active for this user
    if (activeKickVotes[targetUser.id]) {
      const systemMessage = {
        id: `kick-info-${Date.now()}`,
        content: `A kick vote for ${targetUsername} is already in progress.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, systemMessage]);
      return;
    }

    // Start a new kick vote
    const newKickVote = {
      voters: new Set<string>([user!.id]),
      remainingTime: kickVoteDuration,
      targetUser: targetUser,
    };

    setActiveKickVotes(prev => ({
      ...prev,
      [targetUser.id]: newKickVote,
    }));

    const voteStartMessage = {
      id: `kick-start-${Date.now()}-${targetUser.id}`,
      content: `A vote to kick ${targetUsername} has been started by ${user!.username}. ${Math.ceil((roomMembers?.length || 1) / 2)} more votes needed. ${kickVoteDuration}s remaining`,
      senderId: 'system',
      createdAt: new Date().toISOString(),
      sender: { id: 'system', username: 'System', level: 0, isOnline: true },
      messageType: 'system'
    };
    setMessages(prev => [...prev, voteStartMessage]);
  };


  const handleVoteKick = async (targetUserId: string) => {
    if (!user?.id || !roomId) return;

    try {
      const activeVote = activeKickVotes[targetUserId];
      if (!activeVote) return; // No active vote

      if (activeVote.voters.has(user.id)) {
        // Remove vote
        activeVote.voters.delete(user.id);
        const voteRemovedMessage = {
          id: `vote-removed-${Date.now()}`,
          content: `${user.username} removed their kick vote for ${activeVote.targetUser.username}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, voteRemovedMessage]);
      } else {
        // Add vote
        activeVote.voters.add(user.id);
        const voteAddedMessage = {
          id: `vote-kick-${Date.now()}`,
          content: `${user.username} voted to kick ${activeVote.targetUser.username} (${activeVote.voters.size}/${Math.ceil((roomMembers?.length || 1) / 2)} votes needed)`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, voteAddedMessage]);
      }

      // Update vote state
      const newActiveKickVotes = { ...activeKickVotes, [targetUserId]: activeVote };
      setActiveKickVotes(newActiveKickVotes);

      // Check if enough votes to kick (majority)
      const requiredVotes = Math.ceil((roomMembers?.length || 1) / 2);
      if (activeVote.voters.size >= requiredVotes) {
        // Execute kick
        await handleKickUser(activeVote.targetUser.id, activeVote.targetUser.username);
        // Clean up the active vote
        const { [targetUserId]: _, ...rest } = newActiveKickVotes;
        setActiveKickVotes(rest);
      }

    } catch (error) {
      console.error('Failed to vote kick:', error);
    }
  };

  const handleBlockUser = (targetUser: any) => {
    const newBlockedUsers = new Set(blockedUsers);
    if (newBlockedUsers.has(targetUser.id)) {
      newBlockedUsers.delete(targetUser.id);
      const blockMessage = {
        id: `unblock-${Date.now()}`,
        content: `You have unblocked ${targetUser.username}`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, blockMessage]);
    } else {
      newBlockedUsers.add(targetUser.id);
      const blockMessage = {
        id: `block-${Date.now()}`,
        content: `You have blocked ${targetUser.username}. You will no longer see their messages.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, blockMessage]);
    }
    setBlockedUsers(newBlockedUsers);
  };

  const handleReportUser = async (targetUser: any) => {
    try {
      const reportMessage = `🚨 REPORT: User ${user?.username} reported ${targetUser.username} in room ${roomName} (${roomId}). Please investigate.`;

      // Send report to admin chat (assuming admin room ID is 'admin' or '1')
      const response = await fetch('/api/admin/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: targetUser.id,
          reportedUsername: targetUser.username,
          reporterUserId: user?.id,
          reporterUsername: user?.username,
          roomId: roomId,
          roomName: roomName,
          message: reportMessage
        })
      });

      if (response.ok) {
        const confirmMessage = {
          id: `report-${Date.now()}`,
          content: `Report sent to administrators for ${targetUser.username}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, confirmMessage]);
      }
    } catch (error) {
      console.error('Failed to report user:', error);
    }
  };

  const handleRoomInfo = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/info`);
      if (response.ok) {
        const roomData = await response.json();
        // setRoomInfo(roomData); // Removed as roomInfo state is removed

        const infoMessage = {
          id: `room-info-${Date.now()}`,
          content: `🏠 Room: ${roomData.name} | 👤 Creator: ${roomData.createdBy || 'System'} | 📅 Created: ${new Date(roomData.createdAt).toLocaleDateString()} | 👥 Members: ${roomMembers?.length || 0}/${roomData.capacity || 25}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, infoMessage]);
      }
    } catch (error) {
      console.error('Failed to get room info:', error);
    }
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
        setTimeout(() => refetchMembers(), 100); // Refresh members after kick
      } else {
        const errorMessage = await response.json();
        const kickFailMessage = {
          id: `kick-fail-${Date.now()}`,
          content: `Failed to kick ${username}: ${errorMessage.message || 'Unknown error'}`,
          senderId: 'system',
          createdAt: new Date().toISOString(),
          sender: { id: 'system', username: 'System', level: 0, isOnline: true },
          messageType: 'system'
        };
        setMessages(prev => [...prev, kickFailMessage]);
      }
    } catch (error) {
      console.error('Failed to kick user:', error);
      const kickFailMessage = {
        id: `kick-fail-${Date.now()}`,
        content: `An error occurred while trying to kick ${username}.`,
        senderId: 'system',
        createdAt: new Date().toISOString(),
        sender: { id: 'system', username: 'System', level: 0, isOnline: true },
        messageType: 'system'
      };
      setMessages(prev => [...prev, kickFailMessage]);
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
    // Save current messages before navigating back
    if (onSaveMessages && roomId && messages.length > 0) {
      console.log('Saving messages before navigating back:', roomId, messages.length);
      onSaveMessages(messages);
    }
    
    // Navigate back to room list without leaving room or disconnecting
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <UserAvatar
            username={roomName}
            size="sm"
            isOnline={true}
          />
          <div>
            <h2 className="font-semibold text-gray-800">{roomName}</h2>
            <p className="text-xs text-gray-500">
              {roomMembers?.length || 0} member{(roomMembers?.length || 0) !== 1 ? 's' : ''} online
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Member List Button */}
          <Sheet open={isUserListOpen} onOpenChange={setIsUserListOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Users className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Room Members ({roomMembers?.length || 0})</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                {isLoadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : roomMembers && roomMembers.length > 0 ? (
                  roomMembers.map((member) => (
                    <ContextMenu key={member.user.id}>
                      <ContextMenuTrigger>
                        <Card className="p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-center space-x-3">
                            <UserAvatar
                              username={member.user.username}
                              size="sm"
                              isOnline={member.user.isOnline}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={cn(
                                  "font-medium text-sm truncate",
                                  // Apply special colors - Admin visible in all rooms
                                  member.role === 'admin' || member.user.level >= 5 ? "text-orange-700" :
                                  // Owner and moderator colors only in managed rooms (not system rooms 1-4)
                                  !['1', '2', '3', '4'].includes(roomId || '') ? (
                                    (member.role === 'owner' || member.user.username.toLowerCase() === roomName?.toLowerCase()) ? "text-yellow-500" :
                                    (member.user.level >= 3 && member.user.level < 5) ? "text-amber-600" : "text-blue-600"
                                  ) : "text-blue-600"
                                )}>
                                  {member.user.username}
                                </span>
                                {/* Crown only for owner in managed rooms */}
                                {(member.role === 'owner' || member.user.username.toLowerCase() === roomName?.toLowerCase()) && !['1', '2', '3', '4'].includes(roomId || '') && (
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                )}
                                {(member.role === 'admin' || member.user.level >= 5) && (
                                  <Badge variant="destructive" className="text-xs bg-red-600">
                                    Admin
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  Level {member.user.level}
                                </Badge>
                                {member.user.isOnline && (
                                  <span className="text-xs text-green-600">Online</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuGroup>
                          <ContextMenuItem onClick={() => handleViewProfile(member.user)}>
                            <User className="w-4 h-4 mr-2" />
                            View Profile
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleChatUser(member.user)}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Send Message
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleUserInfo(member.user.username)}>
                            <Info className="w-4 h-4 mr-2" />
                            User Info
                          </ContextMenuItem>
                        </ContextMenuGroup>
                        {member.user.id !== user?.id && (
                          <>
                            <ContextMenuSeparator />
                            <ContextMenuGroup>
                              <ContextMenuItem
                                onClick={() => handleKickUser(member.user.username)} // Pass username to handleKickUser
                                className="text-red-600"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Kick User
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => handleVoteKick(member.user.id)}
                                className="text-orange-600"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Vote Kick
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => handleBlockUser(member.user)}
                                className="text-red-600"
                              >
                                {blockedUsers.has(member.user.id) ? (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Unblock User
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Block User
                                  </>
                                )}
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => handleReportUser(member.user)}
                                className="text-yellow-600"
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                Report User
                              </ContextMenuItem>
                            </ContextMenuGroup>
                          </>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuGroup>
                          <ContextMenuItem onClick={() => handleRoomInfo()}>
                            <Info className="w-4 h-4 mr-2" />
                            Room Info
                          </ContextMenuItem>
                        </ContextMenuGroup>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No members found</p>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Settings Button */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Room Settings</DialogTitle>
                <DialogDescription>
                  Manage room settings and preferences
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Room Information</span>
                  <Badge variant="outline">
                    <Hash className="w-3 h-3 mr-1" />
                    {roomName}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleBackToRoomList}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Back to Room List
                  </Button>

                  {/* Kick User Menu - Only for level 1+ users */}
                  {(user?.level || 0) >= 1 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-orange-600 hover:text-orange-700">
                          <UserMinus className="w-4 h-4 mr-2" />
                          Kick User
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right" className="w-80">
                        <SheetHeader>
                          <SheetTitle>Kick User from Room</SheetTitle>
                        </SheetHeader>
                        <div className="mt-4 space-y-2">
                          {isLoadingMembers ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          ) : roomMembers && roomMembers.length > 0 ? (
                            roomMembers
                              .filter(member => member.user.id !== user?.id) // Don't show current user
                              .map((member) => (
                                <Card key={member.user.id} className="p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <UserAvatar
                                        username={member.user.username}
                                        size="sm"
                                        isOnline={member.user.isOnline}
                                      />
                                      <div>
                                        <div className="flex items-center space-x-2">
                                          <span className={cn(
                                            "font-medium text-sm truncate",
                                            // Apply special colors - Admin visible in all rooms
                                            member.role === 'admin' || member.user.level >= 5 ? "text-orange-700" :
                                            // Owner and moderator colors only in managed rooms (not system rooms 1-4)
                                            !['1', '2', '3', '4'].includes(roomId || '') ? (
                                              (member.role === 'owner' || member.user.username.toLowerCase() === roomName?.toLowerCase()) ? "text-yellow-500" :
                                              (member.user.level >= 3 && member.user.level < 5) ? "text-amber-600" : ""
                                            ) : ""
                                          )}>
                                            {member.user.username}
                                          </span>
                                          {/* Crown only for owner in managed rooms */}
                                          {(member.role === 'owner' || member.user.username.toLowerCase() === roomName?.toLowerCase()) && !['1', '2', '3', '4'].includes(roomId || '') && (
                                            <Crown className="w-3 h-3 text-yellow-500" />
                                          )}
                                          {(member.role === 'admin' || member.user.level >= 5) && (
                                            <Badge variant="destructive" className="text-xs bg-red-600">
                                              Admin
                                            </Badge>
                                          )}
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          Level {member.user.level}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      {/* Vote Kick Button */}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs text-orange-600 hover:bg-orange-50"
                                        onClick={() => handleVoteKick(member.user.id)}
                                      >
                                        Vote Kick
                                      </Button>
                                      {/* Direct Kick Button - Only for admins (level 1+) */}
                                      {(user?.level || 0) >= 1 && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              className="text-xs"
                                            >
                                              Kick
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Kick User</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to kick {member.user.username} from {roomName}?
                                                This action will immediately remove them from the room.
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
                                      )}
                                    </div>
                                  </div>
                                </Card>
                              ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>No other members found</p>
                            </div>
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                        <LogOut className="w-4 h-4 mr-2" />
                        Leave Room
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Room</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave {roomName}? You will need to rejoin to continue chatting.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLeaveRoom} className="bg-red-600 hover:bg-red-700">
                          Leave Room
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {isAdmin && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full justify-start">
                          <X className="w-4 h-4 mr-2" />
                          Close Room
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Close Room</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to close {roomName}? This action cannot be undone and will remove all members.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCloseRoom} className="bg-red-600 hover:bg-red-700">
                            Close Room
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
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