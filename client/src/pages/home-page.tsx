import { useState, useEffect } from "react";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { WebSocketProvider, useWebSocket } from "@/hooks/use-websocket";
import { NotificationProvider, useNotifications } from "@/hooks/use-notifications";
import { SwipeTabs } from "@/components/ui/swipe-tabs";
import { FriendsList } from "@/components/friends/friends-list";
import { ChatRoom } from "@/components/chat/chat-room";
import { DirectMessageChat } from "@/components/chat/direct-message-chat";
import { DMConversationsList } from "@/components/chat/dm-conversations-list";
import RoomListPage from "@/pages/room-list";
import { UserAvatar } from "@/components/user/user-avatar";
import { MiniProfileModal } from "@/components/ui/mini-profile-modal";
import { NotificationDropdown } from "@/components/ui/notification-dropdown";
import { EditProfileModal } from "@/components/ui/edit-profile-modal";
import { UserSearchModal } from "@/components/ui/user-search-modal";
import { StatusUpdateModal } from "@/components/ui/status-update-modal";

import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CreditsPage } from "@/pages/credits-page";
import { MentorPage } from "@/pages/mentor-page";
import { AdminPage } from "@/pages/admin-page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  MessageCircle,
  Newspaper,
  Mail,
  Settings,
  Search,
  Edit,
  Bell,
  Moon,
  Shield,
  HelpCircle,
  LogOut,
  Heart,
  Share2,
  Image,
  Video,
  X,
  ChevronDown,
  Send,
  Smile,
  RefreshCw,
  Hash
} from "lucide-react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';

interface MiniProfileData {
  id: string;
  username: string;
  level: number;
  status: string;
  isOnline: boolean;
  country?: string;
  profilePhotoUrl?: string;
  bio?: string;
  fansCount?: number;
  followingCount?: number;
  isFriend?: boolean;
}

