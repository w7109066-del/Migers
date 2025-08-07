import { useState } from "react";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { NotificationProvider } from "@/hooks/use-notifications";
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
  Smile
} from "lucide-react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MiniProfileData {
  id: string;
  username: string;
  level: number;
  status: string;
  isOnline: boolean;
  country?: string;
}

export default function HomePage() {
  const { user, logoutMutation, isDarkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProfile, setSelectedProfile] = useState<MiniProfileData | null>(null);
  const [selectedDMUser, setSelectedDMUser] = useState<MiniProfileData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [postContent, setPostContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [userStatus, setUserStatus] = useState(user?.status || "online");
  const [expandedComments, setExpandedComments] = useState<string[]>([]);
  const [postComments, setPostComments] = useState<{[postId: string]: any[]}>({});
  const [commentText, setCommentText] = useState<{[postId: string]: string}>({});
  const [showCommentEmojis, setShowCommentEmojis] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);

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

  const handleAddComment = async (postId: string, content: string) => {
    if (!content?.trim()) return;

    try {
      const response = await fetch(`/api/feed/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() }),
      });

      if (response.ok) {
        const newComment = await response.json();
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment]
        }));
        setCommentText(prev => ({ ...prev, [postId]: '' }));
        setShowCommentEmojis(null);
        
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

  // Load feed posts when component mounts or when switching to feed tab
  React.useEffect(() => {
    if (user && activeTab === 2) {
      loadFeedPosts();
    }
  }, [user, activeTab]);

  if (!user) return null;

  const showMiniProfile = (profileData: MiniProfileData) => {
    setSelectedProfile(profileData);
  };

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
    try {
      setIsLoadingFeed(true);
      const response = await fetch('/api/feed', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const posts = await response.json();
        setFeedPosts(posts);
      } else {
        console.error('Failed to load feed posts');
      }
    } catch (error) {
      console.error('Failed to load feed posts:', error);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedMedia) return;

    try {
      const formData = new FormData();
      if (postContent.trim()) {
        formData.append('content', postContent);
      }
      if (selectedMedia) {
        formData.append('media', selectedMedia);
      }

      const response = await fetch('/api/feed', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        setPostContent('');
        setSelectedMedia(null);
        setMediaPreview(null);
        await loadFeedPosts();
        console.log('Post created successfully');
      } else {
        const errorData = await response.json();
        console.error('Failed to create post:', errorData);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleUserClick = (user: MiniProfileData) => {
    setSelectedProfile(user);
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

              {/* Right side - Notifications and Search */}
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

                {/* Edit Profile Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditProfile(true)}
                  className={cn("p-2", isDarkMode ? "text-gray-300" : "text-gray-600")}
                >
                  <Edit className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Friends List Content */}
          <div className="flex-1 overflow-hidden">
            <FriendsList onUserClick={handleUserClick} showRefreshButton={true} />
          </div>
        </div>
      ),
    },
    {
      id: "chatroom",
      label: "Chatroom",
      icon: <MessageCircle className="w-5 h-5" />,
      content: (
        <div className={cn("h-full", isDarkMode && "dark")}>
          <RoomListPage onUserClick={handleUserClick} />
        </div>
      ),
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
                        disabled={!postContent.trim() && !selectedMedia}
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
            {isLoadingFeed ? (
              <div className="flex items-center justify-center py-8">
                <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Loading feed...</div>
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
                        onClick={() => showMiniProfile({
                          id: post.author?.id || 'unknown',
                          username: post.author?.username || 'Unknown',
                          level: post.author?.level || 1,
                          status: post.author?.status || "",
                          isOnline: post.author?.isOnline || false,
                          country: post.author?.country || "ID",
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
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-500" />
                            <span className="text-xs text-gray-500">{post.likesCount || 0}</span>
                          </div>
                          <button 
                            className="flex items-center space-x-1 hover:text-blue-600"
                            onClick={() => toggleComments(post.id)}
                          >
                            <MessageCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">{post.commentsCount || 0} Comments</span>
                          </button>
                          <button 
                            className="flex items-center space-x-1 hover:text-green-600"
                            onClick={() => setShowShareModal(post.id)}
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
                                  <div key={`${comment.id}-${index}`} className="flex items-start space-x-3">
                                    <UserAvatar
                                      username={comment.author?.username || 'Unknown'}
                                      size="sm"
                                      isOnline={false}
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
                                          <button className="text-xs text-gray-600 font-medium hover:text-blue-600 transition-colors">
                                            Reply
                                          </button>
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
              <div className="flex items-center justify-center py-8">
                <div className={isDarkMode ? "text-gray-400" : "text-gray-500"}>No posts yet. Be the first to post!</div>
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
      content: selectedDMUser ? (
        <DirectMessageChat
          recipient={selectedDMUser}
          onBack={() => setSelectedDMUser(null)}
        />
      ) : (
        <DMConversationsList onSelectUser={setSelectedDMUser} />
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
                    className={cn("w-full p-4 text-left flex items-center space-x-3", isDarkMode ? "text-red-400 hover:bg-red-700" : "text-red-600 hover:bg-red-50")}
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-5 w-5" />
                    <span className={cn("font-medium", isDarkMode ? "text-red-400" : "text-red-600")}>
                      {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
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
    <NotificationProvider>
      <WebSocketProvider>
        <div className={cn("h-full w-full flex flex-col", isDarkMode && "dark")}>
          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {tabs[activeTab]?.content}
          </div>

          {/* Fixed Tab Bar */}
          <div className={cn("border-t px-4 py-2 flex-shrink-0 safe-area-inset-bottom", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
            <div className="flex items-center justify-around relative">
              {/* Tab Indicator */}
              <div
                className="absolute top-0 h-1 bg-primary rounded-full transition-transform duration-300"
                style={{
                  width: `${100 / tabs.length}%`,
                  transform: `translateX(${activeTab * 100}%)`,
                  left: 0, // Ensure left is set for translateX to work correctly
                }}
              />

              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(index)}
                  className={cn(
                    "flex flex-col items-center py-2 px-3 transition-colors",
                    activeTab === index
                      ? "text-primary"
                      : isDarkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  {tab.icon}
                  <span className="text-xs mt-1 font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mini Profile Modal */}
          {selectedProfile && (
            <MiniProfileModal
              profile={selectedProfile}
              onClose={closeMiniProfile}
              onMessageClick={(user) => {
                setSelectedDMUser(user);
                setActiveTab(3); // Switch to DM tab
              }}
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
            onUserSelect={showMiniProfile}
            onMessageClick={(user) => {
              setSelectedDMUser(user);
              setActiveTab(3); // Switch to DM tab
            }}
          />

          {/* Status Update Modal */}
          <StatusUpdateModal
            isOpen={showStatusUpdate}
            onClose={() => setShowStatusUpdate(false)}
          />

          {/* Share Modal */}
          {showShareModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className={cn("rounded-2xl p-6 w-72 max-w-sm", isDarkMode ? "bg-gray-800" : "bg-white")}>
                <div className="text-center mb-6">
                  <h3 className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                    berbagi
                  </h3>
                </div>
                
                <div className="flex justify-center space-x-8">
                  {/* WhatsApp Share */}
                  <button
                    onClick={() => {
                      const post = feedPosts.find(p => p.id === showShareModal);
                      if (post) handleShareToWhatsApp(post);
                    }}
                    className="flex flex-col items-center space-y-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                    </div>
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                      WhatsApp
                    </span>
                  </button>

                  {/* Copy Link */}
                  <button
                    onClick={() => {
                      const post = feedPosts.find(p => p.id === showShareModal);
                      if (post) handleCopyLink(post);
                    }}
                    className="flex flex-col items-center space-y-2 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </div>
                    <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                      Salin tautan
                    </span>
                  </button>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowShareModal(null)}
                  className={cn("absolute top-4 right-4 p-1 rounded-full", isDarkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </WebSocketProvider>
    </NotificationProvider>
  );
}