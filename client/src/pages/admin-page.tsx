
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user/user-avatar';
import { ArrowLeft, Users, Shield, BookOpen, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  username: string;
  email: string;
  level: number;
  isOnline: boolean;
  isMentor: boolean;
  isAdmin: boolean;
  profilePhotoUrl?: string;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  onlineUsers: number;
  totalMentors: number;
  totalAdmins: number;
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

  useEffect(() => {
    if (user?.isAdmin) {
      loadUsers();
      loadStats();
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

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats ? (
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
          ) : (
            <>
              {[1, 2, 3, 4].map((i) => (
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
              onChange={(e) => setSearchTerm(e.target.value)}
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
                {filteredUsers.map((u) => (
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
                      </div>
                    )}
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-600")}>
                      No users found.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
