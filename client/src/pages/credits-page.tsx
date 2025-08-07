
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Coins, Send, History, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreditsPageProps {
  onBack: () => void;
}

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  otherUser: string;
  createdAt: string;
}

export function CreditsPage({ onBack }: CreditsPageProps) {
  const { user, isDarkMode } = useAuth();
  const [recipientUsername, setRecipientUsername] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchTransactionHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch("/api/credits/history", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load transaction history",
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
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchTransactionHistory();
    }
  }, [showHistory]);

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
      console.log('Starting credit transfer:', { recipientUsername: recipientUsername.trim(), amount, pin: '******' });
      
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

      console.log('Transfer response status:', response.status);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('Transfer response data:', responseData);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Invalid server response');
      }
      
      if (response.ok) {
        // Check if response has success property or if it's a successful response
        if (responseData.success !== false) {
          toast({
            title: "Success",
            description: responseData.message || `Successfully transferred ${amount} coins to ${recipientUsername}`,
          });
          setRecipientUsername("");
          setCoinAmount("");
          setPin("");
          // Refresh history if it's currently shown
          if (showHistory) {
            fetchTransactionHistory();
          }
        } else {
          toast({
            title: "Error",
            description: responseData.message || "Transfer failed",
            variant: "destructive",
          });
        }
      } else {
        console.error('Transfer failed with status:', response.status, 'Data:', responseData);
        toast({
          title: "Error",
          description: responseData.message || `Transfer failed (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Credit transfer error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            {showHistory ? "TRANSACTION HISTORY" : "CREDITS"}
          </h1>
        </div>
        
        {/* Balance and History Toggle */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={cn("p-2", isDarkMode ? "text-gray-300 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-100")}
          >
            {showHistory ? <Send className="w-5 h-5" /> : <History className="w-5 h-5" />}
          </Button>
          <div className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className={cn("font-semibold", isDarkMode ? "text-gray-200" : "text-gray-800")}>
              {user?.coins || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {!showHistory ? (
          // Transfer Form
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

              {/* Level restriction removed */}

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleTransfer}
                  disabled={isLoading || !recipientUsername.trim() || !coinAmount.trim() || pin.length !== 6}
                  className="w-full max-w-xs bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
        ) : (
          // Transaction History
          <Card>
            <CardHeader>
              <CardTitle className={cn("text-lg", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className={cn("text-lg font-medium", isDarkMode ? "text-gray-300" : "text-gray-600")}>
                    No transactions yet
                  </p>
                  <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                    Your coin transfer history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border",
                        isDarkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          transaction.type === 'sent' 
                            ? "bg-red-100 text-red-600" 
                            : "bg-green-100 text-green-600"
                        )}>
                          {transaction.type === 'sent' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                            {transaction.type === 'sent' ? 'Sent to' : 'Received from'} {transaction.otherUser}
                          </p>
                          <p className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                            {formatDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          transaction.type === 'sent' ? "text-red-600" : "text-green-600"
                        )}>
                          {transaction.type === 'sent' ? '-' : '+'}{transaction.amount} coins
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
