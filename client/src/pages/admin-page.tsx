import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user/user-avatar';
import { AddGiftModal } from '@/components/ui/add-gift-modal';
import { AddCustomEmojiModal } from '@/components/ui/add-custom-emoji-modal';
import { ArrowLeft, Users, Shield, BookOpen, Activity, Ban, UserX, Gift, Plus, Coins, MessageSquare, Trash2, X, Smile, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  email: string;
  level: number;
  isOnline: boolean;
  isMentor: boolean;
  isAdmin: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  profilePhotoUrl?: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  totalMentors: number;
  totalAdmins: number;
  bannedUsers: number;
  suspendedUsers: number;
}

interface Room {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  maxMembers: number;
  createdBy: string;
  createdAt: string;
}

interface AdminPageProps {
  onBack: () => void;
}

export function AdminPage({ onBack }: AdminPageProps) {
  const { user, isDarkMode } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showAddGiftModal, setShowAddGiftModal] = useState(false);
  const [gifts, setGifts] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddEmojiModal, setShowAddEmojiModal] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<any[]>([]);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(25);
  const [newRoomCreator, setNewRoomCreator] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [mentorsList, setMentorsList] = useState<any[]>([]);
  const [isCheckingExpired, setIsCheckingExpired] = useState(false);
  const { toast } = useToast();

  const [merchantAreaInfo, setMerchantAreaInfo] = useState<any>(null);
  const [merchantAreaLoading, setMerchantAreaLoading] = useState(false);

  const checkMerchantArea = async () => {
    setMerchantAreaLoading(true);
    try {
      const response = await fetch('/api/admin/merchant-area-check', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMerchantAreaInfo(data);

        if (data.found) {
          toast({
            title: "Merchant Area Found",
            description: `Found ${data.stats.totalMembers} users in merchant area`,
            variant: "default",
          });
        } else {
          toast({
            title: "Merchant Area Not Found",
            description: data.message,
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Failed to check merchant area');
      }
    } catch (error) {
      console.error('Error checking merchant area:', error);
      toast({
        title: "Error",
        description: "Failed to check merchant area",
        variant: "destructive",
      });
    } finally {
      setMerchantAreaLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    if (!confirm(`Are you sure you want to delete the room "${roomName}"? This action cannot be undone and will remove all messages and members.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/rooms/${roomId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result.message);
        loadRooms(); // Refresh rooms list
      } else {
        const error = await response.json();
        console.error('Failed to delete room:', error.message);
        alert(`Failed to delete room: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Error deleting room. Please try again.');
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers();
      loadStats();
      loadGifts();
      loadRooms();
      loadCustomEmojis();
      loadMentorsList();
    }
  }, [user?.isAdmin]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
      });

      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      } else {
        console.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      console.log('Loading admin stats...');
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const statsData = await response.json();
        console.log('Admin stats loaded:', statsData);
        setStats(statsData);
      } else {
        console.error('Failed to load stats, status:', response.status);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadGifts = async () => {
    try {
      const response = await fetch('/api/admin/gifts', {
        credentials: 'include',
      });

      if (response.ok) {
        const giftsData = await response.json();
        setGifts(giftsData);
      } else {
        console.error('Failed to load gifts');
      }
    } catch (error) {
      console.error('Error loading gifts:', error);
    }
  };

  const deleteGift = async (giftId: string) => {
    try {
      const response = await fetch(`/api/admin/gifts/${giftId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadGifts();
      } else {
        console.error('Failed to delete gift');
      }
    } catch (error) {
      console.error('Error deleting gift:', error);
    }
  };

  const createRoom = async () => {
    if (!newRoomName.trim() || !newRoomDescription.trim() || !newRoomCreator.trim()) {
      return;
    }

    setIsCreatingRoom(true);
    try {
      const response = await fetch('/api/admin/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newRoomName.trim(),
          description: newRoomDescription.trim(),
          maxMembers: newRoomCapacity,
          creatorUsername: newRoomCreator.trim(),
          isPublic: true
        }),
      });

      if (response.ok) {
        loadRooms();
        setShowAddRoomModal(false);
        setNewRoomName('');
        setNewRoomDescription('');
        setNewRoomCapacity(25);
        setNewRoomCreator('');
      } else {
        console.error('Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/admin/rooms', {
        credentials: 'include',
      });

      if (response.ok) {
        const roomsData = await response.json();
        setRooms(roomsData);
      } else {
        console.error('Failed to load rooms');
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadMentorsList = async () => {
    try {
      const response = await fetch('/api/admin/mentors', {
        credentials: 'include',
      });

      if (response.ok) {
        const mentorsData = await response.json();
        setMentorsList(mentorsData);
      } else {
        console.error('Failed to load mentors list');
      }
    } catch (error) {
      console.error('Error loading mentors list:', error);
    }
  };

  const checkExpiredMentors = async () => {
    setIsCheckingExpired(true);
    try {
      const response = await fetch('/api/admin/mentors/check-expired', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Expired mentors check result:', result);

        // Refresh mentors list and stats
        loadMentorsList();
        loadStats();

        alert(`Processed ${result.expiredMentors.length} expired mentors`);
      } else {
        console.error('Failed to check expired mentors');
        alert('Failed to check expired mentors');
      }
    } catch (error) {
      console.error('Error checking expired mentors:', error);
      alert('Error checking expired mentors');
    } finally {
      setIsCheckingExpired(false);
    }
  };

  const expireMentor = async (mentorId: string) => {
    if (!confirm('Are you sure you want to remove mentor status for this user?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/mentors/expire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ mentorId }),
      });

      if (response.ok) {
        loadMentorsList();
        loadStats();
        alert('Mentor status removed successfully');
      } else {
        console.error('Failed to expire mentor');
        alert('Failed to remove mentor status');
      }
    } catch (error) {
      console.error('Error expiring mentor:', error);
      alert('Error removing mentor status');
    }
  };

  const updateRechargeTime = async (mentorId: string) => {
    try {
      const response = await fetch('/api/admin/mentors/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ mentorId }),
      });

      if (response.ok) {
        loadMentorsList();
        alert('Recharge time updated successfully');
      } else {
        console.error('Failed to update recharge time');
        alert('Failed to update recharge time');
      }
    } catch (error) {
      console.error('Error updating recharge time:', error);
      alert('Error updating recharge time');
    }
  };

  const loadCustomEmojis = async () => {
    try {
      const response = await fetch('/api/admin/emojis', {
        credentials: 'include',
      });

      if (response.ok) {
        const emojisData = await response.json();
        setCustomEmojis(emojisData);
      } else {
        console.error('Failed to load custom emojis');
      }
    } catch (error) {
      console.error('Error loading custom emojis:', error);
    }
  };

  const toggleEmojiStatus = async (emojiId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/emojis/${emojiId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        loadCustomEmojis();
      } else {
        console.error('Failed to toggle emoji status');
      }
    } catch (error) {
      console.error('Error toggling emoji status:', error);
    }
  };

  const deleteCustomEmoji = async (emojiId: string) => {
    if (!confirm('Are you sure you want to delete this emoji? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/emojis/${emojiId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadCustomEmojis();
      } else {
        console.error('Failed to delete custom emoji');
      }
    } catch (error) {
      console.error('Error deleting custom emoji:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        console.error('Failed to search users');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const promoteUser = async (userId: string, role: 'admin' | 'mentor') => {
    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        loadUsers();
        loadStats();
      } else {
        console.error('Failed to promote user');
      }
    } catch (error) {
      console.error('Error promoting user:', error);
    }
  };

  const demoteUser = async (userId: string, role: 'admin' | 'mentor') => {
    try {
      const response = await fetch('/api/admin/demote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId, role }),
      });

      if (response.ok) {
        loadUsers();
        loadStats();
      } else {
        console.error('Failed to demote user');
      }
    } catch (error) {
      console.error('Error demoting user:', error);
    }
  };

  const banUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        loadUsers();
        loadStats();
      } else {
        console.error('Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/unban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        loadUsers();
        loadStats();
      } else {
        console.error('Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/suspend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        loadUsers();
        loadStats();
      } else {
        console.error('Failed to suspend user');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  const unsuspendUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/unsuspend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        loadUsers();
        loadStats();
      } else {
        console.error('Failed to unsuspend user');
      }
    } catch (error) {
      console.error('Error unsuspending user:', error);
    }
  };

  const displayUsers = searchTerm.trim().length >= 2 ? searchResults : users;

  if (!user?.isAdmin) {
    return (
      <div className={cn("fixed inset-0 z-50 flex items-center justify-center", isDarkMode ? "bg-gray-900" : "bg-white")}>
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className={cn("text-xl font-semibold mb-2", isDarkMode ? "text-white" : "text-gray-900")}>
            Access Denied
          </h2>
          <p className={cn("text-sm mb-4", isDarkMode ? "text-gray-400" : "text-gray-600")}>
            You need admin privileges to access this page.
          </p>
          <Button onClick={onBack} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col", isDarkMode ? "bg-gray-900" : "bg-white")}>
      {/* Header */}
      <div className={cn("border-b px-4 py-3 flex-shrink-0", isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-600" />
            <h1 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
              Admin Panel
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {stats ? (
            <>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {stats.totalUsers}
                  </div>
                  <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Total Users
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {stats.onlineUsers}
                  </div>
                  <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Online
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {stats.totalMentors}
                  </div>
                  <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Mentors
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {stats.totalAdmins}
                  </div>
                  <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Admins
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Ban className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {stats.bannedUsers}
                  </div>
                  <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Room Banned
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <UserX className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className={cn("text-2xl font-bold", isDarkMode ? "text-white" : "text-gray-900")}>
                    {stats.suspendedUsers}
                  </div>
                  <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    Suspended
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 text-center">
                    <div className="animate-pulse">
                      <div className="w-8 h-8 mx-auto mb-2 bg-gray-300 rounded"></div>
                      <div className="h-6 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Merchant Area Check */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("text-lg", isDarkMode ? "text-white" : "text-gray-900")}>
              Merchant Area Check
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={checkMerchantArea}
                disabled={merchantAreaLoading}
                className="w-full"
              >
                {merchantAreaLoading ? "Checking..." : "Check Merchant Area Users"}
              </Button>

              {merchantAreaInfo && (
                <div className={cn("p-4 rounded-lg border",
                  isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                )}>
                  {merchantAreaInfo.found ? (
                    <div className="space-y-3">
                      <h3 className={cn("font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
                        Room: {merchantAreaInfo.room.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className={cn("text-2xl font-bold", isDarkMode ? "text-blue-400" : "text-blue-600")}>
                            {merchantAreaInfo.stats.totalMembers}
                          </div>
                          <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            Total Users
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={cn("text-2xl font-bold", isDarkMode ? "text-purple-400" : "text-purple-600")}>
                            {merchantAreaInfo.stats.merchantMembers}
                          </div>
                          <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            Merchants
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={cn("text-2xl font-bold", isDarkMode ? "text-green-400" : "text-green-600")}>
                            {merchantAreaInfo.stats.onlineMembers}
                          </div>
                          <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            Online
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={cn("text-2xl font-bold", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            {merchantAreaInfo.stats.regularMembers}
                          </div>
                          <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            Regular
                          </div>
                        </div>
                      </div>

                      {merchantAreaInfo.members.length > 0 && (
                        <div className="mt-4">
                          <h4 className={cn("font-medium mb-2", isDarkMode ? "text-white" : "text-gray-900")}>
                            Members List:
                          </h4>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {merchantAreaInfo.members.map((member: any) => (
                              <div key={member.id} className={cn("flex items-center justify-between p-2 rounded text-sm",
                                isDarkMode ? "bg-gray-700" : "bg-white"
                              )}>
                                <div className="flex items-center space-x-2">
                                  <div className={cn("w-2 h-2 rounded-full",
                                    member.isOnline ? "bg-green-500" : "bg-gray-400"
                                  )} />
                                  <span className={isDarkMode ? "text-white" : "text-gray-900"}>
                                    {member.username}
                                  </span>
                                  {member.isMerchant && (
                                    <Badge className="bg-purple-100 text-purple-800 text-xs">🛍️</Badge>
                                  )}
                                  {member.isMentor && (
                                    <Badge className="bg-red-100 text-red-800 text-xs">M</Badge>
                                  )}
                                  {member.isAdmin && (
                                    <Badge variant="destructive" className="text-xs">Admin</Badge>
                                  )}
                                </div>
                                <span className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                                  Level {member.level}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className={cn("text-lg font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                        Merchant Area Not Found
                      </div>
                      <div className={cn("text-sm mt-2", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                        {merchantAreaInfo.message}
                      </div>
                      {merchantAreaInfo.availableRooms && merchantAreaInfo.availableRooms.length > 0 && (
                        <div className="mt-3">
                          <div className={cn("text-sm font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                            Available Rooms:
                          </div>
                          <div className={cn("text-xs mt-1", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                            {merchantAreaInfo.availableRooms.join(", ")}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Room Management */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center justify-between", isDarkMode ? "text-white" : "text-gray-900")}>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Chat Room Management</span>
              </div>
              <Button
                onClick={() => setShowAddRoomModal(true)}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Room</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                        {room.name}
                      </div>
                      <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                        {room.description} • Max: {room.maxMembers} members
                      </div>
                      <div className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-500")}>
                        Created: {new Date(room.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge variant={room.isPublic ? "default" : "secondary"} className="text-xs">
                        {room.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleDeleteRoom(room.id, room.name)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {rooms.length === 0 && (
                <div className="text-center py-8">
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    No user-created rooms found.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Custom Emoji Management */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center justify-between", isDarkMode ? "text-white" : "text-gray-900")}>
              <div className="flex items-center space-x-2">
                <Smile className="w-5 h-5" />
                <span>Custom Emoji Management</span>
              </div>
              <Button
                onClick={() => setShowAddEmojiModal(true)}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Emoji</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {customEmojis.map((emoji) => (
                <div
                  key={emoji.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={emoji.fileUrl}
                      alt={emoji.name}
                      className="w-8 h-8 object-contain"
                    />
                    <div>
                      <div className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                        {emoji.name}
                      </div>
                      <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                        {emoji.emojiCode}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={emoji.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {emoji.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {emoji.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => toggleEmojiStatus(emoji.id, !emoji.isActive)}
                    >
                      {emoji.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => deleteCustomEmoji(emoji.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {customEmojis.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    No custom emojis found. Add some emojis to get started.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gift Management */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center justify-between", isDarkMode ? "text-white" : "text-gray-900")}>
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5" />
                <span>Gift Management</span>
              </div>
              <Button
                onClick={() => setShowAddGiftModal(true)}
                size="sm"
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Gift</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
              {gifts.map((gift) => (
                <div
                  key={gift.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{gift.emoji}</div>
                    <div>
                      <div className={cn("font-medium text-sm", isDarkMode ? "text-white" : "text-gray-900")}>
                        {gift.name}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        <span className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                          {gift.price}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                    onClick={() => deleteGift(gift.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}

              {gifts.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    No gifts found. Add some gifts to get started.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mentor Management */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center justify-between", isDarkMode ? "text-white" : "text-gray-900")}>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Mentor Management</span>
              </div>
              <Button
                onClick={checkExpiredMentors}
                size="sm"
                className="flex items-center space-x-2"
                disabled={isCheckingExpired}
              >
                <RefreshCw className={cn("w-4 h-4", isCheckingExpired ? "animate-spin" : "")} />
                <span>Check Expired</span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mentorsList.map((mentor) => (
                <div
                  key={mentor.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200",
                    mentor.isExpired ? "border-red-500 bg-red-50 dark:bg-red-900/20" :
                    mentor.isExpiringSoon ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" : ""
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <UserAvatar
                      username={mentor.username}
                      size="sm"
                      isOnline={mentor.isOnline}
                      profilePhotoUrl={mentor.profilePhotoUrl}
                    />
                    <div>
                      <div className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                        {mentor.username}
                      </div>
                      <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                        Specialty: {mentor.mentorSpecialty || 'Not specified'}
                      </div>
                      <div className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-500")}>
                        Created: {new Date(mentor.createdAt).toLocaleDateString()}
                      </div>
                      <div className={cn("text-xs", isDarkMode ? "text-gray-500" : "text-gray-500")}>
                        Last Recharge: {mentor.lastRechargeAt ? new Date(mentor.lastRechargeAt).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Level {mentor.level}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {mentor.fansCount} fans
                      </Badge>
                      <Badge
                        variant={mentor.isExpired ? "destructive" : mentor.isExpiringSoon ? "secondary" : "default"}
                        className={cn(
                          "text-xs",
                          mentor.isExpired ? "bg-red-600 text-white" :
                          mentor.isExpiringSoon ? "bg-yellow-600 text-white" :
                          "bg-green-600 text-white"
                        )}
                      >
                        {mentor.isExpired ? "Expired" : mentor.isExpiringSoon ? "Expiring Soon" : "Active"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {mentor.daysSinceRecharge} days
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {mentor.isExpired && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => expireMentor(mentor.id)}
                      >
                        Remove Status
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => updateRechargeTime(mentor.id)}
                    >
                      Update Recharge
                    </Button>
                  </div>
                </div>
              ))}

              {mentorsList.length === 0 && (
                <div className="text-center py-8">
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                    No mentors found.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center space-x-2", isDarkMode ? "text-white" : "text-gray-900")}>
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <Input
              placeholder="Search users by username or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchUsers(e.target.value);
              }}
              className={cn("", isDarkMode ? "bg-gray-800 border-gray-700" : "")}
            />

            {/* Users List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className={cn("mt-2 text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                  Loading users...
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {displayUsers.map((u) => (
                  <div
                    key={u.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      isDarkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <UserAvatar
                        username={u.username}
                        size="sm"
                        isOnline={u.isOnline}
                        profilePhotoUrl={u.profilePhotoUrl}
                        isAdmin={u.isAdmin}
                      />
                      <div>
                        <div className={cn("font-medium", isDarkMode ? "text-white" : "text-gray-900")}>
                          {u.username}
                        </div>
                        <div className={cn("text-xs", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                          {u.email}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {u.isAdmin && (
                          <Badge variant="destructive" className="text-xs">
                            Admin
                          </Badge>
                        )}
                        {u.isMentor && (
                          <Badge variant="secondary" className="text-xs">
                            Mentor
                          </Badge>
                        )}
                        {u.isBanned && (
                          <Badge variant="destructive" className="text-xs bg-red-600">
                            Room Banned
                          </Badge>
                        )}
                        {u.isSuspended && (
                          <Badge variant="destructive" className="text-xs bg-orange-600">
                            Suspended
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Level {u.level}
                        </Badge>
                      </div>
                    </div>

                    {u.id !== user.id && (
                      <div className="flex items-center space-x-2">
                        {!u.isAdmin ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => promoteUser(u.id, 'admin')}
                          >
                            Make Admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => demoteUser(u.id, 'admin')}
                          >
                            Remove Admin
                          </Button>
                        )}

                        {!u.isMentor ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => promoteUser(u.id, 'mentor')}
                          >
                            Make Mentor
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => demoteUser(u.id, 'mentor')}
                          >
                            Remove Mentor
                          </Button>
                        )}

                        {!u.isBanned ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => banUser(u.id)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Ban from Rooms
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => unbanUser(u.id)}
                          >
                            Unban from Rooms
                          </Button>
                        )}

                        {!u.isSuspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => suspendUser(u.id)}
                          >
                            <UserX className="w-3 h-3 mr-1" />
                            Suspend Account
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => unsuspendUser(u.id)}
                          >
                            Unsuspend Account
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {displayUsers.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      {searchTerm.trim().length >= 2 ? "No users found matching your search." : "No users found."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Gift Modal */}
      <AddGiftModal
        isOpen={showAddGiftModal}
        onClose={() => setShowAddGiftModal(false)}
        onGiftAdded={loadGifts}
      />

      {/* Add Custom Emoji Modal */}
      <AddCustomEmojiModal
        isOpen={showAddEmojiModal}
        onClose={() => setShowAddEmojiModal(false)}
        onEmojiAdded={loadCustomEmojis}
      />

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddRoomModal(false)} />
          <div className={cn(
            "relative z-50 w-full max-w-md p-6 rounded-lg shadow-lg",
            isDarkMode ? "bg-gray-800" : "bg-white"
          )}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={cn("text-lg font-semibold", isDarkMode ? "text-white" : "text-gray-900")}>
                Add New Room
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddRoomModal(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Room Name
                </label>
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name"
                  maxLength={50}
                  className={cn("", isDarkMode ? "bg-gray-700 border-gray-600" : "")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Description
                </label>
                <textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="Enter room description"
                  maxLength={200}
                  rows={3}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md resize-none",
                    isDarkMode
                      ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Room Capacity
                </label>
                <Input
                  type="number"
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || 25)}
                  min={5}
                  max={100}
                  className={cn("", isDarkMode ? "bg-gray-700 border-gray-600" : "")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                  Created By
                </label>
                <Input
                  value={newRoomCreator}
                  onChange={(e) => setNewRoomCreator(e.target.value)}
                  placeholder="Enter creator username"
                  className={cn("", isDarkMode ? "bg-gray-700 border-gray-600" : "")}
                />
              </div>

              <div className={cn("p-3 rounded-md border", isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200")}>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                    Managed by: Global Admin
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowAddRoomModal(false)}
                disabled={isCreatingRoom}
              >
                Cancel
              </Button>
              <Button
                onClick={createRoom}
                disabled={isCreatingRoom || !newRoomName.trim() || !newRoomDescription.trim() || !newRoomCreator.trim()}
                className="bg-primary hover:bg-primary/90"
              >
                {isCreatingRoom ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}