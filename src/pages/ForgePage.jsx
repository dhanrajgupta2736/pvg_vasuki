import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, ArrowLeft, Copy, Check, Code2, Wrench } from 'lucide-react';
import confetti from 'canvas-confetti';

const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
  mass: 0.8
};

export default function ForgePage({
  isWorking,
  patches = [],
  activeVulnIndex = 0,
  onBackToOverview,
  onCopyDiff,
  copiedDiff
}) {
  const [temperature, setTemperature] = useState(0.2);
  const [modelType, setModelType] = useState('Gemini 2.5 Pro');
  const [sparking, setSparking] = useState(false);
  const [tokensGenerated, setTokensGenerated] = useState(842);

  const activePatch = patches[activeVulnIndex] || patches[0];

  const handleStokeForge = () => {
    setSparking(true);
    setTokensGenerated(t => t + 128);
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ffcc00', '#f59e0b', '#e02424', '#ffffff']
      });
    } catch {
      // ignore
    }
    setTimeout(() => setSparking(false), 1200);
  };

  const lcelChainSteps = [
    { name: 'PromptTemplate', role: 'Surgical Patch Spec', latency: '42ms', status: 'done', color: '#ffcc00' },
    { name: 'ChatModel', role: modelType, latency: '380ms', status: 'done', color: '#e02424' },
    { name: 'OutputParser', role: 'Structured Unified Diff', latency: '18ms', status: 'done', color: '#1d4ed8' },
    { name: 'AstValidator', role: 'Syntax Tree Compile', latency: '24ms', status: 'done', color: '#15803d' }
  ];

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
              <motion.span
                animate={{ rotate: isWorking || sparking ? [0, 15, -15, 0] : 0 }}
                transition={{ repeat: Infinity, duration: 0.6 }}
                style={{
                  width: '16px',
                  height: '16px',
                  background: '#ffcc00',
                  border: '2px solid #111111',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem'
                }}
              >
                ⚡
              </motion.span>
              <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em', margin: 0 }}>
                AGENT 02: FORGE // CODE SYNTHESIZER &amp; DIFF FOUNDRY
              </h1>
            </div>
            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#4a4842', fontWeight: 700, marginTop: '2px' }}>
              LANGCHAIN LCEL RUNNABLE SEQUENCE • SURGICAL ZERO-REGRESSION CODE REMEDIATION
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleStokeForge}
            className="bauhaus-btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.72rem',
              background: '#e02424',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            <Flame size={13} />
            STOKE THE FORGE
          </motion.button>

          <span className="font-mono" style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            padding: '5px 10px',
            fontSize: '0.68rem',
            fontWeight: 900
          }}>
            {tokensGenerated} TOKENS MINTED
          </span>
        </div>
      </div>

      {/* ── MIDDLE GRID: KINETIC FORGE ANVIL + LCEL PIPELINE ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '20px'
      }}>
        {/* Left: The Kinetic Anvil & Molten Spark Chamber */}
        <motion.div
          whileHover={{ y: -4, x: -2, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
          style={{
            background: '#140c06',
            border: '3px solid #111111',
            boxShadow: '6px 6px 0px #111111',
            padding: '20px',
            color: '#ffcc00',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '430px'
          }}
        >
          {/* Molten Code Steam Gradient Background */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 50% 65%, rgba(245, 158, 11, 0.22) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          {/* Top Status Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <div className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 900, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wrench size={13} />
              <span>PNEUMATIC LCEL HAMMER // CHAMBER TEMP: {(temperature * 1200 + 400).toFixed(0)}°C</span>
            </div>
            <div className="font-mono" style={{
              background: '#e02424',
              color: '#ffffff',
              padding: '2px 8px',
              fontSize: '0.62rem',
              fontWeight: 800,
              border: '1.5px solid #ffcc00'
            }}>
              MOLTEN AST STATE
            </div>
          </div>

          {/* Center Anvil Graphic with Mechanical Hammer Animation */}
          <div style={{
            position: 'relative',
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
          }}>
            {/* Flying Kinetic Sparks */}
            {(isWorking || sparking) && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: 0, y: 20, opacity: 1, scale: 1 }}
                    animate={{
                      x: (Math.random() - 0.5) * 260,
                      y: -Math.random() * 160 - 20,
                      opacity: 0,
                      scale: 0.2
                    }}
                    transition={{ repeat: Infinity, duration: 0.8 + Math.random() * 0.5, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      bottom: '90px',
                      left: '50%',
                      width: '6px',
                      height: '6px',
                      background: i % 2 === 0 ? '#ffcc00' : '#e02424',
                      borderRadius: '50%',
                      boxShadow: '0 0 6px #ffcc00'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pneumatic LCEL Piston / Hammer */}
            <motion.div
              animate={isWorking || sparking ? { y: [0, 36, 0] } : { y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: isWorking || sparking ? 0.35 : 1.8, ease: 'easeInOut' }}
              style={{
                width: '60px',
                height: '70px',
                background: '#2b231b',
                border: '3px solid #ffcc00',
                boxShadow: '0 0 15px rgba(255, 204, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                fontWeight: 900,
                zIndex: 4
              }}
            >
              LCEL
            </motion.div>

            {/* The Solid Anvil Block */}
            <div style={{
              width: '180px',
              height: '55px',
              background: '#33271d',
              border: '3px solid #ffcc00',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              boxShadow: '0 8px 0px #111111',
              zIndex: 3,
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '-6px',
                width: '90px',
                height: '6px',
                background: '#ffcc00',
                boxShadow: '0 0 12px #ffcc00'
              }} />
              <span className="font-mono" style={{ fontSize: '0.68rem', fontWeight: 900, color: '#fbbf24' }}>
                AST SURGICAL ANVIL
              </span>
              <span className="font-mono" style={{ fontSize: '0.55rem', color: '#94a3b8' }}>
                ZERO-DIFF TAINT FLUSH
              </span>
            </div>

            {/* Molten Code Rain Droplets */}
            <div className="font-mono" style={{
              marginTop: '12px',
              fontSize: '0.62rem',
              color: '#f59e0b',
              fontWeight: 700,
              display: 'flex',
              gap: '12px'
            }}>
              <span>cursor.execute(query, (user, pwd))</span>
              <span style={{ color: '#22c55e' }}>✓ PARAMETERIZED</span>
            </div>
          </div>

          {/* Bottom Precision Controls */}
          <div style={{
            background: 'rgba(20, 12, 6, 0.9)',
            border: '1.5px solid #ffcc00',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#e5e7eb' }}>TEMPERATURE:</span>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                style={{ accentColor: '#ffcc00', width: '80px' }}
              />
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#ffcc00', fontWeight: 800 }}>{temperature}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#e5e7eb' }}>MODEL:</span>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                style={{
                  background: '#111111',
                  color: '#ffcc00',
                  border: '1.5px solid #ffcc00',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.64rem',
                  padding: '2px 6px',
                  fontWeight: 800
                }}
              >
                <option value="Gemini 2.5 Pro">Gemini 2.5 Pro</option>
                <option value="Llama 3.3 70B">Llama 3.3 70B</option>
                <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Right: LangChain LCEL RunnableSequence Pipeline */}
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
                <span style={{ width: '10px', height: '10px', background: '#ffcc00', border: '1.5px solid #111' }} />
                <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>
                  LANGCHAIN RUNNABLE SEQUENCE CHAIN
                </h3>
              </div>
              <span className="font-mono" style={{
                background: '#111111',
                color: '#ffffff',
                border: '1.5px solid #111',
                padding: '1px 6px',
                fontSize: '0.62rem',
                fontWeight: 800
              }}>
                PIPE (|) OPERATOR
              </span>
            </div>

            <div style={{ fontSize: '0.68rem', color: '#4a4842', marginBottom: '14px' }}>
              Deterministic AST AST transformation pipeline assembled via LCEL:
            </div>

            {/* Sequence Nodes with dynamic connectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lcelChainSteps.map((step, idx) => (
                <motion.div
                  key={step.name}
                  whileHover={{ x: 4, scale: 1.01 }}
                  style={{
                    background: '#faf7f0',
                    border: '2px solid #111111',
                    boxShadow: '2px 2px 0px #111111',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="font-mono" style={{
                      width: '22px',
                      height: '22px',
                      background: step.color,
                      color: step.color === '#ffcc00' ? '#111111' : '#ffffff',
                      border: '1.5px solid #111111',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 900
                    }}>
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="font-display" style={{ fontSize: '0.74rem', fontWeight: 900, color: '#111111' }}>
                        {step.name}
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.62rem', color: '#6e6a61' }}>
                        {step.role}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono" style={{
                    background: '#ffffff',
                    border: '1.5px solid #111111',
                    padding: '2px 6px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    color: '#e02424'
                  }}>
                    {step.latency}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AST Safety Invariant Box */}
          <div style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            boxShadow: '3px 3px 0px #111111',
            padding: '12px'
          }}>
            <div className="font-display" style={{ fontSize: '0.76rem', fontWeight: 900, marginBottom: '2px' }}>
              FORGE GUARANTEE // MINIMAL SURGICAL BLAST RADIUS
            </div>
            <div style={{ fontSize: '0.66rem', color: '#111111', lineHeight: 1.35 }}>
              No arbitrary rewriting of untouched functions. Patch confined exclusively to lines 42-45 with automated prepared parameter binding.
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── LOWER LIVE DIFF WEAVER & SURGICAL INSPECTION ── */}
      <motion.div
        whileHover={{ y: -3, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
        style={{
          background: '#ffffff',
          border: '3px solid #111111',
          boxShadow: '4px 4px 0px #111111',
          padding: '18px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={16} />
            <h3 className="font-display" style={{ fontSize: '0.88rem', fontWeight: 900, margin: 0 }}>
              SURGICAL DIFF INSPECTION // {activePatch?.file || 'backend/api/users.py'}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onCopyDiff && onCopyDiff(activePatch?.diff)}
              className="bauhaus-btn"
              style={{
                padding: '4px 10px',
                fontSize: '0.65rem',
                background: copiedDiff ? '#15803d' : '#ffffff',
                color: copiedDiff ? '#ffffff' : '#111111',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {copiedDiff ? <Check size={12} /> : <Copy size={12} />}
              {copiedDiff ? 'COPIED TO CLIPBOARD' : 'COPY PATCH DIFF'}
            </motion.button>
            <span className="font-mono" style={{
              background: '#ffcc00',
              border: '1.5px solid #111111',
              padding: '3px 8px',
              fontSize: '0.62rem',
              fontWeight: 800
            }}>
              +4 ADD / -2 DEL
            </span>
          </div>
        </div>

        {/* Unified Colored Diff View */}
        <div className="diff-container" style={{ padding: '14px', maxHeight: '240px', overflowY: 'auto' }}>
          {(activePatch?.diff || `--- a/backend/api/users.py
+++ b/backend/api/users.py
@@ -42,3 +42,5 @@
-query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pwd}'"
-cursor.execute(query)
+query = "SELECT * FROM users WHERE username = %s AND password = %s"
+cursor.execute(query, (user, pwd))`).split('\n').map((line, lIdx) => {
            const isAdd = line.startsWith('+') && !line.startsWith('+++');
            const isDel = line.startsWith('-') && !line.startsWith('---');
            return (
              <div
                key={lIdx}
                className={isAdd ? 'diff-line-add' : isDel ? 'diff-line-del' : 'diff-line-context'}
              >
                {line}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
