import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Gift, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import Lottie from "react-lottie-player";
import { gifts } from "@/animations/gifts";

interface GiftSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: string;
    username: string;
  };
}

// Default gift categories with prices in coins
const defaultGifts = [
  { id: 'gift_box', name: 'Gift Box', price: 10, emoji: '🎁' },
  { id: 'rose', name: 'Rose', price: 5, emoji: '🌹' },
  { id: 'diamond', name: 'Diamond', price: 50, emoji: '💎' },
  { id: 'crown', name: 'Crown', price: 100, emoji: '👑' },
  { id: 'cake', name: 'Cake', price: 15, emoji: '🍰' },
  { id: 'balloon', name: 'Balloon', price: 3, emoji: '🎈' },
  { id: 'star', name: 'Star', price: 20, emoji: '⭐' },
  { id: 'heart', name: 'Heart Gift', price: 25, emoji: '💝' },
  { id: 'flower', name: 'Flower', price: 8, emoji: '🌸' },
  { id: 'sparkles', name: 'Sparkles', price: 30, emoji: '✨' },
];

export function GiftSendModal({ isOpen, onClose, recipient }: GiftSendModalProps) {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<keyof typeof defaultGifts>('gift_box'); // Default to the first category
  const [selectedGift, setSelectedGift] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendGift = async (gift: any) => {
    if (!user || isLoading) return;

    setIsLoading(true);
    try {
      const totalCost = gift.price * quantity;

      const response = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: recipient.id,
          giftId: gift.id,
          giftName: gift.name,
          price: gift.price,
          quantity: quantity,
          totalCost: totalCost,
          emoji: gift.emoji,
          category: gift.category // This might need adjustment if categories are removed
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Gift sent successfully!",
          description: `You sent ${gift.name} x${quantity} to ${recipient.username} for ${totalCost} coins.`,
        });
        onClose();
      } else {
        const errorText = await response.text();
        console.error('Gift send error:', errorText);
        let errorMessage = "Failed to send gift";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }

        toast({
          title: "Failed to send gift",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send gift:', error);
      toast({
        title: "Network error",
        description: "Failed to send gift. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `${(price / 1000).toFixed(0)}K`;
    return price.toString();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl mx-4 p-0 relative shadow-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Send Gift</h2>
              <p className="text-white/80 text-sm">to {recipient.username}</p>
            </div>
          </div>
        </div>

        {/* Default Gifts Section */}
        <div className="bg-gray-800 p-3">
          <h4 className="text-white font-medium mb-3">Default Gifts</h4>
        </div>

        {/* Gift Grid */}
        <div className="bg-gray-900 p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {defaultGifts.map((gift) => (
              <Card 
                key={gift.id}
                className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-700 transition-colors relative overflow-hidden"
                onClick={() => handleSendGift(gift)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl">
                      {gift.emoji}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium truncate">{gift.name}</p>
                      <div className="flex items-center justify-center space-x-1 mt-1">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold">
                          {formatPrice(gift.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="text-white text-sm">
                Balance: {user?.coins || 0}
              </span>
            </div>
            <Button 
              onClick={onClose}
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}