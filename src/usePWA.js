/* ============================================================
   FinPath Nigeria — usePWA Hook
   Exposes: install prompt, update banner, online status, push
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt]   = useState(null);
  const [isInstalled, setIsInstalled]       = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);
  const [pushSupported, setPushSupported]   = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  // ─── Online / Offline detection ────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // ─── Check if already installed ────────────────────────────────────────────
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.includes('android-app://');
    setIsInstalled(isStandalone);

    // Listen for display mode change
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      setIsInstalled(e.matches);
    });
  }, []);

  // ─── Capture install prompt ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Show banner after 30 seconds if not installed
      if (!isInstalled) {
        setTimeout(() => setShowInstallBanner(true), 30000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setInstallPrompt(null);
      console.log('[PWA] App installed successfully!');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  // ─── Service Worker update detection ────────────────────────────────────────
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setSwRegistration(registration);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      });

      // Listen for controlling SW change
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    }
  }, []);

  // ─── Push notification support check ────────────────────────────────────────
  useEffect(() => {
    if ('PushManager' in window && 'Notification' in window) {
      setPushSupported(true);
      if (Notification.permission === 'granted') {
        checkPushSubscription();
      }
    }
  }, []);

  async function checkPushSubscription() {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setPushSubscribed(!!subscription);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setShowInstallBanner(false);
    }
    return outcome === 'accepted';
  }, [installPrompt]);

  const dismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    // Don't show again for 7 days
    localStorage.setItem('fp_install_dismissed', Date.now().toString());
  }, []);

  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setUpdateAvailable(false);
  }, [swRegistration]);

  const requestPushPermission = useCallback(async () => {
    if (!pushSupported) return false;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Subscribe with your VAPID public key (replace when you have a backend)
        // const subscription = await registration.pushManager.subscribe({
        //   userVisibleOnly: true,
        //   applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
        // });
        // await saveSubscriptionToServer(subscription);
        setPushSubscribed(true);
        return true;
      } catch (err) {
        console.error('[PWA] Push subscription failed:', err);
        return false;
      }
    }
    return false;
  }, [pushSupported]);

  // Check if install banner was recently dismissed
  const bannerDismissed = localStorage.getItem('fp_install_dismissed');
  const recentlyDismissed = bannerDismissed && (Date.now() - parseInt(bannerDismissed)) < 7 * 24 * 60 * 60 * 1000;
  const shouldShowInstallBanner = showInstallBanner && !isInstalled && !recentlyDismissed && !!installPrompt;

  return {
    // State
    isInstalled,
    isOnline,
    updateAvailable,
    pushSupported,
    pushSubscribed,
    canInstall: !!installPrompt && !isInstalled,
    shouldShowInstallBanner,

    // Actions
    promptInstall,
    dismissInstallBanner,
    applyUpdate,
    requestPushPermission,
  };
}
