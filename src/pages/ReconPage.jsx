import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Terminal } from 'lucide-react';

const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
  mass: 0.8
};

export default function ReconPage({
  isWorking,
  vulnerabilities = [],
  setActiveVulnIndex,
  onTriggerScan,
  onBackToOverview
}) {
  const [radarGain, setRadarGain] = useState(85);
  const [sweepSpeed, setSweepSpeed] = useState(2.2);
  const [selectedAstNode, setSelectedAstNode] = useState('users.py:42');
  const [scanPulseActive, setScanPulseActive] = useState(false);
  const [blipHovered, setBlipHovered] = useState(null);

  const astNodes = [
    { id: 'n1', label: 'AST:Module', file: 'backend/api/users.py', line: 1, type: 'root', depth: 0, status: 'safe' },
    { id: 'n2', label: 'AST:FunctionDef(auth_user)', file: 'backend/api/users.py', line: 38, type: 'fn', depth: 1, status: 'safe' },
    { id: 'n3', label: 'AST:FormattedValue(user)', file: 'backend/api/users.py', line: 42, type: 'sink', depth: 2, status: 'taint' },
    { id: 'n4', label: 'AST:Call(cursor.execute)', file: 'backend/api/users.py', line: 43, type: 'cve', depth: 2, status: 'vuln', cve: 'CVE-2024-4577' },
    { id: 'n5', label: 'AST:FunctionDef(verify_tenant)', file: 'backend/services/auth.py', line: 110, type: 'fn', depth: 1, status: 'warning' },
    { id: 'n6', label: 'AST:Attribute(request.user_id)', file: 'backend/services/auth.py', line: 114, type: 'sink', depth: 2, status: 'vuln', cve: 'CVE-2024-38077' },
    { id: 'n7', label: 'AST:Call(os.path.join)', file: 'backend/utils/file_viewer.py', line: 29, type: 'sink', depth: 2, status: 'vuln', cve: 'CVE-2023-38545' }
  ];

  const radarBlips = [
    { id: 'b1', top: '24%', left: '68%', color: '#e02424', label: 'CVE-2024-4577 (SQLi)', node: 'users.py:42', cvss: 9.8 },
    { id: 'b2', top: '62%', left: '74%', color: '#e02424', label: 'CVE-2024-38077 (IDOR)', node: 'auth.py:112', cvss: 8.5 },
    { id: 'b3', top: '78%', left: '32%', color: '#ffcc00', label: 'CVE-2023-38545 (Path)', node: 'file_viewer.py:28', cvss: 6.5 },
    { id: 'b4', top: '35%', left: '22%', color: '#22c55e', label: 'SEAL-777 (Clean Guard)', node: 'security.py:84', cvss: 2.1 }
  ];

  const handleManualScan = () => {
    setScanPulseActive(true);
    if (onTriggerScan) onTriggerScan();
    setTimeout(() => setScanPulseActive(false), 2400);
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
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#e02424',
                border: '2px solid #111111',
                boxShadow: '0 0 0 2px #ffffff, 0 0 0 4px #e02424',
                display: 'inline-block'
              }} />
              <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.02em', margin: 0 }}>
                AGENT 01: RECON // AST RADAR &amp; CVE SEEKER
              </h1>
            </div>
            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#4a4842', fontWeight: 700, marginTop: '2px' }}>
              AUTONOMOUS ABSTRACT SYNTAX TREE TAINT PROFILER • ZERO-DAY VULNERABILITY RECONNAISSANCE
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.div
            animate={{ scale: isWorking || scanPulseActive ? [1, 1.04, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="font-mono"
            style={{
              padding: '5px 12px',
              background: isWorking || scanPulseActive ? '#e02424' : '#111111',
              color: '#ffffff',
              border: '2px solid #111111',
              fontSize: '0.68rem',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ffffff',
              display: 'inline-block'
            }} />
            {isWorking || scanPulseActive ? 'SWEEPING LIVE AST MATRIX' : 'RADAR LOCKED // STANDBY'}
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={handleManualScan}
            className="bauhaus-btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.72rem',
              background: '#ffcc00',
              color: '#111111',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            <RefreshCw size={13} className={isWorking || scanPulseActive ? 'animate-spin' : ''} />
            EXECUTE DEEP SCAN
          </motion.button>
        </div>
      </div>

      {/* ── MAIN INTERACTIVE GRID: 360 RADAR DISH + AST HIERARCHY TREE ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.25fr 1fr',
        gap: '20px'
      }}>
        {/* Left: 360° Tactical Cybernetic Radar Dish */}
        <motion.div
          whileHover={{ y: -4, x: -2, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
          style={{
            background: '#070f1a',
            border: '3px solid #111111',
            boxShadow: '6px 6px 0px #111111',
            padding: '20px',
            color: '#38bdf8',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '440px'
          }}
        >
          {/* Top HUD Telemetry Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <div className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="animate-cursor-blink">▶</span>
              <span>AZIMUTH: 360° // SENSITIVITY: {radarGain}%</span>
            </div>
            <div className="font-mono" style={{
              background: '#111111',
              border: '1.5px solid #38bdf8',
              color: '#38bdf8',
              padding: '2px 8px',
              fontSize: '0.65rem',
              fontWeight: 800
            }}>
              AST RECON ACTIVE
            </div>
          </div>

          {/* Central Circular Radar HUD with concentric sweep rings */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '320px',
            margin: '10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Background Grid Lines */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />

            {/* Concentric Sonar Rings */}
            {[280, 210, 140, 70].map((dim, idx) => (
              <div
                key={dim}
                style={{
                  position: 'absolute',
                  width: `${dim}px`,
                  height: `${dim}px`,
                  borderRadius: '50%',
                  border: `1.5px dashed ${idx === 0 ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}`,
                  boxShadow: idx === 0 ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
                  pointerEvents: 'none'
                }}
              />
            ))}

            {/* Crosshairs */}
            <div style={{ position: 'absolute', width: '280px', height: '1.5px', background: 'rgba(56, 189, 248, 0.45)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', height: '280px', width: '1.5px', background: 'rgba(56, 189, 248, 0.45)', pointerEvents: 'none' }} />

            {/* Kinetic 360° Radar Sweep Cone */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: isWorking || scanPulseActive ? sweepSpeed * 0.6 : sweepSpeed,
                ease: 'linear'
              }}
              style={{
                position: 'absolute',
                width: '280px',
                height: '280px',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.4) 0deg, rgba(56, 189, 248, 0.08) 45deg, transparent 90deg, transparent 360deg)',
                pointerEvents: 'none'
              }}
            />

            {/* Ultrasonic Pulse Wave on scan */}
            <AnimatePresence>
              {(isWorking || scanPulseActive) && (
                <motion.div
                  initial={{ scale: 0.1, opacity: 1 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    border: '3px solid #e02424',
                    pointerEvents: 'none'
                  }}
                />
              )}
            </AnimatePresence>

            {/* Center Core Emitter */}
            <div style={{
              position: 'absolute',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#e02424',
              border: '2px solid #ffffff',
              boxShadow: '0 0 12px #e02424',
              zIndex: 5
            }} />

            {/* Interactive Target Blips on Radar */}
            {radarBlips.map((blip) => (
              <motion.div
                key={blip.id}
                whileHover={{ scale: 1.4 }}
                onClick={() => {
                  setSelectedAstNode(blip.node);
                  const matchingIdx = vulnerabilities.findIndex(v => v.code_snippet?.includes(blip.node.split(':')[0]) || v.file?.includes(blip.node.split(':')[0]));
                  if (matchingIdx >= 0 && setActiveVulnIndex) setActiveVulnIndex(matchingIdx);
                }}
                onMouseEnter={() => setBlipHovered(blip)}
                onMouseLeave={() => setBlipHovered(null)}
                style={{
                  position: 'absolute',
                  top: blip.top,
                  left: blip.left,
                  width: '14px',
                  height: '14px',
                  cursor: 'pointer',
                  zIndex: 12
                }}
              >
                <motion.span
                  animate={{ scale: [1, 2, 1], opacity: [1, 0.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  style={{
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '50%',
                    border: `1.5px solid ${blip.color}`,
                    pointerEvents: 'none'
                  }}
                />
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: blip.color,
                  border: '1.5px solid #ffffff',
                  boxShadow: `0 0 8px ${blip.color}`
                }} />
              </motion.div>
            ))}

            {/* Hovered Blip Target HUD Overlay */}
            <AnimatePresence>
              {blipHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: '#111111',
                    border: `2px solid ${blipHovered.color}`,
                    boxShadow: '3px 3px 0px #38bdf8',
                    padding: '8px 12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    color: '#ffffff',
                    zIndex: 20
                  }}
                >
                  <div style={{ fontWeight: 900, color: blipHovered.color }}>{blipHovered.label}</div>
                  <div style={{ color: '#94a3b8' }}>TARGET NODE: {blipHovered.node}</div>
                  <div style={{ color: '#ffcc00', fontWeight: 800 }}>CVSS SEVERITY: {blipHovered.cvss}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Tactical Sliders & Sensitivity Controls */}
          <div style={{
            background: 'rgba(9, 13, 22, 0.85)',
            border: '1.5px solid rgba(56, 189, 248, 0.4)',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#94a3b8' }}>SWEEP VELOCITY:</span>
              <input
                type="range"
                min="0.8"
                max="4.0"
                step="0.2"
                value={sweepSpeed}
                onChange={(e) => setSweepSpeed(parseFloat(e.target.value))}
                style={{ accentColor: '#38bdf8', width: '90px' }}
              />
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#38bdf8', fontWeight: 800 }}>{sweepSpeed}s</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#94a3b8' }}>AST SENSITIVITY:</span>
              <input
                type="range"
                min="50"
                max="100"
                value={radarGain}
                onChange={(e) => setRadarGain(parseInt(e.target.value))}
                style={{ accentColor: '#e02424', width: '90px' }}
              />
              <span className="font-mono" style={{ fontSize: '0.64rem', color: '#e02424', fontWeight: 800 }}>{radarGain}%</span>
            </div>
          </div>
        </motion.div>

        {/* Right: Interactive AST Node Hierarchy & Taint Stream */}
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
                <span style={{ width: '10px', height: '10px', background: '#e02424', border: '1.5px solid #111' }} />
                <h3 className="font-display" style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0 }}>
                  AST SYNTAX TREE &amp; TAINT GRAPH
                </h3>
              </div>
              <span className="font-mono" style={{
                background: '#ffcc00',
                border: '1.5px solid #111',
                padding: '1px 6px',
                fontSize: '0.62rem',
                fontWeight: 800
              }}>
                7 NODES PROFILED
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#4a4842', marginBottom: '12px' }}>
              Select an AST node to inspect its execution branch and taint flow:
            </div>

            {/* Tree Nodes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {astNodes.map((node) => {
                const isSelected = selectedAstNode.includes(node.file.split('/').pop());
                const isVuln = node.status === 'vuln';
                const isTaint = node.status === 'taint';
                return (
                  <motion.div
                    key={node.id}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedAstNode(`${node.file}:${node.line}`)}
                    className="font-mono"
                    style={{
                      padding: '8px 10px',
                      marginLeft: `${node.depth * 14}px`,
                      background: isSelected ? '#fffbeb' : '#faf7f0',
                      border: isSelected ? '2px solid #e02424' : '1.5px solid #111111',
                      boxShadow: isSelected ? '3px 3px 0px #e02424' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.68rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isVuln ? '#e02424' : isTaint ? '#ffcc00' : '#22c55e',
                        border: '1px solid #111'
                      }} />
                      <span style={{ fontWeight: 800, color: '#111111' }}>{node.label}</span>
                      <span style={{ color: '#6e6a61', fontSize: '0.6rem' }}>Line {node.line}</span>
                    </div>

                    {node.cve ? (
                      <span style={{
                        background: '#e02424',
                        color: '#ffffff',
                        padding: '1px 6px',
                        fontSize: '0.58rem',
                        fontWeight: 900
                      }}>
                        {node.cve}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.58rem' }}>{node.status.toUpperCase()}</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Selected Node Deep-Dive Card */}
          <div style={{
            background: '#faf7f0',
            border: '2px solid #111111',
            padding: '12px',
            marginTop: 'auto'
          }}>
            <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#e02424', marginBottom: '4px' }}>
              TAINT ANOMALY INSPECTION // {selectedAstNode}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#111111', lineHeight: 1.4 }}>
              <strong>Taint Inflow:</strong> Raw HTTP query parameters injected directly into SQL execute context without bind parameter sanitizer.
            </div>
            <div style={{
              marginTop: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span className="font-mono" style={{ fontSize: '0.6rem', color: '#4a4842' }}>
                Handed off to <strong>Agent 02 (Forge)</strong> for surgical patching
              </span>
              <span className="font-mono" style={{
                background: '#111111',
                color: '#ffcc00',
                padding: '2px 6px',
                fontSize: '0.6rem',
                fontWeight: 800
              }}>
                DISPATCH QUEUED
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM RAW BYTES & SEMGREP HEURISTIC TERMINAL ── */}
      <motion.div
        whileHover={{ y: -3, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
        style={{
          background: '#ffffff',
          border: '3px solid #111111',
          boxShadow: '4px 4px 0px #111111',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} />
            <span className="font-display" style={{ fontSize: '0.82rem', fontWeight: 900 }}>
              RECON SEMGREP PATTERN ENGINE &amp; LIVE BYTESTREAM
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: '0.62rem', color: '#4a4842', fontWeight: 800 }}>
            RULESET: pvg/langchain-ast-rules-v2.8
          </span>
        </div>

        <div className="terminal-window" style={{ padding: '12px', maxHeight: '140px', overflowY: 'auto' }}>
          <pre style={{ margin: 0, fontSize: '0.68rem', lineHeight: 1.5, color: '#f4efe6' }}>
            {`[RECON-01] Loaded Semgrep Rule: rules.python.lang.security.audit.raw-sql-injection
[RECON-01] AST Parse: Ingesting repository files...
[RECON-01] MATCH FLAGGED: backend/api/users.py:42:12
           ├─ Rule ID: python.sqli.fstring-exec-detect
           ├─ Confidence: 0.994
           ├─ Message: "Found f-string format within cursor.execute query string. CWE-89 detected."
[RECON-01] MATCH FLAGGED: backend/services/auth.py:112:8
           ├─ Rule ID: python.idor.missing-tenant-guard
           ├─ Confidence: 0.982
[RECON-01] Radar scan telemetry synchronized. 3 dark anomalies locked in memory.`}
          </pre>
        </div>
      </motion.div>
    </motion.div>
  );
}
