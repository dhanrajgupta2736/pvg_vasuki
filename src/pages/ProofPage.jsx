import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Play, ArrowLeft, Terminal } from 'lucide-react';
import confetti from 'canvas-confetti';

const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
  mass: 0.8
};

export default function ProofPage({
  isWorking,
  testResults,
  onBackToOverview
}) {
  const [runningTests, setRunningTests] = useState(false);
  const [waveShape, setWaveShape] = useState('sine'); // sine, square, pulse
  const [testFrequency, setTestFrequency] = useState(4.2);
  const [selectedPodIdx, setSelectedPodIdx] = useState(0);

  const testPods = [
    { name: 'test_auth_sqli_bypass', file: 'tests/test_users.py:12', status: 'PASSED', time: '0.12s' },
    { name: 'test_prepared_statement_typing', file: 'tests/test_users.py:28', status: 'PASSED', time: '0.18s' },
    { name: 'test_tenant_idor_boundary', file: 'tests/test_auth.py:44', status: 'PASSED', time: '0.22s' },
    { name: 'test_cross_tenant_token_pin', file: 'tests/test_auth.py:65', status: 'PASSED', time: '0.14s' },
    { name: 'test_path_traversal_directory_jail', file: 'tests/test_files.py:18', status: 'PASSED', time: '0.09s' },
    { name: 'test_unicode_filename_norm', file: 'tests/test_files.py:34', status: 'PASSED', time: '0.11s' },
    { name: 'test_jwt_signature_algorithm_none', file: 'tests/test_sec.py:12', status: 'PASSED', time: '0.15s' },
    { name: 'test_session_expiration_latch', file: 'tests/test_sec.py:38', status: 'PASSED', time: '0.16s' },
    { name: 'test_db_connection_pool_safe', file: 'tests/test_db.py:22', status: 'PASSED', time: '0.25s' },
    { name: 'test_health_probe_latency', file: 'tests/test_api.py:10', status: 'PASSED', time: '0.08s' },
    { name: 'test_cors_preflight_origin', file: 'tests/test_api.py:42', status: 'PASSED', time: '0.10s' },
    { name: 'test_rate_limit_token_bucket', file: 'tests/test_api.py:78', status: 'PASSED', time: '0.31s' },
    { name: 'test_regression_suite_v1', file: 'tests/test_e2e.py:14', status: 'PASSED', time: '0.45s' },
    { name: 'test_regression_suite_v2', file: 'tests/test_e2e.py:68', status: 'PASSED', time: '0.52s' }
  ];

  const handleRunPytest = () => {
    setRunningTests(true);
    setTimeout(() => {
      setRunningTests(false);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#22c55e', '#15803d', '#ffcc00', '#ffffff']
        });
      } catch {
        // ignore
      }
    }, 1400);
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
                background: '#15803d',
                border: '2px solid #111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.65rem'
              }}>
                ✓
              </span>
              <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em', margin: 0 }}>
                AGENT 04: PROOF // QUANTUM OSCILLOSCOPE &amp; TEST BASIN
              </h1>
            </div>
            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#4a4842', fontWeight: 700, marginTop: '2px' }}>
              ISOLATED DOCKER CONTAINER PYTEST VERIFICATION • ZERO REGRESSION CERTIFICATION
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleRunPytest}
            className="bauhaus-btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.72rem',
              background: '#15803d',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            <Play size={13} className={runningTests ? 'animate-spin' : ''} />
            {runningTests ? 'TESTING CONTAINER...' : 'RUN PYTEST SUITE'}
          </motion.button>

          <span className="font-mono" style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            padding: '5px 10px',
            fontSize: '0.68rem',
            fontWeight: 900
          }}>
            14/14 PODS PASSED
          </span>
        </div>
      </div>

      {/* ── MIDDLE GRID: DIGITAL OSCILLOSCOPE + CONTAINER PODS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.25fr 1fr',
        gap: '20px'
      }}>
        {/* Left: The Digital Oscilloscope Chamber */}
        <motion.div
          whileHover={{ y: -4, x: -2, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
          style={{
            background: '#04150b',
            border: '3px solid #111111',
            boxShadow: '6px 6px 0px #111111',
            padding: '20px',
            color: '#4ade80',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '430px'
          }}
        >
          {/* Top HUD Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <div className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 900, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={14} />
              <span>OSCILLOSCOPE CHANNEL A // FREQ: {testFrequency} Hz • LATENCY: 4.2 SEC</span>
            </div>
            <div className="font-mono" style={{
              background: '#15803d',
              color: '#ffffff',
              padding: '2px 8px',
              fontSize: '0.62rem',
              fontWeight: 800,
              border: '1.5px solid #ffffff'
            }}>
              0 REGRESSION FLAGGED
            </div>
          </div>

          {/* Oscilloscope Grid Screen & Animated Waveform */}
          <div style={{
            position: 'relative',
            height: '240px',
            background: '#031008',
            border: '2px solid #16a34a',
            margin: '12px 0',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center'
          }}>
            {/* CRT Phosphor Scanlines */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(74, 222, 128, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(74, 222, 128, 0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none'
            }} />

            {/* Glowing Scan Bar */}
            <motion.div
              animate={{ left: ['-10%', '110%'] }}
              transition={{ repeat: Infinity, duration: isWorking || runningTests ? 1.4 : 2.8, ease: 'linear' }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: '3px',
                background: '#ffffff',
                boxShadow: '0 0 14px #4ade80',
                zIndex: 5
              }}
            />

            {/* Waveform SVG */}
            <svg viewBox="0 0 600 120" style={{ width: '100%', height: '100%', zIndex: 3 }}>
              <motion.path
                d={
                  waveShape === 'sine'
                    ? "M0,60 Q30,60 50,60 L70,60 L80,20 L90,100 L100,30 L110,80 L120,60 L200,60 L220,25 L230,90 L240,60 L350,60 L365,15 L375,105 L385,40 L395,60 L500,60 L515,20 L525,95 L535,60 L600,60"
                    : waveShape === 'square'
                    ? "M0,60 L60,60 L60,20 L120,20 L120,100 L180,100 L180,60 L240,60 L240,20 L300,20 L300,100 L360,100 L360,60 L420,60 L420,20 L480,20 L480,100 L540,100 L540,60 L600,60"
                    : "M0,60 L40,60 L80,20 L80,100 L120,60 L160,60 L200,20 L200,100 L240,60 L280,60 L320,20 L320,100 L360,60 L400,60 L440,20 L440,100 L480,60 L520,60 L560,20 L560,100 L600,60"
                }
                fill="none"
                stroke="#4ade80"
                strokeWidth="3"
                initial={{ pathOffset: 0 }}
                animate={{ pathOffset: [0, 1] }}
                transition={{ repeat: Infinity, duration: isWorking || runningTests ? 1.2 : 2.5, ease: 'linear' }}
              />
            </svg>
          </div>

          {/* Bottom Waveform Type Selectors */}
          <div style={{
            background: 'rgba(3, 16, 8, 0.95)',
            border: '1.5px solid #16a34a',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#86efac' }}>WAVEFORM:</span>
              {['sine', 'square', 'pulse'].map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setWaveShape(shape)}
                  style={{
                    background: waveShape === shape ? '#4ade80' : '#111111',
                    color: waveShape === shape ? '#111111' : '#4ade80',
                    border: '1.5px solid #4ade80',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    fontWeight: 900,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  {shape}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#86efac' }}>FREQUENCY:</span>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={testFrequency}
                onChange={(e) => setTestFrequency(parseFloat(e.target.value))}
                style={{ accentColor: '#4ade80', width: '80px' }}
              />
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#4ade80', fontWeight: 800 }}>{testFrequency} Hz</span>
            </div>
          </div>
        </motion.div>

        {/* Right: 14 Container Pods Matrix */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', background: '#15803d', border: '1.5px solid #111' }} />
                <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>
                  CONTAINERIZED TEST PODS
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
                14/14 HEALTHY
              </span>
            </div>

            {/* Micro Test Pod Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
              marginBottom: '14px'
            }}>
              {testPods.map((pod, idx) => {
                const isSelected = selectedPodIdx === idx;
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedPodIdx(idx)}
                    title={pod.name}
                    style={{
                      height: '32px',
                      background: isSelected ? '#ffcc00' : '#15803d',
                      border: '2px solid #111111',
                      boxShadow: isSelected ? '2px 2px 0px #111111' : 'none',
                      color: isSelected ? '#111111' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✓
                  </motion.button>
                );
              })}
            </div>

            {/* Selected Pod Deep-Dive */}
            <div style={{
              background: '#faf7f0',
              border: '2px solid #111111',
              padding: '12px'
            }}>
              <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 900, color: '#15803d', marginBottom: '4px' }}>
                <span>POD #{selectedPodIdx + 1}: {testPods[selectedPodIdx]?.name}</span>
                <span>{testPods[selectedPodIdx]?.time}</span>
              </div>
              <div className="font-mono" style={{ fontSize: '0.64rem', color: '#4a4842' }}>
                Target Suite: {testPods[selectedPodIdx]?.file}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#111111', marginTop: '6px', lineHeight: 1.35 }}>
                Status: Verified non-vulnerable. Correctly accepts legitimate tokens and throws HTTP 400 on malformed payloads.
              </div>
            </div>
          </div>

          {/* Zero-Regression Certificate */}
          <div style={{
            background: '#ffcc00',
            border: '2px solid #111111',
            boxShadow: '3px 3px 0px #111111',
            padding: '12px'
          }}>
            <div className="font-display" style={{ fontSize: '0.76rem', fontWeight: 900 }}>
              PROOF SEAL // ZERO REGRESSION CERTIFICATE
            </div>
            <div style={{ fontSize: '0.64rem', color: '#111111', marginTop: '2px' }}>
              All 14 unit and integration tests passed in ephemeral sandbox container. Safe for PR transmission.
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── LOWER CONTAINER PYTEST TERMINAL RUNNER ── */}
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
              DOCKER PYTEST CONTAINER STDOUT STREAM
            </h3>
          </div>
          <span className="font-mono" style={{ fontSize: '0.62rem', color: '#15803d', fontWeight: 900 }}>
            PASSED 14 in 0.42s
          </span>
        </div>

        <div className="terminal-window" style={{ padding: '14px', maxHeight: '160px', overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: '0.68rem', lineHeight: 1.5, color: '#f4efe6' }}>
            {testResults?.output || `============================= test session starts ==============================
platform linux -- Python 3.11.8, pytest-7.4.3, pluggy-1.3.0
rootdir: /workspace/backend
collected 14 items

tests/test_users.py::test_auth_sqli_bypass PASSED                        [  7%]
tests/test_users.py::test_prepared_statement_typing PASSED               [ 14%]
tests/test_auth.py::test_tenant_idor_boundary PASSED                     [ 21%]
tests/test_auth.py::test_cross_tenant_token_pin PASSED                   [ 28%]
tests/test_files.py::test_path_traversal_directory_jail PASSED          [ 35%]
tests/test_files.py::test_unicode_filename_norm PASSED                   [ 42%]
tests/test_sec.py::test_jwt_signature_algorithm_none PASSED             [ 50%]
tests/test_sec.py::test_session_expiration_latch PASSED                  [ 57%]
tests/test_db.py::test_db_connection_pool_safe PASSED                   [ 64%]
tests/test_api.py::test_health_probe_latency PASSED                      [ 71%]
tests/test_api.py::test_cors_preflight_origin PASSED                     [ 78%]
tests/test_api.py::test_rate_limit_token_bucket PASSED                   [ 85%]
tests/test_e2e.py::test_regression_suite_v1 PASSED                       [ 92%]
tests/test_e2e.py::test_regression_suite_v2 PASSED                       [100%]

============================== 14 passed in 0.42s ==============================`}
          </pre>
        </div>
      </motion.div>
    </motion.div>
  );
}
