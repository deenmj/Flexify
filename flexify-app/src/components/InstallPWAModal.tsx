import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWAModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Hide banner on scroll
  useEffect(() => {
    if (!showBanner) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastY + 20) {
        setHidden(true);
      } else if (currentY < lastY - 10) {
        setHidden(false);
      }
      lastY = currentY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showBanner]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          padding: '10px 16px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '10px 14px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto',
            transform: hidden ? 'translateY(-110%)' : 'translateY(0)',
            opacity: hidden ? 0 : 1,
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* App icon */}
          <div
            style={{
              width: '40px', height: '40px', flexShrink: 0,
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              background: '#f8fafc',
            }}
          >
            <img
              src="/favicon.png"
              alt="Rentify"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Install Rentify</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '1px' }}>Add to home screen for quick access</div>
          </div>

          {/* Install button */}
          <button
            onClick={handleInstallClick}
            style={{
              flexShrink: 0,
              padding: '7px 14px',
              border: 'none',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}
          >
            Install
          </button>

          {/* Dismiss */}
          <button
            onClick={() => setShowBanner(false)}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '1rem',
              lineHeight: 1,
              padding: '2px',
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
