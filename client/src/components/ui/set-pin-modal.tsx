
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Lock, Smartphone, Send, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SetPinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetPinModal({ isOpen, onClose }: SetPinModalProps) {
  const { user, isDarkMode } = useAuth();
  const [formData, setFormData] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
    password: "",
    phoneNumber: "",
    otpCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [hasExistingPin, setHasExistingPin] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'newPin' || field === 'confirmPin' || field === 'currentPin') {
      // Only allow numbers and limit to 6 digits
      value = value.replace(/\D/g, '').slice(0, 6);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendOTP = async () => {
    if (!formData.phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to send OTP.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/user/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
      });

      if (response.ok) {
        setOtpSent(true);
        toast({
          title: "OTP sent!",
          description: "Check your WhatsApp for the verification code.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to send OTP",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send OTP:', error);
      toast({
        title: "Network error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otpCode.trim()) {
      toast({
        title: "OTP code required",
        description: "Please enter the verification code from WhatsApp.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/user/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          phoneNumber: formData.phoneNumber,
          otpCode: formData.otpCode 
        }),
      });

      if (response.ok) {
        setOtpVerified(true);
        toast({
          title: "OTP verified!",
          description: "You can now set your PIN.",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Invalid OTP",
          description: errorData.message || "The verification code is incorrect.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      toast({
        title: "Network error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPin = async () => {
    // Validation
    if (!formData.password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }

    if (hasExistingPin && !formData.currentPin.trim()) {
      toast({
        title: "Current PIN required",
        description: "Please enter your current PIN.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.newPin.trim()) {
      toast({
        title: "New PIN required",
        description: "Please enter a new PIN.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPin.length !== 6) {
      toast({
        title: "Invalid PIN length",
        description: "PIN must be exactly 6 digits.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPin !== formData.confirmPin) {
      toast({
        title: "PINs don't match",
        description: "New PIN and confirmation PIN must match.",
        variant: "destructive",
      });
      return;
    }

    if (!otpVerified) {
      toast({
        title: "OTP verification required",
        description: "Please verify your phone number first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/user/set-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPin: hasExistingPin ? formData.currentPin : undefined,
          newPin: formData.newPin,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          otpCode: formData.otpCode,
        }),
      });

      if (response.ok) {
        toast({
          title: "PIN set successfully!",
          description: "Your PIN has been updated.",
        });
        onClose();
        // Reset form
        setFormData({
          currentPin: "",
          newPin: "",
          confirmPin: "",
          password: "",
          phoneNumber: "",
          otpCode: "",
        });
        setOtpSent(false);
        setOtpVerified(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to set PIN",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to set PIN:', error);
      toast({
        title: "Network error",
        description: "Failed to set PIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      currentPin: "",
      newPin: "",
      confirmPin: "",
      password: "",
      phoneNumber: "",
      otpCode: "",
    });
    setOtpSent(false);
    setOtpVerified(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Check if user has existing PIN on mount
  useState(() => {
    // This would typically come from user data
    setHasExistingPin(false); // Set based on actual user data
  });

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-md max-h-[90vh] overflow-y-auto relative", isDarkMode ? "bg-gray-900" : "bg-white")} style={{ zIndex: 9999 }}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-[99999] rounded-lg">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Processing...</p>
            </div>
          </div>
        )}
        
        <DialogHeader className="flex flex-row items-center space-y-0 space-x-2 pb-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <DialogTitle className="flex-1 text-center">{hasExistingPin ? 'Change PIN' : 'Set PIN'}</DialogTitle>
          <div className="w-8"></div> {/* Spacer to center the title */}
        </DialogHeader>
        
        <DialogDescription className="sr-only">
          {hasExistingPin ? 'Change your existing PIN by providing your current PIN and setting a new one.' : 'Set a 6-digit PIN for additional security.'} Phone verification is required.
        </DialogDescription>
        
        <div className="space-y-6 pt-4">
          {/* PIN Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Current Password</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter your current password"
                className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
              />
            </div>

            {hasExistingPin && (
              <div className="space-y-2">
                <Label htmlFor="currentPin" className="flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Current PIN</span>
                </Label>
                <Input
                  id="currentPin"
                  type="password"
                  value={formData.currentPin}
                  onChange={(e) => handleInputChange('currentPin', e.target.value)}
                  placeholder="Enter your current 6-digit PIN"
                  maxLength={6}
                  className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="newPin" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>New PIN</span>
              </Label>
              <Input
                id="newPin"
                type="password"
                value={formData.newPin}
                onChange={(e) => handleInputChange('newPin', e.target.value)}
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
              />
              <p className="text-xs text-gray-500">PIN must be exactly 6 digits</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Confirm New PIN</span>
              </Label>
              <Input
                id="confirmPin"
                type="password"
                value={formData.confirmPin}
                onChange={(e) => handleInputChange('confirmPin', e.target.value)}
                placeholder="Confirm your 6-digit PIN"
                maxLength={6}
                className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
              />
            </div>
          </div>

          {/* Phone Number Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <span>Phone Number</span>
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+62812xxxxxxxx"
                  className={cn("flex-1", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
                  disabled={otpVerified}
                />
                <Button
                  onClick={handleSendOTP}
                  disabled={isLoading || !formData.phoneNumber.trim() || otpVerified}
                  size="sm"
                  variant={otpSent ? "secondary" : "default"}
                  className="whitespace-nowrap"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {otpSent ? "Sent" : "Send OTP"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                We'll send a verification code via WhatsApp
              </p>
            </div>

            {/* OTP Input */}
            {otpSent && !otpVerified && (
              <div className="space-y-2">
                <Label htmlFor="otpCode">Verification Code</Label>
                <div className="flex space-x-2">
                  <Input
                    id="otpCode"
                    type="text"
                    value={formData.otpCode}
                    onChange={(e) => handleInputChange('otpCode', e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className={cn("flex-1", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
                  />
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isLoading || !formData.otpCode.trim()}
                    size="sm"
                  >
                    Verify
                  </Button>
                </div>
              </div>
            )}

            {/* OTP Verified Status */}
            {otpVerified && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Phone number verified</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSetPin}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={isLoading || !otpVerified}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Setting...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {hasExistingPin ? 'Change PIN' : 'Set PIN'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
