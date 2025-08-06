import { useState } from "react";
import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { WebSocketProvider } from "@/hooks/use-websocket";
import { SwipeTabs } from "@/components/ui/swipe-tabs";
import { FriendsList } from "@/components/friends/friends-list";
import { ChatRoom } from "@/components/chat/chat-room";
import { DirectMessageChat } from "@/components/chat/direct-message-chat";
import RoomListPage from "@/pages/room-list";
import { UserAvatar } from "@/components/user/user-avatar";
import { MiniProfileModal } from "@/components/ui/mini-profile-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  X
} from "lucide-react";

interface MiniProfileData {
  id: string;
  username: string;
  level: number;
  status: string;
  isOnline: boolean;
}

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<MiniProfileData | null>(null);
  const [selectedDMUser, setSelectedDMUser] = useState<MiniProfileData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [postContent, setPostContent] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

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
        // Refresh the feed to show the new post
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

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: <Home className="w-5 h-5" />,
      content: (
        <div className="h-full overflow-y-auto bg-gray-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Friends</h3>
              <Button variant="ghost" size="sm">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <FriendsList onUserClick={showMiniProfile} />
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
          <RoomListPage />
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
                          status: "",
                          isOnline: post.author?.isOnline || false,
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
        <div className="h-full overflow-y-auto bg-gray-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Direct Messages</h3>

            <div className="space-y-3">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedDMUser({
                  id: "alice",
                  username: "alice_spark",
                  level: 15,
                  status: "Music is my passion 🎵",
                  isOnline: true,
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <UserAvatar 
                          username="alice_spark" 
                          size="md"
                          isOnline={true}
                        />
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          2
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">alice_spark</div>
                        <div className="text-sm text-gray-600 truncate">Hey! Want to join our gaming session?</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">5m</div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedDMUser({
                  id: "mike",
                  username: "mike_rocket",
                  level: 23,
                  status: "Gaming enthusiast",
                  isOnline: false,
                })}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserAvatar 
                        username="mike_rocket" 
                        size="md"
                        isOnline={false}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">mike_rocket</div>
                        <div className="text-sm text-gray-600 truncate">Thanks for the help earlier!</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">2h</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
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
                <Button variant="outline" className="w-full">
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
    <WebSocketProvider>
      <div className="h-full w-full bg-white flex flex-col">
        {/* Header - only show for Home tab */}
        {activeTab === 0 && (
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <UserAvatar 
                  username={user.username} 
                  size="md"
                  isOnline={user.isOnline || false}
                />

                <div>
                  <div className="flex items-center space-x-1">
                    <span className="font-semibold text-sm text-gray-800">{user.username}</span>
                    <Badge variant="secondary" className="bg-warning text-white text-xs">
                      {user.level}
                    </Badge>
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${user.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full mr-1 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {user.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="text-gray-600 p-2">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 p-2">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Swipe Tabs Content */}
        <div className="flex-1">
          <SwipeTabs tabs={tabs} onTabChange={setActiveTab} />
        </div>

        {/* Mini Profile Modal */}
        {selectedProfile && (
          <MiniProfileModal
            profile={selectedProfile}
            onClose={closeMiniProfile}
          />
        )}
      </div>
    </WebSocketProvider>
  );
}