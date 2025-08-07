
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Coins, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreditsPageProps {
  onBack: () => void;
}

export function CreditsPage({ onBack }: CreditsPageProps) {
  const { user, isDarkMode } = useAuth();
  const [recipientUsername, setRecipientUsername] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTransfer = async () => {
    if (!recipientUsername.trim()) {
      toast({
        title: "Error",
        description: "Please enter recipient username",
        variant: "destructive",
      });
      return;
    }

    if (!coinAmount.trim() || parseInt(coinAmount) <= 0) {
      toast({
        title: "Error", 
        description: "Please enter a valid coin amount",
        variant: "destructive",
      });
      return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      toast({
        title: "Error",
        description: "PIN must be exactly 6 digits",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(coinAmount);
    if (amount > (user?.coins || 0)) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/credits/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientUsername: recipientUsername.trim(),
          amount,
          pin,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Successfully transferred ${amount} coins to ${recipientUsername}`,
        });
        setRecipientUsername("");
        setCoinAmount("");
        setPin("");
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Transfer failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("h-full flex flex-col", isDarkMode ? "bg-gray-800" : "bg-gray-50")}>
      {/* Header */}
      <div className={cn("flex items-center justify-between p-4 border-b", isDarkMode ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200")}>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className={cn("p-2", isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className={cn("text-lg font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
            CREDITS
          </h1>
        </div>
        
        {/* Balance in top right corner */}
        <div className="flex items-center space-x-2">
          <Coins className="w-5 h-5 text-yellow-400" />
          <span className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
            {user?.coins || 0}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Recipient Username Input */}
            <div className="space-y-2">
              <label className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                Recipient Username
              </label>
              <Input
                placeholder="Enter username"
                value={recipientUsername}
                onChange={(e) => setRecipientUsername(e.target.value)}
                className={cn(isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white")}
              />
            </div>

            {/* Coin Amount Input */}
            <div className="space-y-2">
              <label className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                Amount (Coins)
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                min="1"
                max={user?.coins || 0}
                className={cn(isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white")}
              />
            </div>

            {/* PIN Input */}
            <div className="space-y-2">
              <label className={cn("text-sm font-medium", isDarkMode ? "text-gray-300" : "text-gray-700")}>
                PIN (6 digits)
              </label>
              <Input
                type="password"
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPin(value);
                }}
                maxLength={6}
                className={cn(isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white")}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleTransfer}
                disabled={isLoading || !recipientUsername.trim() || !coinAmount.trim() || pin.length !== 6}
                className="w-full max-w-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Transfer Coins</span>
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
