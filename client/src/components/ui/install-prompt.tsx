
import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      console.log('Install prompt event fired');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = (window.navigator as any).standalone || isStandalone;
    
    console.log('PWA Install Status:', { isInstalled, isStandalone });

    // For Android Chrome, show manual install prompt after delay
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    
    if (isAndroid && isChrome && !isInstalled) {
      setTimeout(() => {
        console.log('Showing manual install prompt for Android Chrome');
        setShowInstallPrompt(true);
      }, 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      } catch (error) {
        console.error('Error showing install prompt:', error);
        setShowInstallPrompt(false);
      }
    } else {
      // Manual install instructions for Android Chrome
      const instructions = `Untuk menginstall aplikasi ini:

1. Ketuk menu (⋮) di pojok kanan atas Chrome
2. Pilih "Tambahkan ke layar utama" atau "Add to Home screen"
3. Ketuk "Tambah" atau "Add"

Aplikasi akan muncul di home screen Anda seperti aplikasi biasa!`;
      
      alert(instructions);
      setShowInstallPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Download className="h-5 w-5 text-blue-500" />
          <div>
            <p className="font-medium text-sm">Install MeChat</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Tambahkan ke layar utama untuk pengalaman lebih baik
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={handleInstallClick}>
            Install
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