function HomePageContent() {
  const { user, logout, isLoading: authLoading, isDarkMode, toggleDarkMode } = useAuth();
  const {
    sendChatMessage,
    joinRoom,
    leaveRoom,
    isConnected,
    connectionStatus,
    retryConnection
  } = useWebSocket();
  const { notifications, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProfile, setSelectedProfile] = useState<MiniProfileData | null>(null);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  
  const [selectedRoom, setSelectedRoom] = useState<{ id: string; name: string } | null>(null);
  const [selectedDirectMessage, setSelectedDirectMessage] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showMentor, setShowMentor] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [userStatus, setUserStatus] = useState(user?.status || 'online');
  const [postContent, setPostContent] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [userLikes, setUserLikes] = useState<{[postId: string]: boolean}>({});
  const [likeCounts, setLikeCounts] = useState<{[postId: string]: number}>({});
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [postComments, setPostComments] = useState<{[postId: string]: any[]}>({});
  const [commentText, setCommentText] = useState<{[postId: string]: string}>({});
  const [replyText, setReplyText] = useState<{[commentId: string]: string}>({});
  const [showReplyBox, setShowReplyBox] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<string[]>([]);
  const [showCommentEmojis, setShowCommentEmojis] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<{url: string, type: string} | null>(null);

  


  // Update local status when user data changes
  React.useEffect(() => {
    if (user?.status) {
      setUserStatus(user.status);
    }
  }, [user?.status]);

  // Emojis data for comments
  const emojis = [
    { emoji: "😊", name: "Smile" },
    { emoji: "😂", name: "Laugh" },
    { emoji: "❤️", name: "Heart" },
    { emoji: "👍", name: "Thumbs Up" },
    { emoji: "🌟", name: "Star" },
    { emoji: "🎉", name: "Party" },
    { emoji: "🤔", name: "Thinking" },
    { emoji: "🔥", name: "Fire" },
    { emoji: "💯", name: "Hundred" },
    { emoji: "😍", name: "Heart Eyes" },
    { emoji: "😭", name: "Crying" },
    { emoji: "🥰", name: "Smiling Face with Hearts" },
    { emoji: "😎", name: "Cool" },
    { emoji: "🤗", name: "Hugging" },
    { emoji: "🎊", name: "Confetti Ball" },
    { emoji: "✨", name: "Sparkles" }
  ];

  const toggleComments = async (postId: string) => {
    if (expandedComments.includes(postId)) {
      setExpandedComments(prev => prev.filter(id => id !== postId));
    } else {
      setExpandedComments(prev => [...prev, postId]);
      // Always reload comments to get the latest data
      console.log('Expanding comments for post:', postId);
      await loadComments(postId);
    }
  };

  const loadComments = async (postId: string) => {
    try {
      console.log('Loading comments for post:', postId);
      const response = await fetch(`/api/feed/${postId}/comments`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const comments = await response.json();
        console.log('Loaded comments:', comments);
        setPostComments(prev => ({ ...prev, [postId]: comments }));
      } else {
        console.error('Failed to load comments, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async (postId: string, content: string, parentCommentId?: string) => {
    if (!content?.trim()) return;

    try {
      const response = await fetch(`/api/feed/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim(), parentCommentId: parentCommentId }),
      });

      if (response.ok) {
        const newComment = await response.json();

        if (parentCommentId) {
          // Add reply to the correct comment
          setPostComments(prev => ({
            ...prev,
            [postId]: prev[postId]?.map(comment => 
              comment.id === parentCommentId 
                ? { ...comment, replies: [...(comment.replies || []), newComment] }
                : comment
            ) || []
          }));
          setReplyText(prev => ({ ...prev, [parentCommentId]: '' }));
          setShowReplyBox(null);
        } else {
          // Add top-level comment
          setPostComments(prev => ({
            ...prev,
            [postId]: [...(prev[postId] || []), newComment]
          }));
          setCommentText(prev => ({ ...prev, [postId]: '' }));
          setShowCommentEmojis(null);
        }

        // Update the post's comment count
        setFeedPosts(prev => prev.map(post => 
          post.id === postId 
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post
        ));

        console.log('Comment added successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to add comment:', errorData);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleShareToWhatsApp = (post: any) => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const text = `Check out this post by ${post.author?.username || 'Unknown'}: ${post.content || 'Check out this post!'}\n\n${postUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareModal(null);
  };

  const handleShareToTikTok = (post: any) => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const text = `Check out this post by ${post.author?.username || 'Unknown'}: ${post.content || 'Check out this post!'}`;
    // TikTok doesn't have a direct web share API, so we'll copy to clipboard with instructions
    navigator.clipboard.writeText(`${text}\n\n${postUrl}`).then(() => {
      alert('Post content copied to clipboard! You can now paste it on TikTok.');
    });
    setShowShareModal(null);
  };

  const handleCopyLink = (post: any) => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      alert('Link copied to clipboard!');
    });
    setShowShareModal(null);
  };

  const loadUserLikes = async (postIds: string[]) => {
    try {
      const response = await fetch('/api/user/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ postIds }),
      });

      if (response.ok) {
        const likedPosts = await response.json();
        const likes: {[postId: string]: boolean} = {};
        likedPosts.forEach((postId: string) => {
          likes[postId] = true;
        });
        setUserLikes(likes);
      }
    } catch (error) {
      console.error('Failed to load user likes:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    const isLiked = userLikes[postId];
    const endpoint = `/api/feed/${postId}/like`;
    const method = isLiked ? 'DELETE' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setUserLikes(prev => ({ ...prev, [postId]: !isLiked }));
        setLikeCounts(prev => ({
          ...prev,
          [postId]: isLiked ? (prev[postId] || 1) - 1 : (prev[postId] || 0) + 1
        }));
      } else {
        console.error('Failed to like/unlike post');
      }
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch('/api/user/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setUserStatus(newStatus);
        console.log(`Status changed to: ${newStatus}`);
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-green-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      case 'offline': return 'Offline';
      default: return status.length > 20 ? status.substring(0, 20) + '...' : status;
    }
  };

  // Load feed posts when component mounts (preload) and when switching to feed tab
  React.useEffect(() => {
    if (user) {
      // Preload feed immediately when user is available
      loadFeedPosts();
    }
  }, [user]);

  // Refresh feed when switching to feed tab
  React.useEffect(() => {
    if (user && activeTab === 2) {
      // Always load when switching to feed tab, but don't block if already loading
      if (!isLoadingFeed && feedPosts.length === 0) {
        loadFeedPosts();
      } else if (feedPosts.length === 0) {
        // If no posts and not currently loading, force load
        setIsLoadingFeed(false);
        setTimeout(() => loadFeedPosts(), 100);
      }
    }
  }, [user, activeTab]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p className="text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
        <div className="text-center">
          <p className="text-white text-sm">Authentication required...</p>
        </div>
      </div>
    );
  }

  

  const closeMiniProfile = () => {
    setSelectedProfile(null);
  };

  const handleMediaSelect = (file: File) => {
    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
  };

  const loadFeedPosts = async () => {
    // Don't reload if already loading
    if (isLoadingFeed) return;

    try {
      setIsLoadingFeed(true);

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('/api/feed', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const posts = await response.json();
        console.log('Loaded feed posts:', posts.length);
        setFeedPosts(Array.isArray(posts) ? posts : []);

        // Initialize like counts
        const counts: {[postId: string]: number} = {};
        posts.forEach((post: any) => {
          counts[post.id] = post.likesCount || 0;
        });
        setLikeCounts(counts);

        // Load user's likes for these posts in parallel
        if (posts.length > 0) {
          loadUserLikes(posts.map((post: any) => post.id));
        }
      } else {
        console.error('Failed to load feed posts, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        // Set empty array if failed to load
        setFeedPosts([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Feed loading timed out');
      } else {
        console.error('Failed to load feed posts:', error);
      }
      // Set empty array on error
      setFeedPosts([]);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleCreatePost = async () => {
    // Check if user is authenticated
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    // Check if there's content or media
    if (!postContent.trim() && !selectedMedia) {
      console.error('No content or media to post');
      return;
    }

    try {
      const formData = new FormData();

      // Always append content, even if empty string for media-only posts
      formData.append('content', postContent.trim() || '');

      if (selectedMedia) {
        formData.append('media', selectedMedia);
      }

      console.log('Sending post with content:', postContent.trim());

      const response = await fetch('/api/feed', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const newPost = await response.json();
        console.log('Post created successfully:', newPost);

        // Clear form
        setPostContent('');
        setSelectedMedia(null);
        setMediaPreview(null);

        // Refresh feed
        await loadFeedPosts();
      } else {
        const errorData = await response.json();
        console.error('Failed to create post:', response.status, errorData);
        alert(`Failed to create post: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Network error creating post:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleUserProfileClick = (user: MiniProfileData) => {
    setSelectedProfile(user);
    setShowMiniProfile(true);
  };

  const handleShowMiniProfile = (profile: MiniProfileData) => {
    setSelectedProfile(profile);
    setShowMiniProfile(true);
  };

  const handleReply = (commentId: string) => {
    setShowReplyBox(commentId);
    setReplyText(prev => ({ ...prev, [commentId]: '' })); // Clear previous reply text for this comment
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => 
      prev.includes(commentId) 
        ? prev.filter(id => id !== commentId) 
        : [...prev, commentId]
    );
  };

  const handleRoomSelect = (room: { id: string; name: string }) => {
    console.log('Room selected:', room);
    setSelectedRoom(room);
    setSelectedDirectMessage(null); // Clear DM when entering room
  };

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="w-5 h-5" />,
      content: (
        <div className={cn("h-full flex flex-col", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
          {/* Header with user info, notifications, and search */}
          <div className={cn("border-b px-4 py-3 flex-shrink-0", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {/* User Avatar and Info */}
                <div className="flex items-center space-x-3">
                  <UserAvatar
                    username={user.username}
                    size="md"
                    isOnline={user.isOnline || false}
                    profilePhotoUrl={user.profilePhotoUrl}
                  />
                  <div>
                    <div className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>{user.username}</div>
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <Badge variant="secondary" className={cn(
                          "text-white border-0 text-xs font-medium px-1.5 py-0.5 shadow-sm transform transition-all duration-300 hover:scale-105 w-4 h-4 flex items-center justify-center", 
                          isDarkMode 
                            ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500" 
                            : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400"
                        )}>
                          <span className="text-xs leading-none">{user.level || 1}</span>
                        </Badge>
                        {/* Sparkle effect */}
                        <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
                        <div className="absolute -top-0.25 -right-0.25 w-0.5 h-0.5 bg-yellow-300 rounded-full"></div>
                      </div>
                      {/* Status Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <div className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(userStatus)}`} />
                            {getStatusText(userStatus)}
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuItem onClick={() => handleStatusChange('online')}>
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                            Online
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange('away')}>
                            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                            Away
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange('busy')}>
                            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                            Busy
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange('offline')}>
                            <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                            Offline
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowStatusUpdate(true)}>
                            <Edit className="w-3 h-3 mr-2" />
                            Custom Status
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Notifications, Search, and Coins */}
              <div className="flex flex-col items-end space-y-1">
                <div className="flex items-center space-x-2">
                  {/* Search Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserSearch(true)}
                    className={cn("p-2", isDarkMode ? "text-gray-300" : "text-gray-600")}
                  >
                    <Search className="w-5 h-5" />
                  </Button>

                  {/* Notification Dropdown */}
                  <NotificationDropdown />
                </div>
                
                {/* Coins Display */}
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6s.792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1.001-.67 1.567-.013.043-.024.086-.034.13-.264 1.143-.264 2.4 0 3.543.01.044.021.087.034.13.163.566.385 1.092.67 1.567C7.721 13.216 8.768 14 10 14s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029C10.792 11.807 10.304 12 10 12s-.792-.193-1.264-.979c-.18-.299-.307-.61-.397-.933a4.484 4.484 0 010-2.176c.09-.323.217-.634.397-.933z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs font-bold text-white">{user.coins || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Friends List Content */}
          <div className="flex-1 overflow-hidden">
            <FriendsList onUserClick={handleUserProfileClick} showRefreshButton={true} />
          </div>
        </div>
      ),
    },
    {
      id: "chatroom",
      label: "Rooms",
      icon: <MessageCircle className="w-5 h-5" />,
      content: <RoomListPage onRoomSelect={handleRoomSelect} />,
    },
    {
      id: "feed",
      label: "Feed",
      icon: <Newspaper className="w-5 h-5" />,
      content: (
        <div className={cn("h-full overflow-y-auto", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>Activity Feed</h3>
            </div>

            {/* Create Post Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <UserAvatar
                    username={user.username}
                    size="md"
                    isOnline={user.isOnline || false}
                    profilePhotoUrl={user.profilePhotoUrl}
                  />
                  <div className="flex-1 space-y-3">
                    <div className="relative">
                      <Input
                        placeholder="What's on your mind?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        className={cn("pr-20 border-0 focus:ring-2 focus:ring-primary", isDarkMode ? "focus:bg-gray-700 bg-gray-900" : "focus:bg-white bg-gray-100")}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && (postContent.trim() || selectedMedia)) {
                            handleCreatePost();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="absolute right-1 top-1 bg-primary hover:bg-primary/90 text-white px-3 py-1 rounded-full"
                        onClick={handleCreatePost}
                        disabled={(!postContent.trim() && !selectedMedia) || !user}
                      >
                        Send
                      </Button>
                    </div>

                    {/* Media Preview */}
                    {mediaPreview && (
                      <div className="relative">
                        {selectedMedia?.type.startsWith('image/') ? (
                          <img
                            src={mediaPreview}
                            alt="Preview"
                            className="max-h-48 rounded-lg object-cover"
                          />
                        ) : (
                          <video
                            src={mediaPreview}
                            controls
                            className="max-h-48 rounded-lg"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/70"
                          onClick={removeMedia}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Media Upload Buttons */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleMediaSelect(e.target.files[0])}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload">
                        <Button variant="ghost" size="sm" className="text-green-600 hover:bg-green-50" asChild>
                          <span className="cursor-pointer flex items-center space-x-1">
                            <Image className="w-4 h-4" />
                            <span className="text-xs">Photo</span>
                          </span>
                        </Button>
                      </label>

                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => e.target.files?.[0] && handleMediaSelect(e.target.files[0])}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload">
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" asChild>
                          <span className="cursor-pointer flex items-center space-x-1">
                            <Video className="w-4 h-4" />
                            <span className="text-xs">Video</span>
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Feed Posts */}
            {isLoadingFeed && feedPosts.length === 0 ? (
              <div className="space-y-4">
                {/* Skeleton Loading */}
                {[1, 2, 3].map((index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={cn("w-10 h-10 rounded-full animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className={cn("h-4 rounded w-20 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                            <div className={cn("h-3 rounded w-12 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                          </div>
                          <div className="space-y-2">
                            <div className={cn("h-4 rounded w-full animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                            <div className={cn("h-4 rounded w-3/4 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className={cn("h-6 rounded w-16 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                            <div className={cn("h-6 rounded w-20 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                            <div className={cn("h-6 rounded w-14 animate-pulse", isDarkMode ? "bg-gray-700" : "bg-gray-200")}></div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="text-center py-4">
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>Loading posts...</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsLoadingFeed(false);
                      setTimeout(() => loadFeedPosts(), 100);
                    }}
                    className="mt-2"
                  >
                    Retry Loading
                  </Button>
                </div>
              </div>
            ) : feedPosts.length > 0 ? (
              feedPosts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <UserAvatar
                        username={post.author?.username || 'Unknown'}
                        size="md"
                        isOnline={post.author?.isOnline || false}
                        profilePhotoUrl={post.author?.profilePhotoUrl}
                        onClick={() => handleShowMiniProfile({
                          id: post.author?.id || 'unknown',
                          username: post.author?.username || 'Unknown',
                          level: post.author?.level || 1,
                          status: post.author?.status || "",
                          isOnline: post.author?.isOnline || false,
                          country: post.author?.country || "ID",
                          profilePhotoUrl: post.author?.profilePhotoUrl,
                          isAdmin: post.author?.isAdmin || false,
                        })}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                            {post.author?.username || 'Unknown'}
                          </span>
                          {post.author?.level && (
                            <div className="relative">
                              <Badge variant="secondary" className={cn(
                                "text-white border-0 text-xs font-semibold px-2 py-0.5 shadow-sm", 
                                isDarkMode 
                                  ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" 
                                  : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                              )}>
                                <span className="flex items-center space-x-1">
                                  <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                  </svg>
                                  <span>{post.author.level}</span>
                                </span>
                              </Badge>
                            </div>
                          )}
                          {post.author?.isAdmin && (
                            <Badge variant="default" className="bg-red-600 text-white text-xs font-semibold ml-1">
                              Admin
                            </Badge>
                          )}
                        </div>

                        {post.content && (
                          <div className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>{post.content}</div>
                        )}

                        {/* Media content */}
                        {post.mediaUrl && (
                          <div className="mb-2">
                            {post.mediaType === 'image' ? (
                              <img
                                src={post.mediaUrl}
                                alt="Post media"
                                className="rounded-lg max-h-64 object-cover w-full"
                              />
                            ) : post.mediaType === 'video' ? (
                              <video
                                src={post.mediaUrl}
                                controls
                                className="rounded-lg max-h-64 w-full"
                              />
                            ) : null}
                          </div>
                        )}

                        <div className={cn("text-xs mb-2", isDarkMode ? "text-gray-400" : "text-gray-400")}>
                          {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                        </div>

                        <div className="flex items-center space-x-4 mt-2">
                          <button 
                            className="flex items-center space-x-1 hover:text-red-600 transition-colors"
                            onClick={() => handleLikePost(post.id)}
                          >
                            <Heart 
                              className={`w-4 h-4 cursor-pointer transition-colors ${
                                userLikes[post.id] 
                                  ? 'text-red-500 fill-red-500' 
                                  : 'text-gray-500 hover:text-red-500'
                              }`} 
                            />
                            <span className="text-xs text-gray-500">{likeCounts[post.id] || post.likesCount || 0}</span>
                          </button>
                          <button 
                            className="flex items-center space-x-1 hover:text-blue-600"
                            onClick={() => toggleComments(post.id)}
                          >
                            <MessageCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">{post.commentsCount || 0} Comments</span>
                          </button>
                          <button 
                            className="flex items-center space-x-1 hover:text-green-600"
                            onClick={() => setShowShareModal({ url: `${window.location.origin}/post/${post.id}`, type: 'post' })}
                          >
                            <Share2 className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">Share</span>
                          </button>
                        </div>

                        {/* Comments Section */}
                        {expandedComments.includes(post.id) && (
                          <div className="mt-4 border-t pt-3">
                            {/* Comments List */}
                            <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                              {!postComments[post.id] ? (
                                <div className="text-center py-4 text-gray-500">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                                  Loading comments...
                                </div>
                              ) : postComments[post.id]?.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">
                                  No comments yet. Be the first to comment!
                                </div>
                              ) : (
                                postComments[post.id]?.map((comment, index) => (
                                  <div key={`${comment.id}-${index}`} className="space-y-3">
                                    {/* Main Comment */}
                                    <div className="flex items-start space-x-3">
                                      <UserAvatar
                                        username={comment.author?.username || 'Unknown'}
                                        size="sm"
                                        isOnline={false}
                                        profilePhotoUrl={comment.author?.profilePhotoUrl}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
                                          <div className="font-semibold text-sm text-gray-800 mb-1">
                                            {comment.author?.username || 'Unknown User'}
                                          </div>
                                          <div className="text-sm text-gray-700 leading-relaxed">
                                            {comment.content}
                                          </div>
                                        </div>

                                        {/* Comment Actions */}
                                        <div className="flex items-center justify-between mt-2 px-4">
                                          <div className="flex items-center space-x-4">
                                            <span className="text-xs text-gray-500">
                                              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('id-ID', { 
                                                month: '2-digit', 
                                                day: '2-digit' 
                                              }) : 'Just now'}
                                            </span>
                                            <button 
                                              className="text-xs text-gray-600 font-medium hover:text-blue-600 transition-colors"
                                              onClick={() => handleReply(comment.id)}
                                            >
                                              Reply
                                            </button>
                                            {comment.replies && comment.replies.length > 0 && (
                                              <button 
                                                className="text-xs text-gray-600 font-medium hover:text-blue-600 transition-colors"
                                                onClick={() => toggleReplies(comment.id)}
                                              >
                                                {expandedReplies.includes(comment.id) ? 'Hide' : 'Show'} {comment.replies.length} repl{comment.replies.length > 1 ? 'ies' : 'y'}
                                              </button>
                                            )}
                                          </div>

                                          <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1">
                                              <button className="text-gray-500 hover:text-red-500 transition-colors">
                                                <Heart className="w-4 h-4" />
                                              </button>
                                              <span className="text-xs text-gray-500">{comment.likesCount || 0}</span>
                                            </div>
                                            <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                              <MessageCircle className="w-4 h-4 transform scale-x-[-1]" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Reply Input Box */}
                                        {showReplyBox === comment.id && (
                                          <div className="mt-3 ml-4">
                                            <div className="flex items-center space-x-2">
                                              <UserAvatar
                                                username={user.username}
                                                size="sm"
                                                isOnline={user.isOnline || false}
                                                profilePhotoUrl={user.profilePhotoUrl}
                                              />
                                              <div className="flex-1 flex items-center space-x-2">
                                                <Input
                                                  placeholder={`Reply to ${comment.author?.username}...`}
                                                  value={replyText[comment.id] || ''}
                                                  onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && (replyText[comment.id]?.trim())) {
                                                      handleAddComment(post.id, replyText[comment.id], comment.id);
                                                    }
                                                  }}
                                                  className={cn("flex-1 text-sm", isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200")}
                                                />
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  onClick={() => handleAddComment(post.id, replyText[comment.id], comment.id)}
                                                  disabled={!replyText[comment.id]?.trim()}
                                                  className="bg-primary hover:bg-primary/90 text-white px-3 py-1"
                                                >
                                                  <Send className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && expandedReplies.includes(comment.id) && (
                                          <div className="mt-3 ml-6 space-y-3">
                                            {comment.replies.map((reply, replyIndex) => (
                                              <div key={`${reply.id}-${replyIndex}`} className="flex items-start space-x-3">
                                                <UserAvatar
                                                  username={reply.author?.username || 'Unknown'}
                                                  size="sm"
                                                  isOnline={false}
                                                  profilePhotoUrl={reply.author?.profilePhotoUrl}
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className="bg-gray-50 rounded-2xl px-4 py-3 shadow-sm border border-gray-50">
                                                    <div className="font-semibold text-sm text-gray-800 mb-1">
                                                      {reply.author?.username || 'Unknown User'}
                                                    </div>
                                                    <div className="text-sm text-gray-700 leading-relaxed">
                                                      {reply.content}
                                                    </div>
                                                  </div>

                                                  <div className="flex items-center justify-between mt-2 px-4">
                                                    <div className="flex items-center space-x-4">
                                                      <span className="text-xs text-gray-500">
                                                        {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('id-ID', { 
                                                          month: '2-digit', 
                                                          day: '2-digit' 
                                                        }) : 'Just now'}
                                                      </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                      <div className="flex items-center space-x-1">
                                                        <button className="text-gray-500 hover:text-red-500 transition-colors">
                                                          <Heart className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-xs text-gray-500">{reply.likesCount || 0}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Comment Input */}
                            <div className="flex items-start space-x-2">
                              <UserAvatar
                                username={user.username}
                                size="sm"
                                isOnline={user.isOnline || false}
                                profilePhotoUrl={user.profilePhotoUrl}
                              />
                              <div className="flex-1 relative">
                                {/* Emoji Picker for Comments */}
                                {showCommentEmojis === post.id && (
                                  <div className="absolute bottom-full mb-2 z-10">
                                    <Card className="shadow-lg">
                                      <CardContent className="p-3 w-64 max-h-32 overflow-y-auto">
                                        <div className="grid grid-cols-8 gap-1">
                                          {emojis.map((item, index) => (
                                            <Button
                                              key={index}
                                              variant="ghost"
                                              size="sm"
                                              className="p-1 h-8 w-8 flex items-center justify-center"
                                              onClick={() => {
                                                setCommentText(prev => ({ ...prev, [post.id]: (prev[post.id] || '') + item.emoji }));
                                                setShowCommentEmojis(null);
                                              }}
                                            >
                                              <span className="text-sm">{item.emoji}</span>
                                            </Button>
                                          ))}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}

                                <div className="flex items-center space-x-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setShowCommentEmojis(showCommentEmojis === post.id ? null : post.id);
                                    }}
                                    className="p-2 text-yellow-500 hover:text-yellow-600"
                                  >
                                    <Smile className="w-4 h-4" />
                                  </Button>
                                  <Input
                                    placeholder="Write a comment..."
                                    value={commentText[post.id] || ''}
                                    onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && (commentText[post.id]?.trim())) {
                                        handleAddComment(post.id, commentText[post.id]);
                                      }
                                    }}
                                    className={cn("flex-1 text-sm", isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-200")}
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddComment(post.id, commentText[post.id])}
                                    disabled={!commentText[post.id]?.trim()}
                                    className="bg-primary hover:bg-primary/90 text-white px-3 py-1"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className={cn("text-center", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                  <p>No posts available.</p>
                  <p className="text-sm">Be the first to post or try refreshing!</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsLoadingFeed(false);
                    loadFeedPosts();
                  }}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh Feed</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "dm",
      label: "DM",
      icon: <Mail className="w-5 h-5" />,
      content: selectedDirectMessage ? (
        <DirectMessageChat
          recipient={selectedDirectMessage}
          onBack={() => setSelectedDirectMessage(null)}
        />
      ) : (
        <DMConversationsList onSelectUser={setSelectedDirectMessage} />
      ),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className={cn("h-full overflow-y-auto", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
          <div className="p-4 space-y-4">
            <h3 className={cn("text-lg font-semibold mb-4", isDarkMode ? "text-gray-200" : "text-gray-800")}>Settings</h3>

            {/* Profile Section */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <UserAvatar
                    username={user.username}
                    size="lg"
                    isOnline={user.isOnline || false}
                    profilePhotoUrl={user.profilePhotoUrl}
                    isAdmin={user.isAdmin}
                  />
                  <div>
                    <div className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>{user.username}</div>
                    <div className={cn("text-sm", isDarkMode ? "text-gray-300" : "text-gray-600")}>{user.email}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="relative">
                        <Badge variant="secondary" className={cn(
                          "text-white border-0 text-xs font-bold px-2.5 py-1 shadow-md", 
                          isDarkMode 
                            ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-600" 
                            : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                        )}>
                          <span className="flex items-center space-x-1">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            <span>Level {user.level}</span>
                          </span>
                        </Badge>
                        <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-yellow-400 rounded-full"></div>
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${user.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        <div className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {user.isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowEditProfile(true)}
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* Settings Options */}
            <Card>
              <CardContent className="p-0">
                <div className={cn("divide-y", isDarkMode ? "divide-gray-700" : "divide-gray-100")}>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-primary" />
                      <span className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>Notifications</span>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Moon className="h-5 w-5 text-primary" />
                      <span className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>Dark Mode</span>
                    </div>
                    <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                  </div>

                  <button className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}>
                    <Shield className="h-5 w-5 text-primary" />
                    <span className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>Privacy & Security</span>
                  </button>

                  <button className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}>
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>Help & Support</span>
                  </button>

                  <button 
                    className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}
                    onClick={() => setShowCredits(true)}
                  >
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <span className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>Credits</span>
                  </button>

                  <button 
                    className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}
                    onClick={() => setShowMentor(true)}
                  >
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <div className="flex items-center justify-between flex-1">
                      <span className={cn("font-medium", user?.isMentor ? "text-red-600" : (isDarkMode ? "text-gray-200" : "text-gray-800"))}>
                        Mentor
                      </span>
                      {user?.isMentor && (
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/20">
                          <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium text-red-600">Active</span>
                        </div>
                      )}
                    </div>
                  </button>

                  {user?.isAdmin && (
                    <button 
                      className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}
                      onClick={() => setShowAdmin(true)}
                    >
                      <Shield className="h-5 w-5 text-purple-600" />
                      <div className="flex items-center justify-between flex-1">
                        <span className={cn("font-medium text-purple-600")}>
                          Admin Panel
                        </span>
                        <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/20">
                          <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs font-medium text-purple-600">Admin</span>
                        </div>
                      </div>
                    </button>
                  )}

                  <button 
                    className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50")}
                    onClick={() => setPin("00")}
                  >
                    <span>Set PIN</span>
                  </button>

                  <button
                    className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "text-red-400 hover:bg-red-700" : "text-red-600 hover:bg-red-50")}
                    onClick={logout}
                  >
                    <LogOut className="h-5 w-5" />
                    <span className={cn("font-medium", isDarkMode ? "text-red-400" : "text-red-600")}>
                      Sign Out
                    </span>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={cn("h-full w-full flex flex-col", isDarkMode && "dark")}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatRoom
            roomId={selectedRoom.id}
            roomName={selectedRoom.name}
            onUserClick={handleUserProfileClick}
            onLeaveRoom={() => setSelectedRoom(null)}
          />
        ) : selectedDirectMessage ? (
          <DirectMessageChat
            recipient={selectedDirectMessage}
            onBack={() => setSelectedDirectMessage(null)}
          />
        ) : null}
      </div>

      {/* Admin Page */}
      {showAdmin ? (
        <AdminPage onBack={() => setShowAdmin(false)} />
      ) : /* Mentor Page */
      showMentor ? (
        <MentorPage onBack={() => setShowMentor(false)} />
      ) : showCredits ? (
        <CreditsPage onBack={() => setShowCredits(false)} />
      ) : (
        /* Use SwipeTabs component for proper swipe functionality */
        <SwipeTabs tabs={tabs} className="flex-1" />
      )}

      {/* Mini Profile Modal */}
      {selectedProfile && (
        <MiniProfileModal
          profile={selectedProfile}
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
      />

      {/* User Search Modal */}
      <UserSearchModal 
        isOpen={showUserSearch} 
        onClose={() => setShowUserSearch(false)} 
      />

      {/* Status Update Modal */}
      <StatusUpdateModal 
        isOpen={showStatusUpdate} 
        onClose={() => setShowStatusUpdate(false)} 
      />

      {/* Change Password Modal */}
      

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={cn("rounded-lg max-w-md w-full p-6 relative", isDarkMode ? "bg-gray-800" : "bg-white")}>
            <button
              onClick={() => setShowShareModal(null)}
              className={cn("absolute top-4 right-4 p-1 rounded-full", isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className={cn("text-lg font-semibold mb-4", isDarkMode ? "text-white" : "text-gray-900")}>
              Share {showShareModal.type === 'Room' ? 'Room' : 'Post'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Share Link
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={showShareModal.url}
                    readOnly
                    className={cn("flex-1", isDarkMode ? "bg-gray-700 text-white" : "")}
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(showShareModal.url);
                      // toast notification would go here
                    }}
                    size="sm"
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-4 pt-4">
                <Button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check this out: ${encodeURIComponent(showShareModal.url)}`, '_blank')}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Twitter</span>
                </Button>

                <Button
                  onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(showShareModal.url)}`, '_blank')}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <NotificationProvider>
      <WebSocketProvider>
        <HomePageContent />
      </WebSocketProvider>
    </NotificationProvider>
  );
}