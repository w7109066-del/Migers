
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user/user-avatar';
import { ArrowLeft, Star, MessageCircle, Users, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mentor {
  id: string;
  username: string;
  profilePhotoUrl?: string;
  mentorSpecialty?: string;
  level: number;
  isOnline: boolean;
  fansCount: number;
}

interface MentorPageProps {
  open: boolean;
  onClose: () => void;
}

export function MentorPage({ open, onClose }: MentorPageProps) {
  const { user, isDarkMode } = useAuth();
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadMentors();
  }, []);

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

  const handleRegisterAsMentor = async () => {
    if (!specialty.trim()) {
      alert('Please enter your specialty');
      return;
    }

    setIsRegistering(true);
    try {
      const response = await fetch('/api/mentor/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ specialty: specialty.trim() }),
      });

      if (response.ok) {
        alert('Successfully registered as mentor!');
        await loadMentors();
        setSpecialty('');
      } else {
        alert('Failed to register as mentor');
      }
    } catch (error) {
      console.error('Failed to register as mentor:', error);
      alert('Failed to register as mentor');
    } finally {
      setIsRegistering(false);
    }
  };

  if (!open) return null;

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col", isDarkMode ? "bg-gray-900" : "bg-white")}>
      {/* Header */>
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
              <h1 className="text-xl font-bold">MENTOR</h1>
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
                  Mentor Registration Required
                </h2>
                <p className="text-red-600 dark:text-red-300 mb-6">
                  You need to register as a mentor to access this feature. Share your expertise and help others grow!
                </p>
                
                <div className="max-w-md mx-auto space-y-4">
                  <Input
                    placeholder="Enter your specialty (e.g., Programming, Design, Business)"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="border-red-300 focus:border-red-500"
                  />
                  <Button
                    onClick={handleRegisterAsMentor}
                    disabled={isRegistering || !specialty.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isRegistering ? 'Registering...' : 'Register as Mentor'}
                  </Button>
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
                      {user.fansCount || 0}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Students</div>
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

            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 dark:text-red-200">Mentor Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Mentoring Session
                </Button>
                <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Students
                </Button>
                <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Create Learning Material
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Mentors List */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Available Mentors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-red-200 rounded w-1/4"></div>
                        <div className="h-3 bg-red-100 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : mentors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-red-300" />
                <p>No mentors available yet.</p>
                <p className="text-sm">Be the first to register as a mentor!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mentors.map((mentor) => (
                  <div key={mentor.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100">
                    <div className="flex items-center space-x-3">
                      <UserAvatar
                        username={mentor.username}
                        size="md"
                        isOnline={mentor.isOnline}
                        profilePhotoUrl={mentor.profilePhotoUrl}
                      />
                      <div>
                        <div className="font-semibold text-red-800 dark:text-red-200">
                          {mentor.username}
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-300">
                          {mentor.mentorSpecialty || 'General Mentor'}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                            Level {mentor.level}
                          </Badge>
                          <div className={`w-2 h-2 rounded-full ${mentor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
