import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, ArrowLeft, Zap, Lock } from 'lucide-react';

const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
  mass: 0.8
};

export default function ShieldPage({
  isWorking,
  confidenceScore = 99.8,
  onBackToOverview
}) {
  const [injectingAttack, setInjectingAttack] = useState(false);
  const [attackDeflected, setAttackDeflected] = useState(false);
  const [shieldPower, setShieldPower] = useState(100);

  const verifiedRules = [
    { id: 'r1', name: 'Zero-Hallucination Import Lock', status: 'VERIFIED', score: '100%', detail: 'All 4 imported modules exist in repo lockfile' },
    { id: 'r2', name: 'AST Structural Boundary Guard', status: 'VERIFIED', score: '99.8%', detail: 'Patch does not modify public API function signatures' },
    { id: 'r3', name: 'SQL Taint Neutralization Proof', status: 'VERIFIED', score: '100%', detail: 'Raw string concatenation completely eliminated' },
    { id: 'r4', name: 'Tenant Boundary Isolation Assert', status: 'VERIFIED', score: '99.4%', detail: 'Cross-tenant IDOR access mathematically blocked' }
  ];

  const handleSimulateAttack = () => {
    setInjectingAttack(true);
    setAttackDeflected(false);
    setShieldPower(98);
    setTimeout(() => {
      setInjectingAttack(false);
      setAttackDeflected(true);
      setShieldPower(100);
      setTimeout(() => setAttackDeflected(false), 2000);
    }, 900);
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
                🛡
              </span>
              <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em', margin: 0 }}>
                AGENT 03: SHIELD // FORMAL VERIFIER &amp; HALLUCINATION GUARD
              </h1>
            </div>
            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#4a4842', fontWeight: 700, marginTop: '2px' }}>
              ZERO-TRUST AST BOUNDARY AUDITOR • MATHEMATICAL SOUNDNESS &amp; PROMPT INJECTION DEFLECTION
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleSimulateAttack}
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
            <Zap size={13} />
            FIRE TEST INJECTION
          </motion.button>

          <span className="font-mono" style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            padding: '5px 10px',
            fontSize: '0.68rem',
            fontWeight: 900
          }}>
            {confidenceScore}% SOUNDNESS
          </span>
        </div>
      </div>

      {/* ── MIDDLE GRID: HOLOGRAPHIC FORCEFIELD + VERIFICATION MATRIX ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '20px'
      }}>
        {/* Left: Holographic Hexagonal Forcefield Chamber */}
        <motion.div
          whileHover={{ y: -4, x: -2, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
          style={{
            background: '#090d16',
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
              <Lock size={13} />
              <span>HEX LATTICE BARRIER // STRENGTH: {shieldPower}%</span>
            </div>
            <div className="font-mono" style={{
              background: attackDeflected ? '#15803d' : '#1d4ed8',
              color: '#ffffff',
              padding: '2px 8px',
              fontSize: '0.62rem',
              fontWeight: 800,
              border: '1.5px solid #ffffff'
            }}>
              {attackDeflected ? 'ATTACK DEFLECTED' : 'BARRIER ACTIVE'}
            </div>
          </div>

          {/* Concentric Rotating Hexagons & Shield Core */}
          <div style={{
            position: 'relative',
            height: '270px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Hexagon Outer Ring CW */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: isWorking ? 6 : 14, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: '230px',
                height: '230px',
                border: '2px dashed #3b82f6',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)'
              }}
            />

            {/* Hexagon Mid Ring CCW */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: isWorking ? 5 : 10, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                border: '2.5px solid #60a5fa',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
              }}
            />

            {/* Simulated Projectile Shooting from Left */}
            <AnimatePresence>
              {injectingAttack && (
                <motion.div
                  initial={{ x: -160, opacity: 0, scale: 0.5 }}
                  animate={{ x: 0, opacity: 1, scale: 1.4 }}
                  exit={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeIn' }}
                  style={{
                    position: 'absolute',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#e02424',
                    border: '2px solid #ffffff',
                    boxShadow: '0 0 20px #e02424',
                    zIndex: 20
                  }}
                />
              )}
            </AnimatePresence>

            {/* Deflection Particle Shatter */}
            <AnimatePresence>
              {attackDeflected && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 1 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  style={{
                    position: 'absolute',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    border: '3px solid #ffcc00',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </AnimatePresence>

            {/* Central Solid Shield Crest */}
            <motion.div
              animate={attackDeflected ? { scale: [1, 1.25, 1] } : { scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                width: '70px',
                height: '80px',
                background: '#1d4ed8',
                border: '3px solid #ffffff',
                boxShadow: '0 0 20px #3b82f6',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                zIndex: 10
              }}
            >
              <Shield size={32} />
              <span className="font-mono" style={{ fontSize: '0.55rem', marginTop: '2px' }}>
                99.8%
              </span>
            </motion.div>
          </div>

          {/* Bottom Telemetry Metrics */}
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
              PROMPT INJECTION BARRIER: <strong style={{ color: '#22c55e' }}>IMMUNE</strong>
            </div>
            <div className="font-mono" style={{ fontSize: '0.65rem', color: '#93c5fd' }}>
              AST LEAKAGE: <strong style={{ color: '#ffcc00' }}>0.00% DETECTED</strong>
            </div>
          </div>
        </motion.div>

        {/* Right: Formal Proof & Soundness Checklist Matrix */}
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
                <span style={{ width: '10px', height: '10px', background: '#1d4ed8', border: '1.5px solid #111' }} />
                <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>
                  FORMAL SOUNDNESS AUDIT MATRIX
                </h3>
              </div>
              <span className="font-mono" style={{
                background: '#ffcc00',
                border: '1.5px solid #111',
                padding: '1px 6px',
                fontSize: '0.62rem',
                fontWeight: 800
              }}>
                4/4 PASSED
              </span>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#4a4842', marginBottom: '14px' }}>
              Automated formal verification invariants enforced before test handoff:
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {verifiedRules.map((rule) => (
                <motion.div
                  key={rule.id}
                  whileHover={{ x: 4, scale: 1.01 }}
                  style={{
                    background: '#faf7f0',
                    border: '2px solid #111111',
                    boxShadow: '2px 2px 0px #111111',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} color="#15803d" />
                      <span className="font-display" style={{ fontSize: '0.72rem', fontWeight: 900, color: '#111111' }}>
                        {rule.name}
                      </span>
                    </div>
                    <span className="font-mono" style={{
                      background: '#15803d',
                      color: '#ffffff',
                      padding: '1px 5px',
                      fontSize: '0.58rem',
                      fontWeight: 800
                    }}>
                      {rule.score}
                    </span>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.62rem', color: '#6e6a61' }}>
                    {rule.detail}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Zero-Trust Seal of Approval */}
          <div style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            boxShadow: '3px 3px 0px #111111',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: '#111111',
              color: '#ffcc00',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 900,
              flexShrink: 0
            }}>
              ✓
            </div>
            <div>
              <div className="font-display" style={{ fontSize: '0.78rem', fontWeight: 900 }}>
                CERTIFIED IMMUNE TO HALLUCINATED APIS
              </div>
              <div style={{ fontSize: '0.64rem', color: '#111111' }}>
                Signed by LangChain Shield. Ready for Agent 04 (Proof) container testing.
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
