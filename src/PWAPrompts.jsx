/* ============================================================
   FinPath Nigeria — PWA UI Prompts
   Components: InstallBanner, UpdateBanner, OfflineBar, PushPrompt
   ============================================================ */

import { useState } from 'react';

const C = {
  forest: '#0B3D2E', jade: '#1A6B4A', mint: '#2ECC8A',
  gold: '#D4A017', amber: '#F0B429', rose: '#E74C3C',
  sky: '#2980B9', text: '#2C3E50', sub: '#6B7C6E',
};

// ─── INSTALL BANNER (Android "Add to Home Screen") ──────────────────────────
export function InstallBanner({ onInstall, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 500,
      maxWidth: 528, margin: '0 auto',
      background: `linear-gradient(135deg, ${C.forest}, ${C.jade})`,
      borderRadius: 16, padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      animation: 'slideUp 0.4s ease',
    }}>
      <style>{`@keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, background: C.amber, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>📲</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, color: 'white', fontSize: 14, marginBottom: 3 }}>Install FinPath App</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>Add to your home screen for faster access and offline use</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', flexShrink: 0, padding: 4 }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button onClick={onDismiss} style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '10px 0', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
          Not now
        </button>
        <button onClick={onInstall} style={{ flex: 2, background: C.amber, border: 'none', borderRadius: 10, padding: '10px 0', color: C.forest, fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
          📲 Install App
        </button>
      </div>
    </div>
  );
}

// ─── iOS INSTALL INSTRUCTIONS ────────────────────────────────────────────────
export function IOSInstallPrompt({ onDismiss }) {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.navigator.standalone;
  if (!isIOS || isInStandalone) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 560, zIndex: 500, padding: '0 16px 16px',
    }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 -8px 32px rgba(0,0,0,0.2)', border: '1px solid #E0EAE4', position: 'relative' }}>
        <button onClick={onDismiss} style={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 18, color: C.sub, cursor: 'pointer' }}>✕</button>
        <div style={{ fontWeight: 800, color: C.forest, fontSize: 15, marginBottom: 8 }}>📲 Install on iPhone</div>
        <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7, marginBottom: 14 }}>To install FinPath on your iPhone:</div>
        {[
          ['1', 'Tap the', 'Share button', '(□↑)', 'at the bottom of your browser'],
          ['2', 'Scroll down and tap', '"Add to Home Screen"', null, null],
          ['3', 'Tap', '"Add"', null, 'in the top right corner'],
        ].map(([num, pre, action, icon, post]) => (
          <div key={num} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, background: C.jade, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>{num}</div>
            <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
              {pre} <b style={{ color: C.forest }}>{action}</b>{icon ? ` ${icon}` : ''}{post ? ` ${post}` : ''}
            </div>
          </div>
        ))}
        {/* Arrow pointing to Safari share button */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 28 }}>↓</div>
          <div style={{ fontSize: 11, color: C.sub }}>Safari share button is at the bottom</div>
        </div>
      </div>
    </div>
  );
}

// ─── UPDATE AVAILABLE BANNER ─────────────────────────────────────────────────
export function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 70, left: 16, right: 16, zIndex: 500,
      maxWidth: 528, margin: '0 auto',
      background: `linear-gradient(135deg, ${C.sky}, #1a5f8a)`,
      borderRadius: 14, padding: '14px 16px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
      animation: 'slideDown 0.4s ease',
    }}>
      <style>{`@keyframes slideDown { from{transform:translateY(-100%);opacity:0} to{transform:translateY(0);opacity:1} }`}</style>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 24 }}>🔄</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 13, marginBottom: 2 }}>Update Available</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>A new version of FinPath is ready</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 16, cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onDismiss} style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '8px 0', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Later</button>
        <button onClick={onUpdate} style={{ flex: 2, background: 'white', border: 'none', borderRadius: 8, padding: '8px 0', color: C.sky, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>🔄 Update Now</button>
      </div>
    </div>
  );
}

// ─── OFFLINE BAR ─────────────────────────────────────────────────────────────
export function OfflineBar({ isOnline }) {
  const [justCameBack, setJustCameBack] = useState(false);
  const [visible, setVisible] = useState(false);

  // Track transitions
  const prev = { current: true };
  if (!prev.current && isOnline) {
    setJustCameBack(true);
    setTimeout(() => setJustCameBack(false), 3000);
  }
  prev.current = isOnline;

  if (isOnline && !justCameBack) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 560, zIndex: 600,
      background: isOnline ? '#27AE60' : '#E74C3C',
      padding: '8px 20px', textAlign: 'center',
      fontSize: 12, fontWeight: 700, color: 'white',
      transition: 'background 0.3s',
    }}>
      {isOnline ? '✅ Back online! All features restored.' : '📡 No connection — some features unavailable'}
    </div>
  );
}

// ─── PUSH NOTIFICATION PROMPT ────────────────────────────────────────────────
export function PushPrompt({ onAllow, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 500,
      maxWidth: 528, margin: '0 auto',
      background: 'white', borderRadius: 16, padding: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: '1px solid #E0EAE4',
    }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, background: C.forest + '15', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🔔</div>
        <div>
          <div style={{ fontWeight: 800, color: C.forest, fontSize: 14, marginBottom: 4 }}>Enable Notifications</div>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>Get alerts for trial expiry, name change decisions, investment tips, and FinPath updates.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onDismiss} style={{ flex: 1, background: '#F0F4F2', border: 'none', borderRadius: 10, padding: '11px 0', color: C.sub, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Not now</button>
        <button onClick={onAllow} style={{ flex: 2, background: C.forest, border: 'none', borderRadius: 10, padding: '11px 0', color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>🔔 Allow Notifications</button>
      </div>
    </div>
  );
}
