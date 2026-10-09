import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, GitPullRequest, ArrowLeft, ExternalLink, Terminal, Radio } from 'lucide-react';
import confetti from 'canvas-confetti';

const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
  mass: 0.8
};

export default function HeraldPage({
  isWorking,
  prUrl,
  prNumber = 42,
  repoUrl = 'https://github.com/dhanrajgupta2736/pvg_vasuki',
  onBackToOverview
}) {
  const [dispatching, setDispatching] = useState(false);
  const activePr = prUrl || `${repoUrl}/pull/new/aistudio`;

  const handleDispatchPr = () => {
    setDispatching(true);
    try {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#ffcc00', '#10b981', '#ffffff']
      });
    } catch {
      // ignore
    }
    setTimeout(() => {
      setDispatching(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.3 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
    >
      {/* ── TOP HERO HEADER ── */}
      <div style={{
        background: '#ffffff',
        border: '3px solid #111111',
        boxShadow: '6px 6px 0px #111111',
        padding: '18px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <motion.button
            whileHover={{ scale: 1.08, x: -2 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={onBackToOverview}
            className="bauhaus-btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.72rem',
              background: '#f4efe6',
              color: '#111111',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={13} />
            OVERVIEW
          </motion.button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                width: '16px',
                height: '16px',
                background: '#1d4ed8',
                border: '2px solid #111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.65rem'
              }}>
                ⚐
              </span>
              <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em', margin: 0 }}>
                AGENT 05: HERALD // GITHUB PR DISPATCHER &amp; CI/CD RELAY
              </h1>
            </div>
            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#4a4842', fontWeight: 700, marginTop: '2px' }}>
              AUTONOMOUS BRANCH PROMOTION • ZERO-CLICK SECURE PULL REQUEST DISPATCH
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleDispatchPr}
            className="bauhaus-btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.72rem',
              background: '#1d4ed8',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            <Send size={13} className={dispatching ? 'animate-bounce' : ''} />
            {dispatching ? 'DISPATCHING TO GITHUB...' : 'DISPATCH NEW PR'}
          </motion.button>

          <span className="font-mono" style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            padding: '5px 10px',
            fontSize: '0.68rem',
            fontWeight: 900
          }}>
            PR #{prNumber} READY
          </span>
        </div>
      </div>

      {/* ── MIDDLE GRID: ORBITAL SATELLITE DISPATCH DECK + PR METADATA ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '20px'
      }}>
        {/* Left: The Orbital Satellite Dispatch Chamber */}
        <motion.div
          whileHover={{ y: -4, x: -2, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
          style={{
            background: '#070f1a',
            border: '3px solid #111111',
            boxShadow: '6px 6px 0px #111111',
            padding: '20px',
            color: '#60a5fa',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '430px'
          }}
        >
          {/* Top HUD */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <div className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 900, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={14} />
              <span>ORBITAL CI/CD RELAY // TARGET: aistudio branch</span>
            </div>
            <div className="font-mono" style={{
              background: '#1d4ed8',
              color: '#ffffff',
              padding: '2px 8px',
              fontSize: '0.62rem',
              fontWeight: 800,
              border: '1.5px solid #ffffff'
            }}>
              SIGNAL LOCKED
            </div>
          </div>

          {/* Central Orbital Starfield Graphic */}
          <div style={{
            position: 'relative',
            height: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Concentric Telemetry Ripple Waves */}
            {[0, 0.7, 1.4].map((delay, idx) => (
              <motion.div
                key={idx}
                animate={{ scale: [0.3, 1.8], opacity: [0.9, 0] }}
                transition={{ repeat: Infinity, duration: isWorking || dispatching ? 1.4 : 2.6, delay, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '2px solid #3b82f6',
                  pointerEvents: 'none'
                }}
              />
            ))}

            {/* Orbiting Satellite Data Node */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: isWorking || dispatching ? 3 : 7, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                pointerEvents: 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                width: '12px',
                height: '12px',
                background: '#ffcc00',
                border: '2px solid #111111',
                boxShadow: '0 0 10px #ffcc00'
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                width: '10px',
                height: '10px',
                background: '#e02424',
                border: '1.5px solid #111111'
              }} />
            </motion.div>

            {/* Central Transmitter Beacon */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#1e3a8a',
              border: '3px solid #60a5fa',
              boxShadow: '0 0 25px rgba(96, 165, 250, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.2rem',
              zIndex: 10
            }}>
              🛰
            </div>
          </div>

          {/* Bottom Broadcast Telemetry Status */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1.5px solid #3b82f6',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            zIndex: 10
          }}>
            <div className="font-mono" style={{ fontSize: '0.65rem', color: '#93c5fd' }}>
              BRANCH STATUS: <strong style={{ color: '#22c55e' }}>aistudio (SYNCHRONIZED)</strong>
            </div>
            <div className="font-mono" style={{ fontSize: '0.65rem', color: '#93c5fd' }}>
              COMMITS AHEAD: <strong style={{ color: '#ffcc00' }}>3 COMMITS</strong>
            </div>
          </div>
        </motion.div>

        {/* Right: Pull Request Information & Direct GitHub Link */}
        <motion.div
          whileHover={{ y: -4, x: -2, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
          style={{
            background: '#ffffff',
            border: '3px solid #111111',
            boxShadow: '6px 6px 0px #111111',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={16} />
                <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>
                  AUTONOMOUS PULL REQUEST SPEC
                </h3>
              </div>
              <span className="font-mono" style={{
                background: '#15803d',
                color: '#ffffff',
                border: '1.5px solid #111',
                padding: '1px 6px',
                fontSize: '0.62rem',
                fontWeight: 800
              }}>
                READY FOR MERGE
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                background: '#faf7f0',
                border: '2px solid #111111',
                padding: '12px'
              }}>
                <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#e02424', marginBottom: '2px' }}>
                  PR TITLE
                </div>
                <div className="font-display" style={{ fontSize: '0.82rem', fontWeight: 900 }}>
                  fix(security): sanitize SQL parameters in users_handler.py (CVE-2024-4577)
                </div>
              </div>

              <div style={{
                background: '#faf7f0',
                border: '2px solid #111111',
                padding: '12px'
              }}>
                <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#1d4ed8', marginBottom: '4px' }}>
                  AUTOMATED PR DESCRIPTION
                </div>
                <div style={{ fontSize: '0.66rem', color: '#4a4842', lineHeight: 1.4 }}>
                  • Synthesized surgical parameterized prepared statement lock.<br />
                  • Formal soundness verification score: <strong>99.8%</strong>.<br />
                  • 14/14 Pytest container suites passed with 0 regressions.<br />
                  • Branch promoted to <code>aistudio</code>.
                </div>
              </div>
            </div>
          </div>

          {/* GitHub CTA Action Button */}
          <motion.a
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            href={activePr}
            target="_blank"
            rel="noreferrer"
            className="bauhaus-btn"
            style={{
              padding: '10px 14px',
              background: '#111111',
              color: '#ffffff',
              fontSize: '0.74rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            <span>OPEN PR ON GITHUB</span>
            <ExternalLink size={13} />
          </motion.a>
        </motion.div>
      </div>

      {/* ── LOWER TELEMETRY STREAM & WEBHOOK LOG ── */}
      <motion.div
        whileHover={{ y: -3, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
        style={{
          background: '#ffffff',
          border: '3px solid #111111',
          boxShadow: '4px 4px 0px #111111',
          padding: '18px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} />
            <h3 className="font-display" style={{ fontSize: '0.84rem', fontWeight: 900, margin: 0 }}>
              GITHUB RELAY EVENT STREAM
            </h3>
          </div>
          <span className="font-mono" style={{ fontSize: '0.62rem', color: '#1d4ed8', fontWeight: 900 }}>
            ENDPOINT: /api/webhook/github
          </span>
        </div>

        <div className="terminal-window" style={{ padding: '14px', maxHeight: '140px', overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: '0.68rem', lineHeight: 1.5, color: '#f4efe6' }}>
            {`[HERALD-05] Remote origin configured: https://github.com/dhanrajgupta2736/pvg_vasuki.git
[HERALD-05] Branch initialized: aistudio
[HERALD-05] PUSH TRANSMISSION: * [new branch] aistudio -> aistudio
[HERALD-05] GitHub PR Webhook initialized: Waiting for merge event...
[HERALD-05] Status 200 OK. CI/CD telemetry link healthy.`}
          </pre>
        </div>
      </motion.div>
    </motion.div>
  );
}
