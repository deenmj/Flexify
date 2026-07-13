import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWAModal() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show our custom modal
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the native install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '2rem 1.75rem',
        maxWidth: '360px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        textAlign: 'center',
        position: 'relative',
        animation: 'pwa-modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Close button */}
        <button
          onClick={() => setShowModal(false)}
          style={{
            position: 'absolute', top: '12px', right: '14px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.25rem', color: '#94a3b8', lineHeight: 1,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* App icon */}
        <div style={{
          width: '64px', height: '64px',
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          background: '#ffffff'
        }}>
          <img
            src="/favicon.png"
            alt="Rentify"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <h2 style={{
          fontSize: '1.25rem', fontWeight: 800, color: '#0f172a',
          margin: '0 0 2px',
        }}>
          Install Rentify
        </h2>
        <p style={{
          fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500,
          margin: '0 0 1rem',
        }}>
          rentify.lk
        </p>
        <p style={{
          fontSize: '0.9rem', color: '#475569', lineHeight: 1.5,
          margin: '0 0 1.5rem',
        }}>
          Add our app to your home screen for a faster, app-like experience with instant access!
        </p>

        {/* Install button */}
        <button
          onClick={handleInstallClick}
          style={{
            width: '100%',
            padding: '14px 0',
            border: 'none',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(-1px)';
            (e.target as HTMLElement).style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.45)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.transform = 'translateY(0)';
            (e.target as HTMLElement).style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.35)';
          }}
        >
          Install App
        </button>

        {/* Maybe later link */}
        <button
          onClick={() => setShowModal(false)}
          style={{
            display: 'block',
            margin: '12px auto 0',
            background: 'none', border: 'none',
            color: '#94a3b8', fontSize: '0.8rem', fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes pwa-modal-in {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
