import { useState, useEffect } from 'react';
import FinPath from './FinPath';
import { usePWA } from './usePWA';
import {
  InstallBanner,
  IOSInstallPrompt,
  UpdateBanner,
  OfflineBar,
  PushPrompt,
} from './PWAPrompts';

export default function App() {
  const {
    isOnline,
    isInstalled,
    canInstall,
    shouldShowInstallBanner,
    updateAvailable,
    pushSupported,
    pushSubscribed,
    promptInstall,
    dismissInstallBanner,
    applyUpdate,
    requestPushPermission,
  } = usePWA();

  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  // Show update banner when new SW is available
  useEffect(() => {
    if (updateAvailable) setShowUpdateBanner(true);
  }, [updateAvailable]);

  // Show push prompt after 60s if supported and not yet subscribed
  useEffect(() => {
    if (pushSupported && !pushSubscribed && isInstalled) {
      const alreadyAsked = localStorage.getItem('fp_push_asked');
      if (!alreadyAsked) {
        const timer = setTimeout(() => setShowPushPrompt(true), 60000);
        return () => clearTimeout(timer);
      }
    }
  }, [pushSupported, pushSubscribed, isInstalled]);

  // iOS: check if we should show "Add to Home Screen" instructions
  useEffect(() => {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    const iosAlreadyShown = localStorage.getItem('fp_ios_prompt_shown');
    if (isIOS && !isStandalone && !iosAlreadyShown) {
      // Show after 45 seconds
      const timer = setTimeout(() => setShowIOSPrompt(true), 45000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllowPush = async () => {
    localStorage.setItem('fp_push_asked', 'true');
    await requestPushPermission();
    setShowPushPrompt(false);
  };

  const handleDismissPush = () => {
    localStorage.setItem('fp_push_asked', 'true');
    setShowPushPrompt(false);
  };

  const handleDismissIOS = () => {
    localStorage.setItem('fp_ios_prompt_shown', 'true');
    setShowIOSPrompt(false);
  };

  return (
    <>
      {/* Offline status bar */}
      <OfflineBar isOnline={isOnline} />

      {/* Update banner */}
      {showUpdateBanner && (
        <UpdateBanner
          onUpdate={() => { applyUpdate(); setShowUpdateBanner(false); }}
          onDismiss={() => setShowUpdateBanner(false)}
        />
      )}

      {/* Install banner — Android / desktop */}
      {shouldShowInstallBanner && !showUpdateBanner && (
        <InstallBanner
          onInstall={promptInstall}
          onDismiss={dismissInstallBanner}
        />
      )}

      {/* iOS install instructions */}
      {showIOSPrompt && (
        <IOSInstallPrompt onDismiss={handleDismissIOS} />
      )}

      {/* Push notification prompt */}
      {showPushPrompt && !shouldShowInstallBanner && (
        <PushPrompt
          onAllow={handleAllowPush}
          onDismiss={handleDismissPush}
        />
      )}

      {/* Main FinPath app */}
      <FinPath />
    </>
  );
}
