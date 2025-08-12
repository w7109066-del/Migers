import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { Trophy, Medal, Award, Crown, ArrowLeft } from "lucide-react";
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

const mockTopUsers: RankedUser[] = [
  {
    id: "1",
    username: "dev",
    level: 84750,
    coins: 84750,
    rank: 1,
    isOnline: true,
    profilePhotoUrl: undefined
  },
  {
    id: "2",
    username: "dimas",
    level: 83439,
    coins: 83439,
    rank: 2,
    isOnline: true,
    profilePhotoUrl: undefined
  },
  {
    id: "3",
    username: "asu",
    level: 78160,
    coins: 78160,
    rank: 3,
    isOnline: false,
    profilePhotoUrl: undefined
  },
  {
    id: "4",
    username: "bob_al",
    level: 75820,
    coins: 75820,
    rank: 4,
    isOnline: true,
    profilePhotoUrl: undefined
  }
];

export default function TopRankPage() {
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const { user } = useAuth();

  const { data: topUsers = mockTopUsers, isLoading } = useQuery<RankedUser[]>({
    queryKey: ["/api/users/toprank", activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/users/toprank?period=${activeTab}`, {
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
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-lg font-bold text-gray-600">{rank}</div>;
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

  const handleBackToFriends = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-gradient-to-b from-orange-400 to-orange-600 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <p className="text-white">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gradient-to-b from-orange-400 to-orange-600 flex flex-col">
      {/* Header */}
      <div className="bg-red-600 px-4 py-3 flex items-center justify-between text-white flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToFriends}
          className="text-white hover:bg-white/20 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-bold">🇮🇩 TOP RANK</h1>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 backdrop-blur-sm"
        >
          ?
        </Button>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 flex space-x-4">
        <button
          onClick={() => setActiveTab("daily")}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === "daily"
              ? "bg-white text-orange-600"
              : "text-white/80 hover:text-white"
          }`}
        >
          Harian
        </button>
        <button
          onClick={() => setActiveTab("weekly")}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === "weekly"
              ? "bg-white text-orange-600"
              : "text-white/80 hover:text-white"
          }`}
        >
          Mingguan
        </button>
        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === "monthly"
              ? "bg-white text-orange-600"
              : "text-white/80 hover:text-white"
          }`}
        >
          gift
        </button>
      </div>

      {/* Top 3 Display */}
      {topUsers.length > 0 && (
        <div className="px-4 py-6 flex justify-center relative z-10">
          <div className="text-center">
            {/* Winner */}
            <div className="relative mb-4">
              <div className="w-24 h-24 mx-auto mb-2 relative">
                <UserAvatar
                  username={topUsers[0].username}
                  size="xl"
                  isOnline={topUsers[0].isOnline}
                />
                <div className="absolute -top-2 -right-2">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              {getRankBadge(1) && (
                <Badge className="bg-yellow-500 text-white mb-2">
                  {getRankBadge(1)}
                </Badge>
              )}
              <h3 className="text-white font-bold text-lg">{topUsers[0].username}</h3>
              <div className="text-yellow-300 font-semibold">
                🔥 {topUsers[0].coins.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings List */}
      <div className="flex-1 bg-gradient-to-b from-transparent to-black/10 px-4 pb-4 overflow-y-auto relative z-10">
        <div className="space-y-3">
          {topUsers.map((user, index) => (
            <Card key={user.id} className="bg-orange-400/50 border-none">
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(user.rank)}
                  </div>

                  <div className="relative">
                    <UserAvatar
                      username={user.username}
                      size="sm"
                      isOnline={user.isOnline}
                    />
                    {user.rank <= 3 && (
                      <div className="absolute -top-1 -right-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold">{user.username}</span>
                      {user.rank <= 3 && getRankBadge(user.rank) && (
                        <Badge className={`text-xs ${
                          user.rank === 1 ? 'bg-yellow-500' :
                          user.rank === 2 ? 'bg-gray-400' :
                          'bg-orange-500'
                        } text-white`}>
                          {getRankBadge(user.rank)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-yellow-300 text-sm font-medium">
                      🔥 {user.coins.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User's current position if not in top */}
        {user && !topUsers.find(u => u.id === user.id) && (
          <div className="mt-6 pt-4 border-t border-white/20 bg-white/5 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-white text-center text-sm">
              Saya belum ada dalam daftar, dibutuhkan ~6980 untuk masuk daftar
            </div>
          </div>
        )}
      </div>
    </div>
  );
}