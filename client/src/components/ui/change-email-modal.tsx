
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Mail, Smartphone, Send, Lock, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangeEmailModal({ isOpen, onClose }: ChangeEmailModalProps) {
  const { user, isDarkMode } = useAuth();
  const [formData, setFormData] = useState({
    newEmail: "",
    password: "",
    phoneNumber: "",
    otpCode: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const handleInputChange = (field: string, value: string) => {
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
          description: "You can now change your email.",
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

  const handleChangeEmail = async () => {
    // Validation
    if (!formData.newEmail.trim()) {
      toast({
        title: "New email required",
        description: "Please enter a new email address.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.password.trim()) {
      toast({
        title: "Password required",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.newEmail)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
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

      const response = await fetch('/api/user/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          newEmail: formData.newEmail,
          password: formData.password,
          phoneNumber: formData.phoneNumber,
          otpCode: formData.otpCode,
        }),
      });

      if (response.ok) {
        toast({
          title: "Email changed!",
          description: "Your email has been successfully updated.",
        });
        onClose();
        // Reset form
        setFormData({
          newEmail: "",
          password: "",
          phoneNumber: "",
          otpCode: "",
        });
        setOtpSent(false);
        setOtpVerified(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to change email",
          description: errorData.message || "Something went wrong.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to change email:', error);
      toast({
        title: "Network error",
        description: "Failed to change email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      newEmail: "",
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

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal>
      <DialogContent 
        className={cn("sm:max-w-md max-h-[90vh] overflow-y-auto relative", isDarkMode ? "bg-gray-900" : "bg-white")} 
        style={{ 
          zIndex: 10001,
          position: 'fixed'
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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
          <DialogTitle className="flex-1 text-center">Change Email</DialogTitle>
          <div className="w-8"></div> {/* Spacer to center the title */}
        </DialogHeader>
        
        <DialogDescription className="sr-only">
          Change your account email by providing your current password and entering a new email address. Phone verification is required for security.
        </DialogDescription>
        
        <div className="space-y-6 pt-4">
          {/* Current Email Display */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <span>Current Email</span>
            </Label>
            <Input
              value={user.email}
              disabled
              className={cn("bg-gray-100 cursor-not-allowed", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
            />
          </div>

          {/* Email Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail" className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>New Email Address</span>
              </Label>
              <Input
                id="newEmail"
                type="email"
                value={formData.newEmail}
                onChange={(e) => handleInputChange('newEmail', e.target.value)}
                placeholder="Enter your new email address"
                className={cn("", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
                autoComplete="email"
              />
            </div>

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
                autoComplete="current-password"
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
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                placeholder="+62812xxxxxxxx"
                className={cn("w-full", isDarkMode ? "bg-gray-800 border-gray-600" : "")}
                disabled={otpVerified}
              />
              <div className="flex justify-center mt-2">
                <Button
                  onClick={handleSendOTP}
                  disabled={isLoading || !formData.phoneNumber.trim() || otpVerified}
                  variant={otpSent ? "secondary" : "default"}
                  className="px-8 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {otpSent ? "OTP Sent" : "Send OTP"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                We'll send a verification code via WhatsApp
              </p>
            </div>

            {/* OTP Input */}
            {otpSent && !otpVerified && (
              <div className="space-y-4">
                <Label className="flex items-center space-x-2 justify-center">
                  <Key className="w-4 h-4" />
                  <span>Verification Code</span>
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={formData.otpCode}
                    onChange={(value) => handleInputChange('otpCode', value)}
                    className="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className={cn("w-12 h-12 text-lg", isDarkMode ? "bg-gray-800 border-gray-600" : "")} />
                      <InputOTPSlot index={1} className={cn("w-12 h-12 text-lg", isDarkMode ? "bg-gray-800 border-gray-600" : "")} />
                      <InputOTPSlot index={2} className={cn("w-12 h-12 text-lg", isDarkMode ? "bg-gray-800 border-gray-600" : "")} />
                      <InputOTPSlot index={3} className={cn("w-12 h-12 text-lg", isDarkMode ? "bg-gray-800 border-gray-600" : "")} />
                      <InputOTPSlot index={4} className={cn("w-12 h-12 text-lg", isDarkMode ? "bg-gray-800 border-gray-600" : "")} />
                      <InputOTPSlot index={5} className={cn("w-12 h-12 text-lg", isDarkMode ? "bg-gray-800 border-gray-600" : "")} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Enter the 6-digit code sent to your WhatsApp
                </p>
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={handleVerifyOTP}
                    disabled={isLoading || formData.otpCode.length !== 6}
                    className="px-8 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Verify Code
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
              onClick={handleChangeEmail}
              className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={isLoading || !otpVerified}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Changing...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Change Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
