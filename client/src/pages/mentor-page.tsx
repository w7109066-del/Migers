import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user/user-avatar';
import { ArrowLeft, Star, MessageCircle, Users, BookOpen, ShoppingBag, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mentor {
  id: string;
  username: string;
  profilePhotoUrl?: string;
  mentorSpecialty?: string;
  level: number;
  isOnline: boolean;
  fansCount: number;
  isMerchant?: boolean;
  merchantRegisteredAt?: string;
  lastRechargeAt?: string;
}

interface MentorPageProps {
  open: boolean;
  onClose: () => void;
}

export function MentorPage({ open, onClose }: MentorPageProps) {
  const { user, isDarkMode } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isRegisteringMerchant, setIsRegisteringMerchant] = useState(false);
  const [merchantCount, setMerchantCount] = useState(0);
  const [merchantUsername, setMerchantUsername] = useState('');
  const [isAddingMerchant, setIsAddingMerchant] = useState(false);
  const [merchantList, setMerchantList] = useState<Mentor[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(false);

  useEffect(() => {
    loadMentors();
    loadMerchantCount();
    loadMerchantList();
  }, []);

  const loadMerchantCount = async () => {
    try {
      const response = await fetch('/api/merchants/count', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMerchantCount(data.count);
      }
    } catch (error) {
      console.error('Failed to load merchant count:', error);
    }
  };

  const loadMerchantList = async () => {
    setIsLoadingMerchants(true);
    try {
      const response = await fetch('/api/merchants/list', {
        credentials: 'include',
      });

      if (response.ok) {
        const merchantData = await response.json();
        setMerchantList(merchantData);
      }
    } catch (error) {
      console.error('Failed to load merchant list:', error);
    } finally {
      setIsLoadingMerchants(false);
    }
  };

  const loadMentors = async () => {
    try {
      const response = await fetch('/api/mentors', {
        credentials: 'include',
      });

      if (response.ok) {
        const mentorData = await response.json();
        setMentors(mentorData);
      }
    } catch (error) {
      console.error('Failed to load mentors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  

  const handleRegisterAsMerchant = async () => {
    setIsRegisteringMerchant(true);
    try {
      const response = await fetch('/api/merchant/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        alert('Successfully registered as merchant!');
        window.location.reload(); // Refresh to update user data
      } else {
        alert('Failed to register as merchant');
      }
    } catch (error) {
      console.error('Failed to register as merchant:', error);
      alert('Failed to register as merchant');
    } finally {
      setIsRegisteringMerchant(false);
    }
  };

  const handleAddMerchant = async () => {
    if (!merchantUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    setIsAddingMerchant(true);
    try {
      const response = await fetch('/api/admin/add-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: merchantUsername.trim() }),
      });

      if (response.ok) {
        alert(`Successfully added ${merchantUsername} as merchant!`);
        setMerchantUsername('');
        await loadMerchantCount(); // Refresh merchant count
        await loadMerchantList(); // Refresh merchant list
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to add merchant');
      }
    } catch (error) {
      console.error('Failed to add merchant:', error);
      alert('Failed to add merchant');
    } finally {
      setIsAddingMerchant(false);
    }
  };

  const getMerchantStatusColor = (merchant: any) => {
    if (!merchant.lastRechargeAt) {
      // Just registered, purple color
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200';
    }

    const lastRecharge = new Date(merchant.lastRechargeAt);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (lastRecharge > oneMonthAgo) {
      // Active merchant - bright purple
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-200';
    } else {
      // Inactive merchant - faded purple
      return 'bg-purple-50 text-purple-400 border-purple-100 dark:bg-purple-900/10 dark:text-purple-400';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getMerchantExpiryDate = (lastRechargeDate?: string) => {
    if (!lastRechargeDate) return 'Tidak ada recharge';
    const lastRecharge = new Date(lastRechargeDate);
    const expiry = new Date(lastRecharge);
    expiry.setMonth(expiry.getMonth() + 1);
    return formatDate(expiry.toISOString());
  };

  const isMerchantExpired = (lastRechargeDate?: string) => {
    if (!lastRechargeDate) return true;
    const lastRecharge = new Date(lastRechargeDate);
    const expiry = new Date(lastRecharge);
    expiry.setMonth(expiry.getMonth() + 1);
    return new Date() > expiry;
  };

  const MerchantListCard = () => (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
      <CardHeader>
        <CardTitle className="text-purple-800 dark:text-purple-200 flex items-center space-x-2">
          <Users className="w-5 h-5 text-purple-600" />
          <span>Daftar Merchant ({merchantCount})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingMerchants ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-purple-600 dark:text-purple-400">Loading merchants...</p>
          </div>
        ) : merchantList.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <p className="text-purple-600 dark:text-purple-400">Belum ada merchant terdaftar</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {merchantList.map((merchant) => (
              <div
                key={merchant.id}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-purple-600">
                        {merchant.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-purple-800 dark:text-purple-200">
                            {merchant.username}
                          </h4>
                          <Badge className={getMerchantStatusColor(merchant)}>
                            {isMerchantExpired(merchant.lastRechargeAt) ? 'Expired' : 'Active'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 mb-1">
                              <Calendar className="w-3 h-3" />
                              <span className="font-medium">Tanggal Daftar:</span>
                            </div>
                            <p className="text-purple-600 dark:text-purple-400 ml-5">
                              {formatDate(merchant.merchantRegisteredAt)}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 mb-1">
                              <CreditCard className="w-3 h-3" />
                              <span className="font-medium">Status:</span>
                            </div>
                            <p className={cn(
                              "ml-5",
                              isMerchantExpired(merchant.lastRechargeAt) 
                                ? "text-red-600 dark:text-red-400" 
                                : "text-purple-600 dark:text-purple-400"
                            )}>
                              {merchant.lastRechargeAt 
                                ? (isMerchantExpired(merchant.lastRechargeAt) ? 'Expired' : 'Active until ' + getMerchantExpiryDate(merchant.lastRechargeAt))
                                : 'Just registered'
                              }
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-purple-100 dark:border-purple-800">
                          <div className="flex items-center space-x-4 text-xs text-purple-600 dark:text-purple-400">
                            <span>Level {merchant.level || 1}</span>
                            <span>{merchant.fansCount || 0} fans</span>
                            <span className={`${merchant.isOnline ? 'text-green-500' : 'text-gray-400'}`}>
                              {merchant.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <div className="text-xs text-purple-500 dark:text-purple-400">
                            {merchant.lastRechargeAt ? `Last recharge: ${formatDate(merchant.lastRechargeAt)}` : 'Baru terdaftar'}
                          </div>
                        </div>
                      </div>
                    </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col", isDarkMode ? "bg-gray-900" : "bg-white")}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-red-200 bg-gradient-to-r from-red-600 to-red-500 text-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-red-700 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-6 h-6" />
              <h1 className="text-xl font-bold">MENTOR & MERCHANT</h1>
            </div>
          </div>
          <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-red-700 bg-opacity-50">
            <Star className="w-4 h-4 text-yellow-300" />
            <span className="text-sm font-medium">Premium Feature</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Access Check */}
        {!user?.isMentor && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                  Mentor Access Required
                </h2>
                <p className="text-red-600 dark:text-red-300 mb-4">
                  You need to be registered as a mentor by an administrator to access this feature.
                </p>
                <p className="text-sm text-red-500 dark:text-red-400 mb-6">
                  Please contact an administrator to request mentor status. Only approved mentors can access the mentor dashboard and merchant management features.
                </p>
                <div className="p-4 bg-red-100 dark:bg-red-800/30 rounded-lg border border-red-200 dark:border-red-700">
                  <p className="text-xs text-red-600 dark:text-red-300">
                    <strong>Note:</strong> Mentor registration is now handled exclusively through the admin panel to ensure quality and proper verification of mentor credentials.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mentor Dashboard - Only for registered mentors */}
        {user?.isMentor && (
          <>
            <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
              <CardHeader>
                <CardTitle className="text-red-800 dark:text-red-200 flex items-center space-x-2">
                  <Star className="w-5 h-5 text-red-600" />
                  <span>Mentor Dashboard</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {merchantCount}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Total Merchants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {user.level || 1}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      ⭐⭐⭐⭐⭐
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Rating</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-200">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Your Specialty:</strong> {user.mentorSpecialty || 'Not specified'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Merchant Management Card */}
            <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
              <CardHeader>
                <CardTitle className="text-purple-800 dark:text-purple-200 flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-purple-600" />
                  <span>Merchant Program</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Add Merchant Section */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200">
                    <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200 mb-4">
                      Add New Merchant
                    </h3>
                    <div className="flex space-x-3">
                      <Input
                        placeholder="Enter username to add as merchant"
                        value={merchantUsername}
                        onChange={(e) => setMerchantUsername(e.target.value)}
                        className="flex-1 border-purple-300 focus:border-purple-500"
                      />
                      <Button
                        onClick={handleAddMerchant}
                        disabled={isAddingMerchant || !merchantUsername.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                      >
                        {isAddingMerchant ? 'Adding...' : 'Add Merchant'}
                      </Button>
                    </div>
                  </div>

                  {/* Current User Merchant Status */}
                  {user.isMerchant && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">
                          Your Merchant Status
                        </h3>
                        <Badge className={getMerchantStatusColor(user as Mentor)}>
                          Active Merchant
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm font-medium">Registered:</span>
                          </div>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            {formatDate(user.merchantRegisteredAt)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
                            <CreditCard className="w-4 h-4" />
                            <span className="text-sm font-medium">Last Recharge:</span>
                          </div>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            {formatDate(user.lastRechargeAt)}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>Note:</strong> Merchant status will fade if no recharge is made within 1 month. 
                          Keep your merchant status active by making regular transactions.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Merchants List Card */}
            <MerchantListCard />


          </>
        )}


      </div>
    </div>
  );
}