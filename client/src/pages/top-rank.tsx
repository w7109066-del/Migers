
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { Trophy, Medal, Award, Crown, ArrowLeft, Coins, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface RankedUser {
  id: string;
  username: string;
  level: number;
  profilePhotoUrl?: string;
  coins: number;
  rank: number;
  isOnline: boolean;
}

export default function TopRankPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "wealth" | "gift">("daily");
  const { user } = useAuth();

  const { data: topUsers = [], isLoading } = useQuery<RankedUser[]>({
    queryKey: ["/api/users/toprank", activeTab],
    queryFn: async () => {
      let endpoint = "";
      
      if (activeTab === "wealth") {
        endpoint = `/api/toprank/wealth/all`;
      } else if (activeTab === "gift") {
        endpoint = `/api/toprank/gifts/daily`;
      } else {
        endpoint = `/api/users/toprank?period=${activeTab}`;
      }

      const response = await fetch(endpoint, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch top ranks');
      }
      return response.json();
    },
    enabled: true,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500 animate-pulse" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400 animate-bounce" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500 animate-pulse" />;
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center text-lg font-bold text-gray-700 animate-fade-in">
            {rank}
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return "Gold";
      case 2:
        return "Silver";
      case 3:
        return "Bronze";
      default:
        return null;
    }
  };

  const getTabDisplayData = () => {
    switch (activeTab) {
      case "daily":
        return { icon: "🏆", label: "Game Wins" };
      case "weekly":
        return { icon: "🏆", label: "Game Wins" };
      case "wealth":
        return { icon: "💰", label: "Total Coins" };
      case "gift":
        return { icon: "🎁", label: "Gifts Sent" };
      default:
        return { icon: "🏆", label: "Points" };
    }
  };

  const displayData = getTabDisplayData();

  const handleBackToFriends = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/30 shadow-2xl animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-800 font-medium">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-20 h-20 bg-yellow-200/30 rounded-full animate-float"></div>
        <div className="absolute top-32 right-16 w-16 h-16 bg-pink-200/30 rounded-full animate-float animation-delay-1000"></div>
        <div className="absolute bottom-32 left-20 w-24 h-24 bg-blue-200/30 rounded-full animate-float animation-delay-2000"></div>
        <div className="absolute bottom-16 right-12 w-18 h-18 bg-green-200/30 rounded-full animate-float animation-delay-3000"></div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 flex items-center justify-between text-white flex-shrink-0 shadow-xl relative z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToFriends}
          className="text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold flex items-center gap-2 animate-fade-in">
          <Trophy className="w-5 h-5 animate-pulse" />
          🇮🇩 TOP RANK
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
        >
          ?
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-4 flex space-x-3 bg-white/60 backdrop-blur-sm border-b border-white/30 relative z-10">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
            activeTab === "daily"
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm"
          }`}
        >
          Harian
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
            activeTab === "weekly"
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm"
          }`}
        >
          Mingguan
        </button>
        <button
          onClick={() => setActiveTab("wealth")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-1 ${
            activeTab === "wealth"
              ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm"
          }`}
        >
          <Coins className="w-3 h-3" />
          Kekayaan
        </button>
        <button
          onClick={() => setActiveTab("gift")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 flex items-center gap-1 ${
            activeTab === "gift"
              ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/50 backdrop-blur-sm"
          }`}
        >
          🎁 Gift
        </button>
      </div>

      {/* Top 3 Display */}
      {topUsers.length > 0 && (
        <div className="px-4 py-8 flex justify-center bg-gradient-to-b from-white/40 to-white/20 backdrop-blur-sm border-b border-white/30 relative z-10">
          <div className="text-center animate-fade-in-up">
            {/* Winner */}
            <div className="relative mb-6">
              <div className="w-28 h-28 mx-auto mb-4 relative transform hover:scale-110 transition-transform duration-300">
                <UserAvatar
                  username={topUsers[0].username}
                  size="xl"
                  isOnline={topUsers[0].isOnline}
                />
                <div className="absolute -top-3 -right-3 animate-bounce">
                  <Crown className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                  <Star className="w-6 h-6 text-yellow-400 animate-pulse" />
                </div>
              </div>
              {getRankBadge(1) && (
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white mb-3 shadow-lg animate-pulse">
                  {getRankBadge(1)}
                </Badge>
              )}
              <h3 className="text-gray-900 font-bold text-xl mb-2">{topUsers[0].username}</h3>
              <div className="text-orange-600 font-bold text-lg flex items-center justify-center gap-2">
                <span className="text-2xl">{displayData.icon}</span>
                <span>{topUsers[0].coins.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings List */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto relative z-10">
        <div className="space-y-3 py-4">
          {topUsers.map((user, index) => (
            <Card 
              key={user.id} 
              className="bg-white/70 backdrop-blur-sm border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/80 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10">
                    {getRankIcon(user.rank)}
                  </div>

                  <div className="relative transform hover:scale-110 transition-transform duration-300">
                    <UserAvatar
                      username={user.username}
                      size="sm"
                      isOnline={user.isOnline}
                    />
                    {user.rank <= 3 && (
                      <div className="absolute -top-1 -right-1 animate-bounce">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900 font-semibold">{user.username}</span>
                      {user.rank <= 3 && getRankBadge(user.rank) && (
                        <Badge className={`text-xs animate-pulse ${
                          user.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          user.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          'bg-gradient-to-r from-orange-400 to-orange-600'
                        } text-white shadow-lg`}>
                          {getRankBadge(user.rank)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-orange-600 text-sm font-bold flex items-center gap-1">
                      <span>{displayData.icon}</span>
                      <span>{user.coins.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {topUsers.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-gray-600 text-lg">Belum ada data ranking</p>
            <p className="text-gray-500 text-sm">Mulai bermain untuk masuk ke dalam ranking!</p>
          </div>
        )}

        {/* User's current position if not in top */}
        {user && topUsers.length > 0 && !topUsers.find(u => u.id === user.id) && (
          <div className="mt-6 pt-4 border-t border-white/30 bg-white/40 backdrop-blur-sm rounded-2xl p-6 animate-fade-in">
            <div className="text-gray-700 text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="font-medium">Kamu belum masuk dalam daftar ranking</p>
              <p className="text-sm text-gray-600 mt-1">
                Terus bermain dan kumpulkan poin untuk masuk ke top rank!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
