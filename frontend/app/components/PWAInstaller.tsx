"use client";
import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW registered:', reg.scope);
      }).catch(err => {
        console.error('SW registration failed:', err);
      });
    }

    // Detect iOS
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const standalone = (window.navigator as any).standalone;
    setIsIOS(ios && !standalone);

    // Listen for install prompt (Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setInstallPrompt(null);
  };

  if (!showBanner && !isIOS) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-in">
      <div className="rounded-2xl border shadow-2xl p-4 flex items-center gap-4"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <img src="/icons/icon-192.png" alt="NexusCare" className="w-12 h-12 rounded-xl" />
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            Install NexusCare
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {isIOS
              ? 'Tap Share → Add to Home Screen'
              : 'Install for quick access and offline use'}
          </p>
        </div>
        {!isIOS && (
          <button onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
            Install
          </button>
        )}
        <button onClick={() => setShowBanner(false)}
          className="text-xs px-2 py-1 rounded-lg hover:opacity-70 transition"
          style={{ color: 'var(--muted)' }}>
          ✕
        </button>
      </div>
    </div>
  );
}