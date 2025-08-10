import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Shield, Lock, Mail, Key } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ChangePasswordModal } from "./change-password-modal";
import { ChangeEmailModal } from "./change-email-modal";
import { SetPinModal } from "./set-pin-modal";
import { cn } from "@/lib/utils";

interface PrivacySecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacySecurityModal({ isOpen, onClose }: PrivacySecurityModalProps) {
  const { isDarkMode } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showSetPin, setShowSetPin] = useState(false);

  const handleClose = () => {
    // Only close if no sub-modals are open
    if (!showChangePassword && !showChangeEmail && !showSetPin) {
      onClose();
    }
  };

  const handleMainClose = () => {
    // Force close all modals
    setShowChangePassword(false);
    setShowChangeEmail(false);
    setShowSetPin(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleMainClose}>
        <DialogContent
          className={cn("sm:max-w-md", isDarkMode ? "bg-gray-900" : "bg-white")}
          style={{ zIndex: 9998 }}
          onPointerDownOutside={(e) => {
            // Prevent closing if any sub-modal is open
            if (showChangePassword || showChangeEmail || showSetPin) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (showChangePassword || showChangeEmail || showSetPin) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="flex flex-row items-center space-y-0 space-x-2 pb-4 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMainClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DialogTitle className="flex-1 text-center">Privacy & Security</DialogTitle>
            <div className="w-8"></div> {/* Spacer to center the title */}
          </DialogHeader>

          <DialogDescription className="sr-only">
            Manage your privacy and security settings including password, email, and PIN.
          </DialogDescription>

          <div className="space-y-2 pt-4">
            {/* Change Password */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Change Password clicked - current state:', showChangePassword);
                setShowChangePassword(true);
                console.log('Change Password state set to true');
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "w-full p-4 text-left flex items-center space-x-3 rounded-lg transition-colors",
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                  Change Password
                </div>
                <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                  Update your account password
                </div>
              </div>
            </button>

            {/* Change Email */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Change Email clicked');
                setShowChangeEmail(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "w-full p-4 text-left flex items-center space-x-3 rounded-lg transition-colors",
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                  Change Email
                </div>
                <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                  Update your email address
                </div>
              </div>
            </button>

            {/* Set PIN */}
            <button
              onClick={() => {
                console.log('Set PIN clicked');
                setShowSetPin(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className={cn(
                "w-full p-4 text-left flex items-center space-x-3 rounded-lg transition-colors",
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className={cn("font-medium", isDarkMode ? "text-gray-200" : "text-gray-800")}>
                  Set PIN
                </div>
                <div className={cn("text-sm", isDarkMode ? "text-gray-400" : "text-gray-500")}>
                  Set a 6-digit PIN for additional security
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-modals */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <ChangeEmailModal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
      />

      <SetPinModal
        isOpen={showSetPin}
        onClose={() => setShowSetPin(false)}
      />
    </>
  );
}