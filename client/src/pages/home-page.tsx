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
  ChevronDown
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
  const { user, logoutMutation } = useAuth();
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

  // Update local status when user data changes
  React.useEffect(() => {
    if (user?.status) {
      setUserStatus(user.status);
    }
  }, [user?.status]);

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
        <div className="h-full flex flex-col bg-gray-50">
          {/* Header with user info, notifications, and search */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
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
                    <div className="font-semibold text-gray-800">{user.username}</div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs">
                        Level {user.level || 1}
                      </Badge>
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
                  className="text-gray-600 p-2"
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
                  className="text-gray-600 p-2"
                >
                  <Edit className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Friends List Content */}
          <div className="flex-1 overflow-hidden">
            <FriendsList onUserClick={handleUserClick} />
          </div>
        </div>
      ),
    },
    {
      id: "chatroom",
      label: "Chatroom",
      icon: <MessageCircle className="w-5 h-5" />,
      content: (
        <div className="h-full">
          <RoomListPage onUserClick={handleUserClick} />
        </div>
      ),
    },
    {
      id: "feed",
      label: "Feed",
      icon: <Newspaper className="w-5 h-5" />,
      content: (
        <div className="h-full overflow-y-auto bg-gray-50">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Activity Feed</h3>
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
                        className="pr-20 bg-gray-100 border-0 rounded-full focus:bg-white focus:ring-2 focus:ring-primary"
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
                <div className="text-gray-500">Loading feed...</div>
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
                          <span className="font-semibold text-gray-800">
                            {post.author?.username || 'Unknown'}
                          </span>
                          {post.author?.level && (
                            <Badge variant="secondary" className="bg-warning text-white text-xs">
                              {post.author.level}
                            </Badge>
                          )}
                        </div>

                        {post.content && (
                          <div className="text-sm text-gray-600 mb-2">{post.content}</div>
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

                        <div className="text-xs text-gray-400 mb-2">
                          {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString()}
                        </div>

                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4 text-gray-500 cursor-pointer" />
                            <span className="text-xs text-gray-500">{post.likesCount || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Share2 className="w-4 h-4 text-gray-500 cursor-pointer" />
                            <span className="text-xs text-gray-500">Share</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">No posts yet. Be the first to post!</div>
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
        <div className="h-full overflow-y-auto bg-gray-50">
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Settings</h3>

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
                    <div className="font-semibold text-gray-800">{user.username}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="bg-warning text-white">
                        Level {user.level}
                      </Badge>
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
                <div className="divide-y divide-gray-100">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="h-5 w-5 text-primary" />
                      <span className="font-medium text-gray-800">Notifications</span>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Moon className="h-5 w-5 text-primary" />
                      <span className="font-medium text-gray-800">Dark Mode</span>
                    </div>
                    <Switch />
                  </div>

                  <button className="w-full p-4 text-left flex items-center space-x-3 hover:bg-gray-50">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-medium text-gray-800">Privacy & Security</span>
                  </button>

                  <button className="w-full p-4 text-left flex items-center space-x-3 hover:bg-gray-50">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span className="font-medium text-gray-800">Help & Support</span>
                  </button>

                  <button
                    className="w-full p-4 text-left flex items-center space-x-3 text-red-600 hover:bg-red-50"
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">
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
        <div className="h-full w-full bg-white flex flex-col">
          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden">
            {tabs[activeTab]?.content}
          </div>

          {/* Fixed Tab Bar */}
          <div className="bg-white border-t border-gray-200 px-4 py-2 flex-shrink-0 safe-area-inset-bottom">
            <div className="flex items-center justify-around relative">
              {/* Tab Indicator */}
              <div
                className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-transform duration-300"
                style={{
                  width: `${100 / tabs.length}%`,
                  transform: `translateX(${activeTab * 100}%)`,
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
                      : "text-gray-400 hover:text-gray-600"
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
        </div>
      </WebSocketProvider>
    </NotificationProvider>
  );
}