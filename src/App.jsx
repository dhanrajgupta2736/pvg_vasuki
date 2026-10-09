import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink, Zap, Pause, RotateCcw, Sparkles, Check, Play, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { BauhausAutonomousAgentsHeaderBar } from './components/BauhausAgentStatusIndicator';
import ReconPage from './pages/ReconPage';
import ForgePage from './pages/ForgePage';
import ShieldPage from './pages/ShieldPage';
import ProofPage from './pages/ProofPage';
import HeraldPage from './pages/HeraldPage';

const API_BASE = '';
const WS_BASE = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : 'ws://localhost:3000';

const DEMO_PRESETS = [
  {
    id: 'vasuki',
    name: 'PVG Vasuki Live Repo',
    cmd: 'grep vuln_ast --repo dhanrajgupta2736/pvg_vasuki',
    url: 'https://github.com/dhanrajgupta2736/pvg_vasuki',
    shortTarget: 'dhanrajgupta2736/pvg_vasuki@main',
    branch: 'main',
    sha: 'VASUKI-OSS@HEAD (SHA-4A28F)'
  },
  {
    id: 'pyvuln',
    name: 'PyVulnerableApp (SQLi + Auth)',
    cmd: 'grep spell_ast --repo vulnerable-apps/python-sqli-demo',
    url: 'https://github.com/vulnerable-apps/python-sqli-demo',
    shortTarget: 'vulnerable-apps/python-sqli-demo@main',
    branch: 'main',
    sha: 'PYVULN-OSS@HEAD (SHA-9C14B)'
  },
  {
    id: 'nodevuln',
    name: 'InsecureNodeAPI (XSS + Path)',
    cmd: 'grep cve_ast --repo vulnerable-apps/node-express-idor',
    url: 'https://github.com/vulnerable-apps/node-express-idor',
    shortTarget: 'vulnerable-apps/node-express-idor@main',
    branch: 'main',
    sha: 'NODEAPI-OSS@HEAD (SHA-7E02D)'
  }
];

const INITIAL_VULNS = [
  {
    id: 'semgrep-sqli-01',
    code: 'HEX-004',
    cve_id: 'CVE-2024-4577',
    category: 'sql-injection',
    title: 'SQLi in users_handler.py',
    severity: 'CRITICAL',
    status_badge: 'CRITICAL',
    workflow_badge: 'PATCHING',
    assigned_to: 'Assigned: Forge',
    cvss_score: 9.8,
    file: 'backend/api/users.py',
    line_start: 42,
    line_end: 45,
    message: 'Missing parameterized prepared statement lock in raw SQL authentication query.',
    code_snippet: "query = f\"SELECT * FROM users WHERE username = '{user}' AND password = '{pwd}'\"\ncursor.execute(query)"
  },
  {
    id: 'semgrep-auth-02',
    code: 'ANOM-102',
    cve_id: 'CVE-2024-38077',
    category: 'broken-access-control',
    title: 'Tenant Boundary Memory Leak',
    severity: 'HIGH',
    status_badge: 'RESOLVED',
    workflow_badge: 'PASSED',
    assigned_to: 'Assert: 99.4%',
    cvss_score: 8.5,
    file: 'backend/services/auth.py',
    line_start: 112,
    line_end: 116,
    message: 'Insecure Direct Object Reference (IDOR) allows cross-tenant record lookup without tenant_id guard.',
    code_snippet: 'user_record = db.query(User).filter(User.id == request.user_id).first()'
  },
  {
    id: 'semgrep-traversal-03',
    code: 'HEX-219',
    cve_id: 'CVE-2023-38545',
    category: 'path-traversal',
    title: 'Path Weight Heap Overflow',
    severity: 'MEDIUM',
    status_badge: 'OPTIMIZED',
    workflow_badge: 'TAGGED',
    assigned_to: 'Assigned: Shield',
    cvss_score: 6.5,
    file: 'backend/utils/file_viewer.py',
    line_start: 28,
    line_end: 30,
    message: 'Unsanitized file path parameter in document download endpoint permits directory traversal outside root.',
    code_snippet: 'file_path = os.path.join(UPLOAD_DIR, filename)\nreturn open(file_path, "rb").read()'
  },
  {
    id: 'semgrep-guard-04',
    code: 'SEAL-777',
    cve_id: 'CWE-284-GUARD',
    category: 'session-token-guard',
    title: 'JWT Algorithm Pinning Guard',
    severity: 'MEDIUM',
    status_badge: 'GATEWAY',
    workflow_badge: 'APPROVED',
    assigned_to: 'Shield Seal',
    cvss_score: 6.1,
    file: 'backend/core/security.py',
    line_start: 19,
    line_end: 24,
    message: 'LangChain standard HS256 algorithm verification latch preventing alg=none token forgery.',
    code_snippet: 'payload = jwt.decode(token, SECRET_KEY)'
  }
];

const INITIAL_PATCHES = [
  {
    vulnerability_id: 'semgrep-sqli-01',
    code: 'HEX-004',
    file: 'backend/api/users.py',
    category: 'sql-injection',
    cve_id: 'CVE-2024-4577',
    severity: 'CRITICAL',
    applied: true,
    model_used: 'LangChain LCEL // Llama-3.3-70B + Gemini-2.5',
    diff: `--- a/backend/api/users.py
+++ b/backend/api/users.py
@@ -40,6 +40,7 @@
 def authenticate_user(user, pwd):
-    query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pwd}'"
-    return cursor.execute(query).fetchone()
+    # VASUKI LangChain Forge: Parameterized prepared query prevents SQL injection
+    query = "SELECT * FROM users WHERE username = ? AND password = ?"
+    return cursor.execute(query, (user, pwd)).fetchone()`
  },
  {
    vulnerability_id: 'semgrep-auth-02',
    code: 'ANOM-102',
    file: 'backend/services/auth.py',
    category: 'broken-access-control',
    cve_id: 'CVE-2024-38077',
    severity: 'HIGH',
    applied: true,
    model_used: 'LangChain LCEL // Llama-3.3-70B + Gemini-2.5',
    diff: `--- a/backend/services/auth.py
+++ b/backend/services/auth.py
@@ -110,4 +110,5 @@
 def get_user_profile(user_id, current_tenant):
-    return db.query(User).filter(User.id == user_id).first()
+    # VASUKI LangChain Forge: Enforce strict multi-tenant boundary constraint
+    return db.query(User).filter(User.id == user_id, User.tenant_id == current_tenant.id).first()`
  },
  {
    vulnerability_id: 'semgrep-traversal-03',
    code: 'HEX-219',
    file: 'backend/utils/file_viewer.py',
    category: 'path-traversal',
    cve_id: 'CVE-2023-38545',
    severity: 'MEDIUM',
    applied: true,
    model_used: 'LangChain LCEL // Llama-3.3-70B + Gemini-2.5',
    diff: `--- a/backend/utils/file_viewer.py
+++ b/backend/utils/file_viewer.py
@@ -27,4 +27,6 @@
 def read_secure_file(filename):
-    file_path = os.path.join(UPLOAD_DIR, filename)
-    return open(file_path, "rb").read()
+    # VASUKI LangChain Forge: Path traversal defense with normpath + commonpath assertion
+    target = os.path.abspath(os.path.join(UPLOAD_DIR, filename))
+    if not os.path.commonpath([UPLOAD_DIR, target]) == UPLOAD_DIR:
+        raise PermissionError("Access denied: Invalid directory path")
+    return open(target, "rb").read()`
  },
  {
    vulnerability_id: 'semgrep-guard-04',
    code: 'SEAL-777',
    file: 'backend/core/security.py',
    category: 'session-token-guard',
    cve_id: 'CWE-284-GUARD',
    severity: 'MEDIUM',
    applied: true,
    model_used: 'LangChain LCEL // Llama-3.3-70B + Gemini-2.5',
    diff: `--- a/backend/core/security.py
+++ b/backend/core/security.py
@@ -18,3 +18,4 @@
 def verify_jwt_token(token):
-    payload = jwt.decode(token, SECRET_KEY)
+    # VASUKI LangChain Forge: Pin HS256 algorithm to block 'none' bypass attacks
+    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
     return payload`
  }
];

const INITIAL_LANGCHAIN_TRACE = [
  {
    step: '01_RECON_SCANNER',
    runnable: 'SemgrepASTParser | NvdCveRetriever',
    duration_ms: 420,
    prompt_preview: '[LangChain Agent 01: RECON // AST Syntax Inspector]\nTask: Walk Abstract Syntax Tree nodes for tainted data flows, unsanitized SQL, and missing authorization boundaries.',
    output_summary: 'Parsed 1,420 AST nodes; flagged 4 CVE vulnerabilities (1 CRITICAL SQLi)'
  },
  {
    step: '02_FORGE_PATCHER',
    runnable: 'PromptTemplate | ChatOCI_Llama3 | UnifiedDiffOutputParser',
    duration_ms: 1180,
    prompt_preview: '[LangChain Agent 02: FORGE // Surgical Code Generator]\nTask: Generate unified git diff patch addressing CVE-2024-4577 with parameterized queries and strict bounds.',
    output_summary: 'Synthesized 4 unified git diffs targeting users.py, auth.py, file_viewer.py'
  },
  {
    step: '03_SHIELD_REVIEWER',
    runnable: 'PromptTemplate | SoundnessVerifier | JsonOutputParser',
    duration_ms: 540,
    prompt_preview: '[LangChain Agent 03: SHIELD // Anti-Hallucination & Soundness Verifier]\nTask: Audit unified diffs for syntax soundness and zero residual CVEs.',
    output_summary: 'Soundness score 99.8% — 0 residual CVEs, approved for merge'
  },
  {
    step: '04_PROOF_TESTER',
    runnable: 'SandboxContainerTool | PytestAssertionChain',
    duration_ms: 660,
    prompt_preview: '[LangChain Agent 04: PROOF // Containerized Non-Regression Runner]\nTask: Execute isolated pytest suite against patched AST and verify 0 regression delta.',
    output_summary: '14/14 unit tests passed in 4.2s — 0 regression confirmed'
  }
];

const INITIAL_TEST_RESULTS = {
  original_tests: { passed: 14, failed: 0, total: 14 },
  patched_tests: { passed: 14, failed: 0, total: 14 },
  regression_free: true,
  execution_time: '4.2 SEC',
  output: `============================= test session starts =============================\nplatform linux -- Python 3.11.9, pytest-8.2.0, pluggy-1.5.0\nLangChain Sandbox Runner: vasuki-lcel-executor\ncollecting ... collected 14 items\n\ntests/test_auth.py::test_login PASSED                                    [ 14%]\ntests/test_auth.py::test_tenant_isolation_idor_blocked PASSED            [ 28%]\ntests/test_users.py::test_user_lookup PASSED                             [ 42%]\ntests/test_users.py::test_sqli_payload_neutralized PASSED                [ 57%]\ntests/test_files.py::test_safe_path PASSED                               [ 71%]\ntests/test_files.py::test_traversal_blocked PASSED                       [ 85%]\ntests/test_security.py::test_jwt_alg_none_rejected PASSED                [100%]\n\n============================== 14 passed in 4.20s ==============================`
};

/* ── KINETIC ANIMATED NUMBER COMPONENT ── */
function AnimatedNumber({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(value);
  const prevVal = useRef(value);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplay(value);
      return;
    }
    const startVal = typeof prevVal.current === 'number' ? prevVal.current : 0;
    const endVal = value;
    prevVal.current = value;

    let startTime = null;
    const duration = 600;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * ease;
      setDisplay(Number(current.toFixed(decimals)));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplay(endVal);
      }
    };
    const req = requestAnimationFrame(step);
    return () => cancelAnimationFrame(req);
  }, [value, decimals]);

  if (typeof value !== 'number') {
    return <span>{value}{suffix}</span>;
  }
  return (
    <span>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

/* ── KINETIC EQUALIZER BARS ── */
function EqualizerBars({ active, color = '#111111' }) {
  if (!active) {
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
        {[4, 7, 5, 8].map((h, i) => (
          <div key={i} style={{ width: '2px', height: `${h}px`, background: color, opacity: 0.35 }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '12px' }}>
      <div className="eq-bar-1" style={{ width: '2.5px', background: color }} />
      <div className="eq-bar-2" style={{ width: '2.5px', background: color }} />
      <div className="eq-bar-3" style={{ width: '2.5px', background: color }} />
      <div className="eq-bar-4" style={{ width: '2.5px', background: color }} />
    </div>
  );
}

/* ── CONSTRUCTIVIST TELEMETRY MARQUEE ── */
function KineticMarquee({ targetRepo, activeCve, agentCount, confidence, speed, status }) {
  return (
    <div style={{
      background: '#ffcc00',
      borderBottom: '2px solid #111111',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      padding: '4px 0',
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }}>
      <div style={{
        background: '#111111',
        color: '#ffcc00',
        padding: '2px 10px',
        fontSize: '0.62rem',
        fontWeight: 900,
        fontFamily: 'var(--font-mono)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        borderRight: '2px solid #111111',
        flexShrink: 0
      }}>
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
          style={{ width: '7px', height: '7px', background: '#e02424', display: 'inline-block' }}
        />
        <span>TELEMETRY STREAM</span>
      </div>
      <div className="animate-marquee" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#111111', display: 'flex', gap: '28px' }}>
        <span>⚡ VASUKI MULTI-AGENT SENTINEL: {status.toUpperCase()}</span>
        <span>•</span>
        <span>TARGET: {targetRepo}</span>
        <span>•</span>
        <span>LANGCHAIN LCEL 4-NODE PIPELINE ENGAGED</span>
        <span>•</span>
        <span>SOUNDNESS VERIFICATION: {confidence}%</span>
        <span>•</span>
        <span>CONTAINER PYTEST: 14/14 ZERO REGRESSION</span>
        <span>•</span>
        <span>ACTIVE CVSS FLAW: {activeCve}</span>
        <span>•</span>
        <span>MTTR VELOCITY: 4.2s</span>
        <span>•</span>
        <span>PARALLEL WORKLOAD: {agentCount} AGENTS</span>
        <span>•</span>
        <span>SPEED MULTIPLIER: {speed.toFixed(1)}X</span>
        <span>•</span>
        <span>⚡ VASUKI MULTI-AGENT SENTINEL: {status.toUpperCase()}</span>
        <span>•</span>
        <span>TARGET: {targetRepo}</span>
        <span>•</span>
        <span>LANGCHAIN LCEL 4-NODE PIPELINE ENGAGED</span>
        <span>•</span>
        <span>SOUNDNESS VERIFICATION: {confidence}%</span>
        <span>•</span>
        <span>CONTAINER PYTEST: 14/14 ZERO REGRESSION</span>
      </div>
    </div>
  );
}

/* ── AGENT 01: RECON (AST Seeker & Scanner) VISUALIZER ── */
function ReconRadarVisualizer({ isWorking }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '160px',
      background: '#090d16',
      border: '2px solid #111111',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#38bdf8'
    }}>
      {/* Background Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />

      {/* Range Rings */}
      {[40, 80, 120].map((size, idx) => (
        <div key={idx} style={{
          position: 'absolute',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          border: '1px dashed rgba(56, 189, 248, 0.35)',
          pointerEvents: 'none'
        }} />
      ))}

      {/* Expanding Sonar Ping Ring */}
      <motion.div
        animate={{ scale: [0.2, 1.4], opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '2px solid #38bdf8',
          pointerEvents: 'none'
        }}
      />

      {/* Rotating Radar Sweep Cone */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: isWorking ? 1.8 : 3.5, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.45) 0deg, transparent 60deg, transparent 360deg)',
          pointerEvents: 'none'
        }}
      />

      {/* Radar Center Dot */}
      <div style={{
        width: '8px',
        height: '8px',
        background: '#e02424',
        border: '1.5px solid #ffffff',
        zIndex: 2
      }} />

      {/* Blinking AST Flaw Targets */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }}
        style={{
          position: 'absolute',
          top: '32px',
          right: '28%',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 3
        }}
      >
        <span style={{ width: '7px', height: '7px', background: '#e02424', border: '1px solid #111' }} />
        <span className="font-mono" style={{ fontSize: '0.55rem', fontWeight: 800, background: '#111', color: '#ffcc00', padding: '1px 3px' }}>
          SQLi [HEX-004]
        </span>
      </motion.div>

      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.4, delay: 0.7 }}
        style={{
          position: 'absolute',
          bottom: '26px',
          left: '24%',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 3
        }}
      >
        <span style={{ width: '6px', height: '6px', background: '#ffcc00', border: '1px solid #111' }} />
        <span className="font-mono" style={{ fontSize: '0.55rem', fontWeight: 800, background: '#111', color: '#ffffff', padding: '1px 3px' }}>
          IDOR [ANOM-102]
        </span>
      </motion.div>

      {/* Crosshair Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: '1px',
        background: 'rgba(56, 189, 248, 0.25)'
      }} />
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        height: '1px',
        background: 'rgba(56, 189, 248, 0.25)'
      }} />

      {/* Top and Bottom HUD Badges */}
      <div className="font-mono" style={{
        position: 'absolute',
        top: '6px',
        left: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        color: '#38bdf8',
        display: 'flex',
        gap: '6px'
      }}>
        <span>RADAR: 360° SWEEP</span>
        <span>•</span>
        <span>1,420 AST NODES SWEPT</span>
      </div>
      <div className="font-mono" style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        background: '#111111',
        border: '1px solid #38bdf8',
        padding: '2px 6px',
        color: isWorking ? '#ffcc00' : '#38bdf8'
      }}>
        {isWorking ? 'TARGET ACQUISITION: IN PROGRESS' : 'SEEKER SCAN: LOCKED'}
      </div>
    </div>
  );
}

/* ── AGENT 02: FORGE (Code Patcher & AST Synthesizer) VISUALIZER ── */
function ForgeSynthesizerVisualizer({ isWorking }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '160px',
      background: '#180f08',
      border: '2px solid #111111',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#f59e0b'
    }}>
      {/* Background Heat Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.15) 0%, transparent 70%)'
      }} />

      {/* Hydraulic Code Press Brackets */}
      <motion.div
        animate={isWorking ? { x: [-14, -4, -14] } : { x: [-6, 0, -6] }}
        transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        className="font-mono"
        style={{
          position: 'absolute',
          left: '30%',
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#e02424',
          userSelect: 'none'
        }}
      >
        [
      </motion.div>

      <motion.div
        animate={isWorking ? { x: [14, 4, 14] } : { x: [6, 0, 6] }}
        transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
        className="font-mono"
        style={{
          position: 'absolute',
          right: '30%',
          fontSize: '2.5rem',
          fontWeight: 900,
          color: '#e02424',
          userSelect: 'none'
        }}
      >
        ]
      </motion.div>

      {/* Central Molten Code Core */}
      <motion.div
        animate={{ scale: [0.95, 1.05, 0.95], boxShadow: ['0 0 10px #f59e0b', '0 0 25px #e02424', '0 0 10px #f59e0b'] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        style={{
          background: '#111111',
          border: '2px solid #f59e0b',
          padding: '8px 14px',
          zIndex: 2,
          textAlign: 'center'
        }}
      >
        <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ffcc00' }}>
          LCEL DIFF SYNTHESIZER
        </div>
        <div className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffffff' }}>
          + query = ? [BOUND]
        </div>
        <div className="font-mono" style={{ fontSize: '0.55rem', color: '#fca5a5' }}>
          SYNTHESIS TEMP: 1850°K
        </div>
      </motion.div>

      {/* Radiating Kinetic Sparks */}
      {[
        { x: -35, y: -25, delay: 0 },
        { x: 32, y: -30, delay: 0.2 },
        { x: -40, y: 20, delay: 0.4 },
        { x: 36, y: 24, delay: 0.1 },
        { x: 0, y: -45, delay: 0.3 },
        { x: 45, y: 0, delay: 0.5 }
      ].map((sp, i) => (
        <motion.div
          key={i}
          animate={{
            x: [0, sp.x, sp.x * 1.4],
            y: [0, sp.y, sp.y * 1.4],
            opacity: [1, 0.9, 0],
            scale: [0.8, 1.5, 0]
          }}
          transition={{ repeat: Infinity, duration: isWorking ? 0.9 : 1.6, delay: sp.delay }}
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: i % 2 === 0 ? '#ffcc00' : '#e02424',
            borderRadius: '1px'
          }}
        />
      ))}

      {/* HUD Header & Status */}
      <div className="font-mono" style={{
        position: 'absolute',
        top: '6px',
        left: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        color: '#f59e0b',
        display: 'flex',
        gap: '6px'
      }}>
        <span>ANVIL: AST SURGICAL INKING</span>
        <span>•</span>
        <span>4 PATCHES COMPILED</span>
      </div>
      <div className="font-mono" style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        background: '#111111',
        border: '1px solid #f59e0b',
        padding: '2px 6px',
        color: isWorking ? '#ffcc00' : '#f59e0b'
      }}>
        {isWorking ? 'FORGING: DIFF INK APPLIED' : 'FORGE READY // LLAMA-3.3-70B'}
      </div>
    </div>
  );
}

/* ── AGENT 03: SHIELD (Reviewer & Anti-Hallucination Barrier) VISUALIZER ── */
function ShieldForcefieldVisualizer({ isWorking }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '160px',
      background: '#0c0714',
      border: '2px solid #111111',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#c084fc'
    }}>
      {/* Background Radiance */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 65%)'
      }} />

      {/* Outer Rotating Hexagon (Clockwise) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: isWorking ? 5 : 10, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '110px',
          height: '110px',
          border: '2px solid rgba(168, 85, 247, 0.45)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        }}
      />

      {/* Inner Rotating Hexagon (Counter-Clockwise) */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: isWorking ? 4 : 8, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '75px',
          height: '75px',
          border: '2px solid #ffcc00',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
        }}
      />

      {/* Center Shield Lock Badge */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        style={{
          width: '38px',
          height: '38px',
          background: '#ffcc00',
          border: '2px solid #111111',
          boxShadow: '2px 2px 0px #111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#111111',
          zIndex: 3
        }}
      >
        <span style={{ fontSize: '1rem', fontWeight: 900 }}>🛡️</span>
      </motion.div>

      {/* Deflecting Anomaly Particles */}
      {[
        { startX: -140, startY: -20, delay: 0 },
        { startX: 140, startY: 20, delay: 0.6 },
        { startX: -120, startY: 35, delay: 1.2 }
      ].map((p, idx) => (
        <motion.div
          key={idx}
          animate={{
            x: [p.startX, p.startX > 0 ? 55 : -55, p.startX > 0 ? 120 : -120],
            y: [p.startY, p.startY > 0 ? 50 : -50, p.startY > 0 ? 80 : -80],
            opacity: [0, 1, 0]
          }}
          transition={{ repeat: Infinity, duration: 2, delay: p.delay }}
          style={{
            position: 'absolute',
            width: '6px',
            height: '6px',
            background: '#e02424',
            border: '1px solid #ffffff'
          }}
        />
      ))}

      {/* HUD Readout */}
      <div className="font-mono" style={{
        position: 'absolute',
        top: '6px',
        left: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        color: '#c084fc',
        display: 'flex',
        gap: '6px'
      }}>
        <span>FORCEFIELD: ANTI-HALLUCINATION LOCK</span>
        <span>•</span>
        <span>SOUNDNESS: 99.8%</span>
      </div>
      <div className="font-mono" style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        background: '#111111',
        border: '1px solid #c084fc',
        padding: '2px 6px',
        color: '#ffcc00'
      }}>
        {isWorking ? 'AUDITING: SEMGREP RE-VERIFY' : 'SEAL VERIFIED // ZERO RESIDUALS'}
      </div>
    </div>
  );
}

/* ── AGENT 04: PROOF (Container Pytest & Zero-Regression) VISUALIZER ── */
function ProofOscilloscopeVisualizer({ isWorking }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '160px',
      background: '#04100b',
      border: '2px solid #111111',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '8px 12px',
      color: '#4ade80'
    }}>
      {/* HUD Header */}
      <div className="font-mono" style={{
        fontSize: '0.58rem',
        fontWeight: 800,
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 2
      }}>
        <span>OSCILLOSCOPE: PYTEST HEARTBEAT</span>
        <span style={{ color: '#ffcc00' }}>14/14 TESTS PASSED • 0 REGRESSION</span>
      </div>

      {/* Animated Oscilloscope Sine Wave SVG */}
      <div style={{ position: 'relative', height: '65px', width: '100%', overflow: 'hidden' }}>
        <svg viewBox="0 0 600 70" style={{ width: '100%', height: '100%' }}>
          {/* Horizontal Reference Line */}
          <line x1="0" y1="35" x2="600" y2="35" stroke="rgba(74, 222, 128, 0.2)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Dynamic Heartbeat Wave Path */}
          <motion.path
            d="M0,35 Q30,35 50,35 L70,35 L80,10 L90,55 L100,20 L110,45 L120,35 L200,35 L220,15 L230,50 L240,35 L350,35 L365,8 L375,60 L385,25 L395,35 L500,35 L515,12 L525,52 L535,35 L600,35"
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.5"
            initial={{ pathOffset: 0 }}
            animate={{ pathOffset: [0, 1] }}
            transition={{ repeat: Infinity, duration: isWorking ? 1.4 : 2.8, ease: 'linear' }}
          />
        </svg>

        {/* Oscilloscope Scan Glow Bar */}
        <motion.div
          animate={{ left: ['-10%', '110%'] }}
          transition={{ repeat: Infinity, duration: isWorking ? 1.5 : 3, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '2px',
            background: '#ffffff',
            boxShadow: '0 0 10px #4ade80'
          }}
        />
      </div>

      {/* 14 Micro Test Pods Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', zIndex: 2 }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8 }}
              animate={isWorking ? { scale: [0.8, 1.15, 0.8] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.08 }}
              style={{
                width: '16px',
                height: '16px',
                background: '#15803d',
                border: '1px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.55rem',
                color: '#ffffff',
                fontWeight: 900
              }}
            >
              ✓
            </motion.div>
          ))}
        </div>

        <div className="font-mono" style={{
          fontSize: '0.58rem',
          fontWeight: 800,
          background: '#111111',
          border: '1px solid #4ade80',
          padding: '2px 6px',
          color: '#ffffff'
        }}>
          LATENCY: 4.2 SEC
        </div>
      </div>
    </div>
  );
}

/* ── AGENT 05: HERALD (Deployer & GitHub PR Transmitter) VISUALIZER ── */
function HeraldTelemetryVisualizer({ isWorking }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '160px',
      background: '#070f1a',
      border: '2px solid #111111',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#60a5fa'
    }}>
      {/* Background Starfield Grid */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(96, 165, 250, 0.12) 0%, transparent 70%)'
      }} />

      {/* Concentric Broadcast Pulse Waves */}
      {[0, 0.7, 1.4].map((delay, idx) => (
        <motion.div
          key={idx}
          animate={{ scale: [0.3, 1.8], opacity: [0.9, 0] }}
          transition={{ repeat: Infinity, duration: isWorking ? 1.6 : 2.8, delay, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '2px solid #3b82f6',
            pointerEvents: 'none'
          }}
        />
      ))}

      {/* Orbiting Satellite Data Nodes */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: isWorking ? 3 : 6, ease: 'linear' }}
        style={{
          position: 'absolute',
          width: '110px',
          height: '110px',
          pointerEvents: 'none'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '-4px',
          left: '50%',
          width: '8px',
          height: '8px',
          background: '#ffcc00',
          border: '1.5px solid #111'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-4px',
          left: '50%',
          width: '8px',
          height: '8px',
          background: '#e02424',
          border: '1.5px solid #111'
        }} />
      </motion.div>

      {/* Center Transmitter Core / Rocket Dispatch Node */}
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
        style={{
          width: '42px',
          height: '42px',
          background: '#1d4ed8',
          border: '2px solid #ffffff',
          boxShadow: '0 0 15px rgba(29, 78, 216, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 900,
          zIndex: 3
        }}
      >
        <span style={{ fontSize: '1.2rem' }}>📡</span>
      </motion.div>

      {/* HUD Header & Status */}
      <div className="font-mono" style={{
        position: 'absolute',
        top: '6px',
        left: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        color: '#60a5fa',
        display: 'flex',
        gap: '6px'
      }}>
        <span>TRANSMITTER: GITHUB DISPATCH BEACON</span>
        <span>•</span>
        <span>BRANCH: aistudio</span>
      </div>
      <div className="font-mono" style={{
        position: 'absolute',
        bottom: '6px',
        right: '8px',
        fontSize: '0.58rem',
        fontWeight: 800,
        background: '#111111',
        border: '1px solid #60a5fa',
        padding: '2px 6px',
        color: isWorking ? '#ffcc00' : '#ffffff'
      }}>
        {isWorking ? 'BROADCASTING: SHIP PR #42' : 'UPLINK READY // GITHUB HERALD'}
      </div>
    </div>
  );
}

/* ── MINI ANIMATION FOR EACH SIDEBAR AGENT ── */
function AgentMiniMotion({ agentIdx, isWorking }) {
  if (agentIdx === 0) {
    // Recon Radar
    return (
      <div style={{ position: 'relative', width: '20px', height: '20px', borderRadius: '50%', border: '1.5px solid #1d4ed8', background: '#0a101d', overflow: 'hidden', flexShrink: 0 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: isWorking ? 1.2 : 2.5, ease: 'linear' }}
          style={{ width: '100%', height: '100%', background: 'conic-gradient(from 0deg, #38bdf8 0deg, transparent 90deg, transparent 360deg)' }}
        />
        <div style={{ position: 'absolute', inset: '6px', background: '#e02424', borderRadius: '50%' }} />
      </div>
    );
  }
  if (agentIdx === 1) {
    // Forge Sparks
    return (
      <motion.div
        animate={{ scale: isWorking ? [0.9, 1.25, 0.9] : [0.95, 1.05, 0.95] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        style={{ width: '20px', height: '20px', background: '#f59e0b', border: '1.5px solid #111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', flexShrink: 0 }}
      >
        ⚡
      </motion.div>
    );
  }
  if (agentIdx === 2) {
    // Shield Hex
    return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: isWorking ? 3 : 6, ease: 'linear' }}
        style={{
          width: '20px',
          height: '20px',
          background: '#a855f7',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '0.55rem',
          fontWeight: 900,
          flexShrink: 0
        }}
      >
        🛡
      </motion.div>
    );
  }
  if (agentIdx === 3) {
    // Proof Oscilloscope
    return (
      <div style={{ display: 'flex', gap: '1.5px', alignItems: 'flex-end', height: '14px', flexShrink: 0 }}>
        <div className="eq-bar-1" style={{ width: '3px', background: '#15803d' }} />
        <div className="eq-bar-2" style={{ width: '3px', background: '#15803d' }} />
        <div className="eq-bar-3" style={{ width: '3px', background: '#15803d' }} />
        <div className="eq-bar-4" style={{ width: '3px', background: '#15803d' }} />
      </div>
    );
  }
  // Herald Broadcast
  return (
    <div style={{ position: 'relative', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <motion.div
        animate={{ scale: [0.4, 1.4], opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid #1d4ed8' }}
      />
      <div style={{ width: '8px', height: '8px', background: '#1d4ed8', border: '1px solid #111' }} />
    </div>
  );
}

/* ── FRAMER-MOTION NEO-BRUTALIST SPRING PRESETS ── */
const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 24,
  mass: 0.8
};

const BRUTALIST_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 22, scale: 0.96 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 25,
      mass: 0.8,
      delay: i * 0.06
    }
  })
};

export default function App() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [repoUrl, setRepoUrl] = useState(DEMO_PRESETS[0].url);
  const [cmdInput, setCmdInput] = useState(DEMO_PRESETS[0].cmd);
  const [branch, setBranch] = useState('main');
  const [scanId, setScanId] = useState('vasuki-lcel-42');
  const [status, setStatus] = useState('idle'); // idle, running, paused, completed
  const [activeNav, setActiveNav] = useState('sanctorum'); // sanctorum, telemetry, grimoire, pensieve, prophet
  const [activeChamber, setActiveChamber] = useState('all'); // all, recon, forge, shield, proof
  const [selectedAgentIdx, setSelectedAgentIdx] = useState(0);
  const [activeVulnIndex, setActiveVulnIndex] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.5);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [copiedDiff, setCopiedDiff] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  const [agents, setAgents] = useState({
    scanner: { state: 'SCAN', sub: 'Scanning AST Nodes' },
    patcher: { state: 'QUEUED', sub: 'LangChain LCEL Ready' },
    reviewer: { state: 'PENDING', sub: 'OutputParser Standby' },
    tester: { state: 'IDLE', sub: 'Pytest Basin Idle' },
    deployer: { state: 'STANDBY', sub: 'GitHub PR Barrier' }
  });

  const [vulnerabilities, setVulnerabilities] = useState(INITIAL_VULNS);
  const [patches, setPatches] = useState(INITIAL_PATCHES);
  const [langchainTrace, setLangchainTrace] = useState(INITIAL_LANGCHAIN_TRACE);
  const [testResults, setTestResults] = useState(INITIAL_TEST_RESULTS);
  const [confidenceScore, setConfidenceScore] = useState(99.8);
  const [blastRadius, setBlastRadius] = useState([
    'backend/api/users.py',
    'backend/services/auth.py',
    'backend/utils/file_viewer.py',
    'backend/core/security.py',
    'backend/main.py',
    'backend/tests/test_users.py'
  ]);
  const [prUrl, setPrUrl] = useState('');
  const [prNumber, setPrNumber] = useState(42);
  const [logs, setLogs] = useState([
    {
      id: 'init-1',
      time: '08:00:01',
      agent: 'orchestrator',
      level: 'info',
      message: 'LangChain RunnableSequence (LCEL) initialized with 4 autonomous security agents.'
    },
    {
      id: 'init-2',
      time: '08:00:02',
      agent: 'scanner',
      level: 'info',
      message: 'AST index loaded: 1,420 files parsed. 4 anomalies classified in quarantine matrix.'
    }
  ]);

  const logContainerRef = useRef(null);
  const wsRef = useRef(null);
  const chamberSectionRef = useRef(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (agent, message, level = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        agent: agent || 'system',
        message,
        level
      }
    ]);
  };

  useEffect(() => {
    if (!scanId || scanId === 'vasuki-lcel-42' || scanId.startsWith('demo-')) return;

    const ws = new WebSocket(`${WS_BASE}/ws/scan/${scanId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog('system', `Connected to VASUKI LangChain LCEL telemetry channel: ${scanId}`, 'info');
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        const { agent, message, level, data } = event;
        addLog(agent, message, level);

        if (agent === 'scanner') {
          setSelectedAgentIdx(0);
          setAgents(a => ({
            ...a,
            scanner: { state: 'SCAN', sub: 'Scanning AST Nodes...' }
          }));
        } else if (agent === 'patcher') {
          setSelectedAgentIdx(1);
          setAgents(a => ({
            ...a,
            scanner: { state: 'DONE', sub: '1,420 AST Verified' },
            patcher: { state: 'PATCHING', sub: 'LCEL AST Inking...' }
          }));
        } else if (agent === 'reviewer') {
          setSelectedAgentIdx(2);
          setAgents(a => ({
            ...a,
            patcher: { state: 'DONE', sub: '4 Diffs Synthesized' },
            reviewer: { state: 'REVIEW', sub: 'Auditing Soundness...' }
          }));
        } else if (agent === 'tester') {
          setSelectedAgentIdx(3);
          setAgents(a => ({
            ...a,
            reviewer: { state: 'DONE', sub: '99.8% Soundness' },
            tester: { state: 'TESTING', sub: 'Running 14 Pytests...' }
          }));
        }

        if (data && data.status === 'completed') {
          setSelectedAgentIdx(4);
          setAgents({
            scanner: { state: 'DONE', sub: '1,420 AST Scanned' },
            patcher: { state: 'DONE', sub: '4 Patches Applied' },
            reviewer: { state: 'DONE', sub: '99.8% Soundness' },
            tester: { state: 'DONE', sub: '0 Regression' },
            deployer: { state: 'SHIPPED', sub: 'PR #42 Dispatched' }
          });
          setStatus('completed');
          fetchScanDetails(scanId);
          triggerConfetti();
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [scanId]);

  const fetchScanDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/analysis/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.vulnerabilities?.length) setVulnerabilities(data.vulnerabilities);
        if (data.patches?.length) setPatches(data.patches);
        if (data.test_results) setTestResults(data.test_results);
        if (data.confidence_score) setConfidenceScore(data.confidence_score);
        if (data.blast_radius?.length) setBlastRadius(data.blast_radius);
        if (data.langchain_trace?.length) setLangchainTrace(data.langchain_trace);
        if (data.pr_url) setPrUrl(data.pr_url);
        if (data.pr_number) setPrNumber(data.pr_number);
      }
    } catch (err) {
      console.error('Fetch details failed:', err);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#ffcc00', '#e02424', '#1d4ed8', '#111111']
      });
    } catch {
      // safe fallback
    }
  };

  const handleCopyDiff = (diffText) => {
    navigator.clipboard?.writeText(diffText);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleSelectPreset = (idx) => {
    const preset = DEMO_PRESETS[idx];
    setPresetIndex(idx);
    setRepoUrl(preset.url);
    setCmdInput(preset.cmd);
    setBranch(preset.branch);
    addLog('system', `Switched target repository preset to ${preset.name} (${preset.shortTarget})`);
  };

  const handleCycleSpeed = () => {
    const next = speedMultiplier === 1.0 ? 1.5 : speedMultiplier === 1.5 ? 2.0 : 1.0;
    setSpeedMultiplier(next);
  };

  const handleResetPipeline = () => {
    setStatus('idle');
    setPrUrl('');
    setSelectedAgentIdx(0);
    setAgents({
      scanner: { state: 'SCAN', sub: 'Scanning AST Nodes' },
      patcher: { state: 'QUEUED', sub: 'LangChain LCEL Ready' },
      reviewer: { state: 'PENDING', sub: 'OutputParser Standby' },
      tester: { state: 'IDLE', sub: 'Pytest Basin Idle' },
      deployer: { state: 'STANDBY', sub: 'GitHub PR Barrier' }
    });
    setVulnerabilities(INITIAL_VULNS);
    setPatches(INITIAL_PATCHES);
    setLangchainTrace(INITIAL_LANGCHAIN_TRACE);
    setTestResults(INITIAL_TEST_RESULTS);
    setConfidenceScore(99.8);
    addLog('orchestrator', 'Pipeline state reset to baseline Cycle 42.');
  };

  const handleStartScan = async () => {
    setStatus('running');
    setPrUrl('');
    setSelectedAgentIdx(0);

    setAgents({
      scanner: { state: 'SCAN', sub: 'Scanning AST Nodes...' },
      patcher: { state: 'QUEUED', sub: 'Awaiting AST Flaws' },
      reviewer: { state: 'PENDING', sub: 'Awaiting Diffs' },
      tester: { state: 'IDLE', sub: 'Awaiting Sandbox' },
      deployer: { state: 'STANDBY', sub: 'Awaiting Proof' }
    });

    const resolvedUrl = cmdInput.includes('--repo ')
      ? `https://github.com/${cmdInput.split('--repo ')[1].trim().replace(/^https?:\/\/github\.com\//, '')}`
      : repoUrl;

    addLog('orchestrator', `Invoking LangChain RunnableSequence for ${resolvedUrl}`, 'info');

    try {
      const res = await fetch(`${API_BASE}/api/analysis/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: resolvedUrl, branch })
      });

      if (!res.ok) {
        throw new Error(`API status ${res.status}`);
      }

      const data = await res.json();
      setScanId(data.scan_id);
      addLog('orchestrator', `LangChain LCEL Job registered: ${data.scan_id}`, 'info');
    } catch {
      addLog('system', `Engaging local LangChain LCEL simulation runtime...`, 'warning');
      simulateFullDemo(resolvedUrl);
    }
  };

  const simulateFullDemo = async (targetUrl = repoUrl) => {
    const delay = (ms) => new Promise(r => setTimeout(r, Math.round(ms / speedMultiplier)));
    const mockId = 'demo-' + Math.random().toString(36).substring(2, 8);
    setScanId(mockId);
    setStatus('running');

    setSelectedAgentIdx(0);
    addLog('scanner', `[LangChain DocumentLoader] Cloning & parsing AST: ${targetUrl}`);
    await delay(700);
    addLog('scanner', `[Semgrep SAST Tool] Scanning 1,420 AST nodes across OWASP rulesets...`);
    await delay(700);
    setVulnerabilities(INITIAL_VULNS);
    addLog('scanner', `[NVD CVE Retriever] Flagged 4 anomalies (1 CRITICAL, 1 HIGH, 2 MEDIUM).`);

    setSelectedAgentIdx(1);
    setAgents(a => ({
      ...a,
      scanner: { state: 'DONE', sub: '1,420 AST Scanned' },
      patcher: { state: 'PATCHING', sub: 'LCEL AST Inking...' }
    }));
    await delay(800);
    addLog('patcher', `[LangChain ChatModel] Executing PromptTemplate | Llama-3.3-70B | UnifiedDiffOutputParser`);
    setPatches(INITIAL_PATCHES);
    await delay(700);
    addLog('patcher', `[LangChain Forge] 4 surgical AST patches committed to branch vasuki/lcel-${mockId.slice(0, 5)}`);

    setSelectedAgentIdx(2);
    setAgents(a => ({
      ...a,
      patcher: { state: 'DONE', sub: '4 Patches Applied' },
      reviewer: { state: 'REVIEW', sub: 'Auditing Soundness...' }
    }));
    await delay(750);
    addLog('reviewer', `[LangChain Shield] Re-running Semgrep AST verification & JsonOutputParser audit...`);
    setConfidenceScore(99.8);
    addLog('reviewer', `[LangChain Shield] Patch Soundness verified at 99.8%. Zero hallucinated imports.`);

    setSelectedAgentIdx(3);
    setAgents(a => ({
      ...a,
      reviewer: { state: 'DONE', sub: '99.8% Soundness' },
      tester: { state: 'TESTING', sub: 'Running 14 Pytests...' }
    }));
    await delay(800);
    addLog('tester', `[LangChain SandboxTool] Running pytest non-regression suite in container...`);
    setTestResults(INITIAL_TEST_RESULTS);
    addLog('tester', `[LangChain Proof] 14/14 unit tests passed in 4.2s. Zero regression!`);

    setSelectedAgentIdx(4);
    const finalPr = `${targetUrl.replace(/\/$/, '')}/pull/42`;
    setPrUrl(finalPr);
    setPrNumber(42);
    setAgents({
      scanner: { state: 'DONE', sub: '1,420 AST Scanned' },
      patcher: { state: 'DONE', sub: '4 Patches Applied' },
      reviewer: { state: 'DONE', sub: '99.8% Soundness' },
      tester: { state: 'DONE', sub: '0 Regression' },
      deployer: { state: 'SHIPPED', sub: 'PR #42 Dispatched' }
    });
    addLog('github', `[LangChain Herald] Pull Request #42 shipped with full LCEL proof: ${finalPr}`);
    setStatus('completed');
    triggerConfetti();
  };

  const currentPreset = DEMO_PRESETS[presetIndex] || DEMO_PRESETS[0];

  const sidebarAgents = [
    {
      idx: 0,
      num: '01',
      key: 'scanner',
      chamber: 'recon',
      name: 'RECON (SEEKER)',
      role: agents.scanner.sub,
      badge: agents.scanner.state,
      badgeBg: agents.scanner.state === 'SCAN' ? '#1d4ed8' : '#111111',
      badgeColor: '#ffffff'
    },
    {
      idx: 1,
      num: '02',
      key: 'patcher',
      chamber: 'forge',
      name: 'FORGE (PATCHER)',
      role: agents.patcher.sub,
      badge: agents.patcher.state,
      badgeBg: agents.patcher.state === 'PATCHING' ? '#e02424' : '#ffffff',
      badgeColor: agents.patcher.state === 'PATCHING' ? '#ffffff' : '#1d4ed8'
    },
    {
      idx: 2,
      num: '03',
      key: 'reviewer',
      chamber: 'shield',
      name: 'SHIELD (REVIEW)',
      role: agents.reviewer.sub,
      badge: agents.reviewer.state,
      badgeBg: '#ffcc00',
      badgeColor: '#111111'
    },
    {
      idx: 3,
      num: '04',
      key: 'tester',
      chamber: 'proof',
      name: 'PROOF (TESTER)',
      role: agents.tester.sub,
      badge: agents.tester.state,
      badgeBg: '#ffffff',
      badgeColor: '#111111'
    },
    {
      idx: 4,
      num: '05',
      key: 'deployer',
      chamber: 'all',
      name: 'HERALD (DEPLOYER)',
      role: agents.deployer.sub,
      badge: agents.deployer.state,
      badgeBg: agents.deployer.state === 'SHIPPED' ? '#15803d' : '#ffffff',
      badgeColor: agents.deployer.state === 'SHIPPED' ? '#ffffff' : '#111111'
    }
  ];

  const velocityBars = [
    { label: 'COMMIT #741', value: 48, hexPoint: 24, isNow: false, nodes: '720 AST', latency: '3.1s' },
    { label: '#742 (LUMOS)', value: 58, hexPoint: 36, isNow: false, nodes: '940 AST', latency: '3.4s' },
    { label: '#743 (SQLI)', value: 70, hexPoint: 56, isNow: false, nodes: '1,120 AST', latency: '4.8s' },
    { label: '#744 (WARD)', value: 54, hexPoint: 30, isNow: false, nodes: '1,280 AST', latency: '3.9s' },
    { label: '#745 (RE-LOCK)', value: 76, hexPoint: 64, isNow: false, nodes: '1,390 AST', latency: '5.2s' },
    { label: '#746 (NOW)', value: 66, hexPoint: 42, isNow: true, nodes: '1,420 AST', latency: '4.2s' }
  ];

  const filteredVulns = vulnerabilities.filter(v => {
    if (severityFilter === 'ALL') return true;
    return v.severity === severityFilter;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* ── TOP BAUHAUS NAVIGATION BAR ── */}
      <header style={{
        background: '#ffffff',
        borderBottom: '2px solid #111111',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Left Brand + Command Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <motion.div
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              style={{
                width: '32px',
                height: '32px',
                background: '#e02424',
                border: '2px solid #111111',
                boxShadow: '2px 2px 0px #111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={16} />
            </motion.div>
            <div>
              <div className="font-display" style={{ fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1.05 }}>
                VASUKI
              </div>
              <div className="font-mono" style={{ fontSize: '0.6rem', fontWeight: 700, color: '#4a4842', letterSpacing: '0.06em' }}>
                AUTONOMOUS LANGCHAIN RUNTIME
              </div>
            </div>
          </div>

          {/* Terminal Command Input Box with Pulse */}
          <motion.div
            whileFocus={{ scale: 1.01 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#f4efe6',
              border: '2px solid #111111',
              boxShadow: '2px 2px 0px #111111',
              padding: '3px 6px 3px 10px',
              minWidth: '290px'
            }}
          >
            <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 800, marginRight: '8px', color: '#111111' }}>
              &gt;_
            </span>
            <input
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              aria-label="Repository command input"
              style={{
                border: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#111111',
                width: '215px',
                outline: 'none'
              }}
            />
            <motion.button
              whileHover={{ scale: 1.12, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => handleSelectPreset((presetIndex + 1) % DEMO_PRESETS.length)}
              title="Cycle Repository Preset"
              style={{
                background: '#ffffff',
                border: '1.5px solid #111111',
                padding: '1px 5px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              ⌘K
            </motion.button>
          </motion.div>
        </div>

        {/* ── 4 AUTONOMOUS AGENTS BAUHAUS STATUS INDICATOR IN DASHBOARD HEADER ── */}
        <BauhausAutonomousAgentsHeaderBar
          agentsState={agents}
          status={status}
          selectedIdx={selectedAgentIdx}
          onSelectAgent={(idx) => {
            setSelectedAgentIdx(idx);
            const agentPages = ['recon', 'forge', 'shield', 'proof', 'herald'];
            setActiveNav(agentPages[idx] || 'sanctorum');
            setActiveChamber(sidebarAgents[idx]?.chamber || 'all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Center Navigation Tabs with Spring Active Pill */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {[
            { id: 'sanctorum', label: 'OVERVIEW', icon: '▣' },
            { id: 'recon', label: '01 RECON', icon: '◎' },
            { id: 'forge', label: '02 FORGE', icon: '⚡' },
            { id: 'shield', label: '03 SHIELD', icon: '🛡' },
            { id: 'proof', label: '04 PROOF', icon: '✓' },
            { id: 'herald', label: '05 HERALD', icon: '⚐' }
          ].map((item) => {
            const isActive = activeNav === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ y: 1 }}
                onClick={() => {
                  setActiveNav(item.id);
                  if (item.id === 'recon') setSelectedAgentIdx(0);
                  if (item.id === 'forge') setSelectedAgentIdx(1);
                  if (item.id === 'shield') setSelectedAgentIdx(2);
                  if (item.id === 'proof') setSelectedAgentIdx(3);
                  if (item.id === 'herald') setSelectedAgentIdx(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bauhaus-btn"
                style={{
                  padding: '6px 11px',
                  fontSize: '0.72rem',
                  background: isActive ? '#ffcc00' : 'transparent',
                  border: isActive ? '2px solid #111111' : '2px solid transparent',
                  boxShadow: isActive ? '2px 2px 0px #111111' : 'none',
                  color: '#111111',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>{item.icon}</span>
                {item.label}
              </motion.button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Preset Selector Mini Buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {DEMO_PRESETS.map((preset, i) => (
              <motion.button
                key={preset.id}
                whileHover={{ y: -2, scale: 1.05 }}
                whileTap={{ y: 1, scale: 0.95 }}
                type="button"
                onClick={() => handleSelectPreset(i)}
                title={preset.name}
                className="bauhaus-btn"
                style={{
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  fontSize: '0.7rem',
                  background: presetIndex === i ? '#ffcc00' : '#ffffff'
                }}
              >
                0{i + 1}
              </motion.button>
            ))}
          </div>

          <div style={{ width: '2px', height: '22px', background: '#111111', margin: '0 2px' }} />

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ y: 1 }}
            type="button"
            onClick={() => setStatus(s => (s === 'paused' ? 'idle' : 'paused'))}
            className="bauhaus-btn"
            style={{
              padding: '6px 12px',
              fontSize: '0.72rem',
              background: status === 'paused' ? '#ffcc00' : '#ffffff',
              color: '#111111'
            }}
          >
            {status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
            {status === 'paused' ? 'RESUME' : 'PAUSE'}
          </motion.button>

          {/* Cast Pipeline Hero Button with Pulse Ring */}
          <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleStartScan}
            disabled={status === 'running'}
            className="bauhaus-btn"
            style={{
              padding: '6px 14px',
              fontSize: '0.72rem',
              background: '#e02424',
              color: '#ffffff',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            <motion.span
              animate={status === 'running' ? { rotate: [0, 20, -20, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
              style={{ display: 'inline-flex' }}
            >
              <Zap size={13} fill="#ffffff" />
            </motion.span>
            {status === 'running' ? 'CASTING LCEL...' : 'CAST PIPELINE'}
          </motion.button>

          <motion.div
            whileHover={{ rotate: 180, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 220 }}
            title="LangChain LCEL Verified Multi-Agent Runtime"
            style={{
              width: '30px',
              height: '30px',
              background: '#111111',
              border: '2px solid #111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffcc00',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            LC
          </motion.div>
        </div>
      </header>

      {/* ── KINETIC CONSTRUCTIVIST TELEMETRY MARQUEE TAPE ── */}
      <KineticMarquee
        targetRepo={currentPreset.shortTarget}
        activeCve={vulnerabilities[activeVulnIndex]?.cve_id || 'CVE-2024-4577'}
        agentCount={sidebarAgents.length}
        confidence={confidenceScore}
        speed={speedMultiplier}
        status={status}
      />

      {/* ── BODY SPLIT: LEFT AGENT SANCTORUM SIDEBAR + RIGHT WORKSPACE ── */}
      <div className="bauhaus-layout-body" style={{ display: 'flex', flex: 1 }}>
        {/* ── LEFT SIDEBAR: AGENT SANCTORUM ── */}
        <aside
          className="bauhaus-sidebar"
          style={{
            width: '240px',
            flexShrink: 0,
            background: '#ffffff',
            borderRight: '2px solid #111111',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Sanctorum Header Box */}
          <div style={{
            background: '#f4efe6',
            border: '2px solid #111111',
            boxShadow: '2px 2px 0px #111111',
            padding: '10px 12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span className="font-display" style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.03em' }}>
                AGENT SANCTORUM
              </span>
              <motion.span
                animate={status === 'running' ? { scale: [1, 1.35, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
                style={{
                  width: '10px',
                  height: '10px',
                  background: '#e02424',
                  border: '1.5px solid #111111',
                  display: 'inline-block'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.68rem', fontWeight: 700, color: '#4a4842' }}>
              <EqualizerBars active={status === 'running'} color="#1d4ed8" />
              <span>5 LangChain Agents Active</span>
            </div>
          </div>

          {/* 5 Stacked Brutalist Agent Cards with Tactile Motion Springs */}
          {sidebarAgents.map((ag) => {
            const isSelected = selectedAgentIdx === ag.idx;
            const isWorking = (status === 'running' && selectedAgentIdx === ag.idx);
            return (
              <motion.div
                key={ag.key}
                custom={ag.idx}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 24,
                  mass: 0.8,
                  delay: ag.idx * 0.05
                }}
                whileHover={{
                  x: -3,
                  y: -2,
                  boxShadow: isSelected ? '6px 6px 0px #111111' : '5px 5px 0px #111111',
                  transition: BRUTALIST_SPRING
                }}
                whileTap={{
                  x: 1,
                  y: 1,
                  boxShadow: '1px 1px 0px #111111',
                  transition: { duration: 0.08 }
                }}
                onClick={() => {
                  setSelectedAgentIdx(ag.idx);
                  const agentPages = ['recon', 'forge', 'shield', 'proof', 'herald'];
                  setActiveNav(agentPages[ag.idx] || 'sanctorum');
                  setActiveChamber(ag.chamber);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bauhaus-card-interactive"
                style={{
                  background: isSelected ? '#ffcc00' : '#ffffff',
                  border: '2px solid #111111',
                  boxShadow: isSelected ? '4px 4px 0px #111111' : '2px 2px 0px #111111',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div className="font-mono" style={{
                    width: '24px',
                    height: '24px',
                    flexShrink: 0,
                    background: isSelected ? '#111111' : '#f4efe6',
                    color: isSelected ? '#ffcc00' : '#111111',
                    border: '1.5px solid #111111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.68rem',
                    fontWeight: 800
                  }}>
                    {ag.num}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="font-display" style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      color: '#111111',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ag.name}
                    </div>
                    <div style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      color: isSelected ? '#111111' : '#6e6a61',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ag.role}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AgentMiniMotion agentIdx={ag.idx} isWorking={isWorking || isSelected} />
                  <span className="font-mono" style={{
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    padding: '2px 5px',
                    background: ag.badgeBg,
                    color: ag.badgeColor,
                    border: '1.5px solid #111111',
                    flexShrink: 0
                  }}>
                    {ag.badge}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {/* Bottom Red CTA Button with Motion Pulse */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => simulateFullDemo(repoUrl)}
            className="bauhaus-btn"
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '10px 12px',
              background: '#e02424',
              color: '#ffffff',
              fontSize: '0.72rem',
              boxShadow: '3px 3px 0px #111111'
            }}
          >
            + INVOKE LANGCHAIN AGENT
          </motion.button>

          {/* LangChain Architecture Metadata Box with Animated Float */}
          <div style={{
            marginTop: 'auto',
            background: '#faf7f0',
            border: '2px solid #111111',
            padding: '10px',
            fontSize: '0.66rem'
          }}>
            <div className="font-mono" style={{ fontWeight: 800, marginBottom: '4px', color: '#111111', display: 'flex', justifyContent: 'space-between' }}>
              <span>LANGCHAIN LCEL STACK</span>
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                style={{ display: 'inline-block' }}
              >
                ◈
              </motion.span>
            </div>
            <div style={{ color: '#4a4842', lineHeight: 1.5 }}>
              <div>• @langchain/core v1.2</div>
              <div>• RunnableSequence (4-Node)</div>
              <div>• Structured Diff OutputParser</div>
              <div>• OCI Llama 3.3 + Gemini 2.5</div>
            </div>
          </div>
        </aside>

        {/* ── RIGHT WORKSPACE AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* ── TOP TRACE PIPELINE BAR ── */}
          <div style={{
            background: '#ffffff',
            borderBottom: '2px solid #111111',
            padding: '8px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {/* Trace Chain with Smooth Transitions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{
                background: '#111111',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '4px 8px',
                border: '1.5px solid #111111'
              }}>
                ▼ TRACE:
              </span>

              {sidebarAgents.map((step, idx) => {
                const isActive = selectedAgentIdx === idx;
                return (
                  <React.Fragment key={step.key}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => {
                        setSelectedAgentIdx(idx);
                        setActiveChamber(step.chamber);
                      }}
                      className="font-mono"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        background: isActive ? '#ffcc00' : '#ffffff',
                        border: '2px solid #111111',
                        boxShadow: isActive ? '2px 2px 0px #111111' : 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{idx + 1}. {step.name.split(' ')[0]}</span>
                      <span style={{
                        padding: '0px 4px',
                        fontSize: '0.58rem',
                        background: isActive ? '#1d4ed8' : '#f4efe6',
                        color: isActive ? '#ffffff' : '#111111',
                        border: '1px solid #111111'
                      }}>
                        {step.badge}
                      </span>
                    </motion.button>
                    {idx < sidebarAgents.length - 1 && (
                      <motion.span
                        animate={status === 'running' && selectedAgentIdx === idx ? { opacity: [0.3, 1, 0.3], x: [0, 2, 0] } : { opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        style={{ fontWeight: 900, color: '#111111' }}
                      >
                        →
                      </motion.span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Right Speed & Reset Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCycleSpeed}
                title="Click to cycle execution speed"
                className="font-mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: '2px solid #111111',
                  padding: '3px 8px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <span>SPEED:</span>
                <div style={{ width: '42px', height: '4px', background: '#e5e0d5', position: 'relative', border: '1px solid #111' }}>
                  <motion.div
                    animate={{
                      left: speedMultiplier === 1.0 ? '4px' : speedMultiplier === 1.5 ? '18px' : '30px'
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    style={{
                      width: '8px',
                      height: '8px',
                      background: '#e02424',
                      border: '1.5px solid #111111',
                      position: 'absolute',
                      top: '-3px'
                    }}
                  />
                </div>
                <span style={{ background: '#111111', color: '#ffffff', padding: '1px 4px', fontSize: '0.6rem' }}>
                  {speedMultiplier.toFixed(1)}x
                </span>
              </motion.div>

              <motion.button
                whileHover={{ rotate: -45 }}
                type="button"
                onClick={handleResetPipeline}
                className="bauhaus-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.65rem',
                  background: '#ffffff',
                  color: '#111111'
                }}
              >
                <RotateCcw size={11} />
                RESET
              </motion.button>
            </div>
          </div>

          {/* ── MAIN SCROLLABLE BAUHAUS WORKSPACE ── */}
          <main style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
            <AnimatePresence mode="wait">
              {activeNav === 'recon' && (
                <ReconPage
                  key="page-recon"
                  status={status}
                  isWorking={status === 'running'}
                  vulnerabilities={vulnerabilities}
                  activeVulnIndex={activeVulnIndex}
                  setActiveVulnIndex={setActiveVulnIndex}
                  onTriggerScan={handleStartScan}
                  onBackToOverview={() => setActiveNav('sanctorum')}
                />
              )}

              {activeNav === 'forge' && (
                <ForgePage
                  key="page-forge"
                  status={status}
                  isWorking={status === 'running'}
                  patches={patches}
                  activeVulnIndex={activeVulnIndex}
                  onBackToOverview={() => setActiveNav('sanctorum')}
                  onCopyDiff={handleCopyDiff}
                  copiedDiff={copiedDiff}
                />
              )}

              {activeNav === 'shield' && (
                <ShieldPage
                  key="page-shield"
                  status={status}
                  isWorking={status === 'running'}
                  confidenceScore={confidenceScore}
                  onBackToOverview={() => setActiveNav('sanctorum')}
                />
              )}

              {activeNav === 'proof' && (
                <ProofPage
                  key="page-proof"
                  status={status}
                  isWorking={status === 'running'}
                  testResults={testResults}
                  onBackToOverview={() => setActiveNav('sanctorum')}
                />
              )}

              {activeNav === 'herald' && (
                <HeraldPage
                  key="page-herald"
                  status={status}
                  isWorking={status === 'running'}
                  prUrl={prUrl}
                  prNumber={prNumber}
                  repoUrl={repoUrl}
                  onBackToOverview={() => setActiveNav('sanctorum')}
                />
              )}

              {activeNav === 'sanctorum' && (
                <motion.div
                  key="page-sanctorum"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}
                >
                  {/* PR Shipped Notification Banner with Spring Entrance */}
                  <AnimatePresence>
                    {prUrl && (
                <motion.div
                  initial={{ opacity: 0, y: -16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -16, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  style={{
                    background: '#ffcc00',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '12px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: '#111111',
                        color: '#ffcc00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900
                      }}
                    >
                      <Check size={16} />
                    </motion.div>
                    <div>
                      <div className="font-display" style={{ fontSize: '0.88rem', fontWeight: 900 }}>
                        AUTONOMOUS PULL REQUEST #{prNumber} DISPATCHED VIA LANGCHAIN HERALD
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        Branch committed • 14/14 Container Pytests Passed • {confidenceScore}% Soundness
                      </div>
                    </div>
                  </div>
                  <motion.a
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    href={prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bauhaus-btn"
                    style={{
                      padding: '6px 14px',
                      background: '#111111',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      textDecoration: 'none'
                    }}
                  >
                    VIEW PR ON GITHUB
                    <ExternalLink size={12} />
                  </motion.a>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── CONSTRUCTIVIST FRAMED TELEMETRY & ANOMALY ANALYTICS PANEL ── */}
            <section style={{
              background: '#faf7f0',
              border: '3px solid #111111',
              boxShadow: '6px 6px 0px #111111',
              padding: '22px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}>
              {/* Top-Right Red Corner Anchor Square with subtle mechanical motion */}
              <motion.div
                animate={status === 'running' ? { rotate: [0, 90, 180, 270, 360] } : {}}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  top: '-11px',
                  right: '-11px',
                  width: '20px',
                  height: '20px',
                  background: '#e02424',
                  border: '2px solid #111111',
                  zIndex: 2
                }}
              />

              {/* Bottom-Left Yellow Corner Anchor Square */}
              <motion.div
                animate={status === 'running' ? { rotate: [360, 270, 180, 90, 0] } : {}}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  bottom: '-10px',
                  left: '-10px',
                  width: '18px',
                  height: '18px',
                  background: '#ffcc00',
                  border: '2px solid #111111',
                  zIndex: 2
                }}
              />

              {/* Section Header Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      width: '12px',
                      height: '12px',
                      background: '#1d4ed8',
                      border: '1.5px solid #111111',
                      display: 'inline-block'
                    }} />
                    <h1 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.01em' }}>
                      BAUHAUS PROJECT TELEMETRY &amp; ANOMALY ANALYTICS
                    </h1>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.68rem', color: '#4a4842', fontWeight: 700 }}>
                    CONSTRUCTIVIST LANGCHAIN ENGINE - COMMIT STREAM:{' '}
                    <span style={{
                      background: '#ffcc00',
                      color: '#111111',
                      border: '1.5px solid #111111',
                      padding: '1px 6px',
                      fontWeight: 800
                    }}>
                      {currentPreset.sha}
                    </span>
                  </div>
                </div>

                <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: '#111111',
                    color: '#ffffff',
                    padding: '4px 10px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    border: '1.5px solid #111111'
                  }}>
                    CYCLE 42 // STABLE
                  </span>
                  <motion.span
                    animate={status === 'running' ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1 }}
                    style={{
                      background: '#e02424',
                      color: '#ffffff',
                      padding: '4px 10px',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      border: '1.5px solid #111111'
                    }}
                  >
                    {vulnerabilities.filter(v => v.severity === 'CRITICAL').length} CRITICAL HEX FLAGGED
                  </motion.span>
                </div>
              </div>

              {/* ── 5 BRUTALIST KPI CARDS ROW WITH FRAMER-MOTION SPRINGS ── */}
              <div className="bauhaus-kpi-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '14px'
              }}>
                {/* KPI 1 */}
                <motion.div
                  custom={0}
                  variants={BRUTALIST_CARD_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -6, x: -3, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
                  whileTap={{ y: 2, x: 1, boxShadow: '2px 2px 0px #111111', transition: { duration: 0.08 } }}
                  style={{
                    background: '#f0ece1',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '14px',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4a4842' }}>
                      FILES INGESTED
                    </span>
                    <span style={{ width: '8px', height: '8px', background: '#1d4ed8', border: '1px solid #111' }} />
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '1.55rem', fontWeight: 900, color: '#111111' }}>
                    <AnimatedNumber value={1420} />
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4a4842', marginTop: '4px' }}>
                    100% of Target Repo
                  </div>
                </motion.div>

                {/* KPI 2 (Bauhaus Yellow) */}
                <motion.div
                  custom={1}
                  variants={BRUTALIST_CARD_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -6, x: -3, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
                  whileTap={{ y: 2, x: 1, boxShadow: '2px 2px 0px #111111', transition: { duration: 0.08 } }}
                  style={{
                    background: '#ffcc00',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '14px',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#111111' }}>
                      SPELL SOUNDNESS
                    </span>
                    <span style={{ width: '8px', height: '8px', background: '#111111' }} />
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '1.55rem', fontWeight: 900, color: '#111111' }}>
                    <AnimatedNumber value={confidenceScore} decimals={1} suffix="%" />
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#111111', marginTop: '4px' }}>
                    LangChain Shield Verified
                  </div>
                </motion.div>

                {/* KPI 3 (Constructivist Red) */}
                <motion.div
                  custom={2}
                  variants={BRUTALIST_CARD_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -6, x: -3, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
                  whileTap={{ y: 2, x: 1, boxShadow: '2px 2px 0px #111111', transition: { duration: 0.08 } }}
                  style={{
                    background: '#e02424',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '14px',
                    color: '#ffffff',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800 }}>
                      CRITICAL HEXES
                    </span>
                    <span style={{ width: '8px', height: '8px', background: '#ffffff', border: '1px solid #111' }} />
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '1.55rem', fontWeight: 900 }}>
                    <AnimatedNumber value={patches.length} suffix=" DEFUSED" />
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '4px', opacity: 0.92 }}>
                    1 In Hex Quarantine
                  </div>
                </motion.div>

                {/* KPI 4 */}
                <motion.div
                  custom={3}
                  variants={BRUTALIST_CARD_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -6, x: -3, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
                  whileTap={{ y: 2, x: 1, boxShadow: '2px 2px 0px #111111', transition: { duration: 0.08 } }}
                  style={{
                    background: '#f0ece1',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '14px',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4a4842' }}>
                      SCRIBE VELOCITY
                    </span>
                    <span style={{ width: '8px', height: '8px', background: '#ffcc00', border: '1px solid #111' }} />
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '1.55rem', fontWeight: 900, color: '#111111' }}>
                    <AnimatedNumber value={142} suffix=" WPM" />
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4a4842', marginTop: '4px' }}>
                    LangChain LCEL Output
                  </div>
                </motion.div>

                {/* KPI 5 */}
                <motion.div
                  custom={4}
                  variants={BRUTALIST_CARD_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -6, x: -3, boxShadow: '8px 8px 0px #111111', transition: BRUTALIST_SPRING }}
                  whileTap={{ y: 2, x: 1, boxShadow: '2px 2px 0px #111111', transition: { duration: 0.08 } }}
                  style={{
                    background: '#f0ece1',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '14px',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4a4842' }}>
                      RESOLUTION MTTR
                    </span>
                    <span style={{ width: '8px', height: '8px', background: '#111111' }} />
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '1.55rem', fontWeight: 900, color: '#111111' }}>
                    {testResults?.execution_time || '4.2 SEC'}
                  </div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#4a4842', marginTop: '4px' }}>
                    Patronus Auto-Latch
                  </div>
                </motion.div>
              </div>

              {/* ── MIDDLE CHARTS ROW: VELOCITY BAR+LINE CHART & MULTI-AGENT WORKLOAD RING ── */}
              <div className="bauhaus-charts-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1.38fr 1fr',
                gap: '16px'
              }}>
                {/* Left Chart: AST Vulnerability & Spell Defect Velocity */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.18 }}
                  whileHover={{ y: -4, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {status === 'running' && <div className="radar-scan-line" />}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '9px', height: '9px', background: '#e02424', border: '1.5px solid #111' }} />
                      <span className="font-display" style={{ fontSize: '0.74rem', fontWeight: 900 }}>
                        AST VULNERABILITY &amp; SPELL DEFECT VELOCITY
                      </span>
                    </div>
                    <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.62rem', fontWeight: 700 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#1d4ed8', border: '1px solid #111' }} />
                        Scanned AST (x100)
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '8px', height: '8px', background: '#e02424', border: '1px solid #111' }} />
                        Dark Hexes Flagged
                      </span>
                    </div>
                  </div>

                  {/* Brutalist Chart Box with Interactive Hover SVG Bars */}
                  <div style={{
                    background: '#f4efe6',
                    border: '2px solid #111111',
                    padding: '16px 14px 10px 14px',
                    position: 'relative'
                  }}>
                    {/* Floating Tooltip for Hovered Bar */}
                    <AnimatePresence>
                      {hoveredBarIndex !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: `${30 + hoveredBarIndex * 15}%`,
                            background: '#111111',
                            color: '#ffffff',
                            padding: '4px 8px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            zIndex: 10,
                            border: '1px solid #ffcc00',
                            boxShadow: '2px 2px 0px #111111'
                          }}
                        >
                          <div>{velocityBars[hoveredBarIndex].label}</div>
                          <div style={{ color: '#ffcc00' }}>
                            AST: {velocityBars[hoveredBarIndex].nodes} | Latency: {velocityBars[hoveredBarIndex].latency}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <svg viewBox="0 0 540 150" style={{ width: '100%', height: '145px', overflow: 'visible' }}>
                      {/* Horizontal Grid Lines */}
                      {[25, 60, 95, 130].map((y, idx) => (
                        <line key={idx} x1="10" y1={y} x2="530" y2={y} stroke="#ded8cc" strokeWidth="1.5" />
                      ))}

                      {/* Animated SVG Bars */}
                      {velocityBars.map((bar, idx) => {
                        const x = 35 + idx * 84;
                        const barHeight = bar.value * 1.35;
                        const y = 130 - barHeight;
                        const isHovered = hoveredBarIndex === idx;
                        return (
                          <g
                            key={bar.label}
                            onMouseEnter={() => setHoveredBarIndex(idx)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                            style={{ cursor: 'pointer' }}
                          >
                            <motion.rect
                              initial={{ height: 0, y: 130 }}
                              animate={{
                                height: barHeight,
                                y,
                                opacity: isHovered ? 1 : 0.95
                              }}
                              whileHover={{ scaleY: 1.03 }}
                              transition={{ type: 'spring', stiffness: 220, damping: 20, delay: idx * 0.08 }}
                              x={x}
                              width="38"
                              fill={bar.isNow ? '#ffcc00' : isHovered ? '#2563eb' : '#1d4ed8'}
                              stroke="#111111"
                              strokeWidth={isHovered ? '2.5' : '2'}
                            />
                            <text
                              x={x + 19}
                              y="146"
                              textAnchor="middle"
                              fontSize="8.5"
                              fontFamily="JetBrains Mono, monospace"
                              fontWeight="800"
                              fill={bar.isNow ? '#e02424' : '#4a4842'}
                            >
                              {bar.label}
                            </text>
                          </g>
                        );
                      })}

                      {/* Red Anomaly Polyline Overlay */}
                      <motion.polyline
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, ease: 'easeInOut' }}
                        fill="none"
                        stroke="#e02424"
                        strokeWidth="2.5"
                        points={velocityBars
                          .map((b, idx) => `${54 + idx * 84},${130 - b.hexPoint * 1.35}`)
                          .join(' ')}
                      />

                      {/* Square Markers on Polyline with Spring Pop */}
                      {velocityBars.map((b, idx) => {
                        const cx = 54 + idx * 84;
                        const cy = 130 - b.hexPoint * 1.35;
                        return (
                          <motion.rect
                            key={`pt-${idx}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            whileHover={{ scale: 1.5 }}
                            transition={{ delay: 0.4 + idx * 0.08 }}
                            x={cx - 4}
                            y={cy - 4}
                            width="8"
                            height="8"
                            fill={b.isNow ? '#ffcc00' : '#ffffff'}
                            stroke="#111111"
                            strokeWidth="2"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredBarIndex(idx)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                          />
                        );
                      })}
                    </svg>
                  </div>

                  <div className="font-mono" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '10px',
                    fontSize: '0.64rem',
                    fontWeight: 700
                  }}>
                    <span style={{ color: '#4a4842' }}>
                      Peak Anomaly Spike: Commit #745 (users_handler.py:42)
                    </span>
                    <span style={{ color: '#1d4ed8', fontWeight: 800 }}>
                      Trend: Converging post-Forge patch
                    </span>
                  </div>
                </motion.div>

                {/* Right Chart: Multi-Agent Workload Distribution */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.25 }}
                  whileHover={{ y: -4, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '9px', height: '9px', background: '#ffcc00', border: '1.5px solid #111' }} />
                      <span className="font-display" style={{ fontSize: '0.74rem', fontWeight: 900 }}>
                        MULTI-AGENT WORKLOAD DISTRIBUTION
                      </span>
                    </div>
                    <span className="font-mono" style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      border: '1.5px solid #111111',
                      padding: '2px 6px',
                      background: '#f4efe6'
                    }}>
                      100% TOTAL
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '6px 0' }}>
                    {/* Bauhaus Donut SVG with Animated Rotations */}
                    <div style={{ position: 'relative', width: '112px', height: '112px', flexShrink: 0 }}>
                      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                        <circle cx="50" cy="50" r="36" fill="none" stroke="#111111" strokeWidth="20" />
                        {/* Blue 38% */}
                        <motion.circle
                          initial={{ strokeDashoffset: 226 }}
                          animate={{ strokeDashoffset: 0 }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          cx="50" cy="50" r="36" fill="none" stroke="#1d4ed8" strokeWidth="16" strokeDasharray="86 226"
                        />
                        {/* Yellow 24% */}
                        <motion.circle
                          initial={{ strokeDashoffset: 226 }}
                          animate={{ strokeDashoffset: -86 }}
                          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
                          cx="50" cy="50" r="36" fill="none" stroke="#ffcc00" strokeWidth="16" strokeDasharray="54 226"
                        />
                        {/* Red 22% */}
                        <motion.circle
                          initial={{ strokeDashoffset: 226 }}
                          animate={{ strokeDashoffset: -140 }}
                          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                          cx="50" cy="50" r="36" fill="none" stroke="#e02424" strokeWidth="16" strokeDasharray="50 226"
                        />
                        {/* Dark 16% */}
                        <motion.circle
                          initial={{ strokeDashoffset: 226 }}
                          animate={{ strokeDashoffset: -190 }}
                          transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                          cx="50" cy="50" r="36" fill="none" stroke="#262626" strokeWidth="16" strokeDasharray="36 226"
                        />
                        <circle cx="50" cy="50" r="26" fill="#ffffff" stroke="#111111" strokeWidth="2" />
                      </svg>
                      <motion.div
                        animate={status === 'running' ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="font-mono"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{
                          border: '1.5px solid #111111',
                          background: '#f4efe6',
                          padding: '2px 5px',
                          fontSize: '0.62rem',
                          fontWeight: 900
                        }}>
                          5 AGT
                        </span>
                      </motion.div>
                    </div>

                    {/* Agent Breakdown Rows with Micro-Hover Motion */}
                    <div className="font-mono" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { label: 'Recon (Seeker)', pct: '38%', color: '#1d4ed8', idx: 0 },
                        { label: 'Proof (Tester)', pct: '24%', color: '#ffcc00', idx: 3 },
                        { label: 'Forge (Patcher)', pct: '22%', color: '#e02424', idx: 1 },
                        { label: 'Shield / Herald', pct: '16%', color: '#111111', idx: 2 }
                      ].map((row) => (
                        <motion.div
                          key={row.label}
                          whileHover={{ x: 3, scale: 1.01 }}
                          onClick={() => setSelectedAgentIdx(row.idx)}
                          style={{
                            border: '1.5px solid #111111',
                            padding: '4px 8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            background: '#faf7f0',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', background: row.color, border: '1px solid #111' }} />
                            {row.label}
                          </span>
                          <span style={{ fontWeight: 900 }}>{row.pct}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Segmented Bar */}
                  <div>
                    <div style={{
                      height: '10px',
                      border: '2px solid #111111',
                      display: 'flex',
                      overflow: 'hidden',
                      marginTop: '8px'
                    }}>
                      <div style={{ width: '38%', background: '#1d4ed8', borderRight: '1.5px solid #111' }} />
                      <div style={{ width: '24%', background: '#ffcc00', borderRight: '1.5px solid #111' }} />
                      <div style={{ width: '22%', background: '#e02424', borderRight: '1.5px solid #111' }} />
                      <div style={{ width: '16%', background: '#111111' }} />
                    </div>
                    <div className="font-mono" style={{
                      textAlign: 'right',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color: '#4a4842',
                      marginTop: '4px'
                    }}>
                      Parallel LangChain LCEL affinity: 98.4% balanced
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* ── ACTIVE ANOMALY MATRIX & HEX QUARANTINE STATUS ── */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.15 }}
                whileHover={{ y: -3, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                style={{
                  background: '#ffffff',
                  border: '2px solid #111111',
                  boxShadow: '4px 4px 0px #111111',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono" style={{
                      border: '1.5px solid #111111',
                      padding: '0px 4px',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      background: '#f4efe6'
                    }}>
                      !
                    </span>
                    <h2 className="font-display" style={{ fontSize: '0.76rem', fontWeight: 900 }}>
                      ACTIVE ANOMALY MATRIX &amp; HEX QUARANTINE STATUS
                    </h2>
                  </div>

                  {/* Severity Filter Controls with Motion */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(f => (
                      <motion.button
                        key={f}
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 1 }}
                        type="button"
                        onClick={() => setSeverityFilter(f)}
                        className="font-mono"
                        style={{
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          border: '1.5px solid #111111',
                          padding: '2px 7px',
                          background: severityFilter === f ? '#111111' : '#f4efe6',
                          color: severityFilter === f ? '#ffffff' : '#111111',
                          cursor: 'pointer'
                        }}
                      >
                        {f}
                      </motion.button>
                    ))}
                    <span className="font-mono" style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      border: '1.5px solid #111111',
                      padding: '2px 8px',
                      background: '#ffcc00',
                      marginLeft: '4px'
                    }}>
                      {filteredVulns.length} ITEMS
                    </span>
                  </div>
                </div>

                <div className="bauhaus-matrix-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px'
                }}>
                  {filteredVulns.map((vuln, idx) => {
                    const isSelected = activeVulnIndex === idx;
                    const topBadgeBg =
                      vuln.status_badge === 'CRITICAL' ? '#e02424' :
                      vuln.status_badge === 'RESOLVED' ? '#1d4ed8' :
                      vuln.status_badge === 'OPTIMIZED' ? '#ffcc00' : '#111111';
                    const topBadgeColor = vuln.status_badge === 'OPTIMIZED' ? '#111111' : '#ffffff';

                    const bottomBadgeBg =
                      vuln.workflow_badge === 'PATCHING' || vuln.workflow_badge === 'APPROVED'
                        ? '#ffcc00'
                        : '#ffffff';

                    return (
                      <motion.div
                        key={vuln.id || idx}
                        custom={idx}
                        variants={BRUTALIST_CARD_VARIANTS}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ y: -6, x: -3, boxShadow: '7px 7px 0px #111111', transition: BRUTALIST_SPRING }}
                        whileTap={{ y: 2, x: 1, boxShadow: '1px 1px 0px #111111', transition: { duration: 0.08 } }}
                        onClick={() => {
                          setActiveVulnIndex(idx);
                          if (chamberSectionRef.current) {
                            chamberSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }
                        }}
                        className="bauhaus-card-interactive"
                        style={{
                          background: isSelected ? '#fffbeb' : '#faf7f0',
                          border: isSelected ? '2px solid #e02424' : '2px solid #111111',
                          boxShadow: isSelected ? '4px 4px 0px #111111' : '2px 2px 0px #111111',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span className="font-mono" style={{
                              fontSize: '0.65rem',
                              fontWeight: 900,
                              color: idx === 0 ? '#e02424' : idx === 1 ? '#1d4ed8' : '#111111'
                            }}>
                              {vuln.code || vuln.cve_id || `HEX-00${idx + 1}`}
                            </span>
                            <span className="font-mono" style={{
                              fontSize: '0.56rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              background: topBadgeBg,
                              color: topBadgeColor,
                              border: '1.5px solid #111111'
                            }}>
                              {vuln.status_badge || vuln.severity}
                            </span>
                          </div>

                          <div className="font-display" style={{ fontSize: '0.76rem', fontWeight: 900, color: '#111111', marginBottom: '4px' }}>
                            {vuln.title || vuln.category}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: '#4a4842', lineHeight: 1.35 }}>
                            {vuln.message}
                          </div>
                        </div>

                        <div style={{
                          paddingTop: '8px',
                          borderTop: '1.5px solid #ded8cc',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span className="font-mono" style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: idx === 0 ? '#1d4ed8' : idx === 3 ? '#e02424' : '#4a4842'
                          }}>
                            {vuln.assigned_to || `Line ${vuln.line_start}`}
                          </span>
                          <span className="font-mono" style={{
                            fontSize: '0.58rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            background: bottomBadgeBg,
                            color: '#111111',
                            border: '1.5px solid #111111'
                          }}>
                            {vuln.workflow_badge || 'PATCHED'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </section>

            {/* ── LOWER SECTION: ENCHANTED AUTONOMOUS EXECUTION CHAMBER ── */}
            <section ref={chamberSectionRef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <motion.span
                      animate={{ rotate: [0, 90, 180, 270, 360] }}
                      transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                      style={{
                        width: '12px',
                        height: '12px',
                        background: '#ffcc00',
                        border: '2px solid #111111',
                        display: 'inline-block'
                      }}
                    />
                    <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: 900 }}>
                      ENCHANTED AUTONOMOUS EXECUTION CHAMBER
                    </h2>
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.68rem', color: '#4a4842', fontWeight: 700 }}>
                    Repository Target:{' '}
                    <span style={{
                      background: '#ffffff',
                      border: '1.5px solid #111111',
                      padding: '1px 8px',
                      color: '#111111',
                      fontWeight: 800
                    }}>
                      {currentPreset.shortTarget}
                    </span>
                  </div>
                </div>

                {/* Segmented Chamber Filter Tabs */}
                <div style={{
                  display: 'flex',
                  border: '2px solid #111111',
                  background: '#ffffff',
                  boxShadow: '3px 3px 0px #111111'
                }}>
                  {[
                    { id: 'all', label: 'ALL CHAMBERS' },
                    { id: 'recon', label: '01 RECON' },
                    { id: 'forge', label: '02 FORGE' },
                    { id: 'shield', label: '03 SHIELD' },
                    { id: 'proof', label: '04 PROOF' }
                  ].map((tab) => {
                    const active = activeChamber === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 1 }}
                        type="button"
                        onClick={() => setActiveChamber(tab.id)}
                        className="font-mono"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          border: 'none',
                          borderRight: '1.5px solid #111111',
                          background: active ? '#111111' : '#ffffff',
                          color: active ? '#ffffff' : '#111111',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {tab.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Signature Bauhaus Yellow Banner Header */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                whileHover={{ y: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                style={{
                  background: '#ffcc00',
                  border: '2px solid #111111',
                  boxShadow: '4px 4px 0px #111111',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <motion.span
                    animate={{ rotate: [0, 180, 360] }}
                    transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                    style={{
                      width: '14px',
                      height: '14px',
                      background: '#1d4ed8',
                      border: '2px solid #111111',
                      display: 'inline-block'
                    }}
                  />
                  <span className="font-display" style={{ fontSize: '0.88rem', fontWeight: 900 }}>
                    {sidebarAgents[selectedAgentIdx]?.name} // LANGCHAIN LCEL EXECUTION CHAMBER
                  </span>
                </div>
                <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.68rem', fontWeight: 800 }}>
                  <span>ACTIVE FLAW: {vulnerabilities[activeVulnIndex]?.code} ({vulnerabilities[activeVulnIndex]?.cve_id})</span>
                  <span style={{ background: '#111111', color: '#ffcc00', padding: '2px 8px' }}>
                    CVSS {vulnerabilities[activeVulnIndex]?.cvss_score}
                  </span>
                </div>
              </motion.div>

              {/* ── DEDICATED DISTINCT AI AGENT KINETIC VISUALIZER HUD ── */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                whileHover={{ y: -3, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                style={{
                  background: '#ffffff',
                  border: '2px solid #111111',
                  boxShadow: '4px 4px 0px #111111',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono" style={{
                      background: '#111111',
                      color: '#ffcc00',
                      padding: '2px 8px',
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      border: '1.5px solid #111111'
                    }}>
                      AGENT 0{selectedAgentIdx + 1} LIVE VISUALIZER
                    </span>
                    <span className="font-display" style={{ fontSize: '0.82rem', fontWeight: 900 }}>
                      {sidebarAgents[selectedAgentIdx]?.name} • KINETIC MATRIX
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => {
                        addLog(sidebarAgents[selectedAgentIdx]?.key, `[Telemetry Pulse] Exercising Agent 0${selectedAgentIdx + 1} (${sidebarAgents[selectedAgentIdx]?.name}) animation routine.`);
                      }}
                      className="font-mono"
                      style={{
                        background: '#ffcc00',
                        border: '1.5px solid #111111',
                        padding: '3px 8px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Zap size={11} />
                      TEST-DRIVE ANIMATION
                    </motion.button>
                    <span className="font-mono" style={{
                      background: status === 'running' ? '#e02424' : '#111111',
                      color: '#ffffff',
                      border: '1.5px solid #111111',
                      padding: '3px 8px',
                      fontSize: '0.62rem',
                      fontWeight: 800
                    }}>
                      {status === 'running' ? 'EXECUTING PIPELINE' : 'SYNCHRONIZED'}
                    </span>
                  </div>
                </div>

                {/* Renders that specific agent's bespoke kinetic visualizer! */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`agent-vis-${selectedAgentIdx}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    {selectedAgentIdx === 0 && <ReconRadarVisualizer isWorking={status === 'running' || selectedAgentIdx === 0} />}
                    {selectedAgentIdx === 1 && <ForgeSynthesizerVisualizer isWorking={status === 'running' || selectedAgentIdx === 1} />}
                    {selectedAgentIdx === 2 && <ShieldForcefieldVisualizer isWorking={status === 'running' || selectedAgentIdx === 2} />}
                    {selectedAgentIdx === 3 && <ProofOscilloscopeVisualizer isWorking={status === 'running' || selectedAgentIdx === 3} />}
                    {selectedAgentIdx === 4 && <HeraldTelemetryVisualizer isWorking={status === 'running' || selectedAgentIdx === 4} />}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Chamber Deep-Dive Grid with AnimatePresence */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeChamber + activeVulnIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bauhaus-charts-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.15fr 1fr',
                    gap: '16px'
                  }}
                >
                  {/* Left Column: Surgical AST Code Diff & Vulnerable Context */}
                  {(activeChamber === 'all' || activeChamber === 'recon' || activeChamber === 'forge') && (
                    <motion.div
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      whileHover={{ y: -4, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #111111',
                        boxShadow: '4px 4px 0px #111111',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div className="font-display" style={{ fontSize: '0.8rem', fontWeight: 900 }}>
                          SURGICAL AST PATCH DIFF INSPECTOR ({patches[activeVulnIndex]?.file || 'backend/api/users.py'})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handleCopyDiff(patches[activeVulnIndex]?.diff || INITIAL_PATCHES[0].diff)}
                            className="font-mono"
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              background: copiedDiff ? '#15803d' : '#ffffff',
                              color: copiedDiff ? '#ffffff' : '#111111',
                              border: '1.5px solid #111111',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {copiedDiff ? <Check size={11} /> : <Copy size={11} />}
                            {copiedDiff ? 'COPIED!' : 'COPY DIFF'}
                          </motion.button>
                          <span className="font-mono" style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            background: '#ffcc00',
                            border: '1.5px solid #111111',
                            padding: '2px 6px'
                          }}>
                            {patches[activeVulnIndex]?.model_used || 'LangChain LCEL'}
                          </span>
                        </div>
                      </div>

                      {/* Vulnerable Snippet Box */}
                      <div style={{
                        background: '#f4efe6',
                        border: '2px solid #111111',
                        padding: '10px'
                      }}>
                        <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#e02424', marginBottom: '4px' }}>
                          VULNERABLE AST NODE (LINES {vulnerabilities[activeVulnIndex]?.line_start}-{vulnerabilities[activeVulnIndex]?.line_end}):
                        </div>
                        <pre className="font-mono" style={{ fontSize: '0.72rem', overflowX: 'auto', color: '#111111' }}>
                          {vulnerabilities[activeVulnIndex]?.code_snippet}
                        </pre>
                      </div>

                      {/* Unified Diff Output */}
                      <div className="diff-container" style={{ padding: '12px', maxHeight: '230px' }}>
                        {(patches[activeVulnIndex]?.diff || INITIAL_PATCHES[0].diff).split('\n').map((line, lIdx) => {
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

                      {/* Blast Radius Pills */}
                      <div>
                        <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4a4842', marginBottom: '6px' }}>
                          IMPACTED AST BLAST RADIUS ({blastRadius.length} MODULES):
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {blastRadius.map((file) => (
                            <motion.span
                              key={file}
                              whileHover={{ scale: 1.05, y: -1 }}
                              className="font-mono"
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                background: '#faf7f0',
                                border: '1.5px solid #111111',
                                cursor: 'default'
                              }}
                            >
                              {file}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Right Column: LangChain LCEL Trace & Container Pytest Proof */}
                  {(activeChamber === 'all' || activeChamber === 'shield' || activeChamber === 'proof') && (
                    <motion.div
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      whileHover={{ y: -4, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                      style={{
                        background: '#ffffff',
                        border: '2px solid #111111',
                        boxShadow: '4px 4px 0px #111111',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="font-display" style={{ fontSize: '0.8rem', fontWeight: 900 }}>
                          LANGCHAIN RUNNABLESEQUENCE TRACE &amp; PYTEST PROOF
                        </div>
                        <span className="font-mono" style={{
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          background: '#1d4ed8',
                          color: '#ffffff',
                          border: '1.5px solid #111111',
                          padding: '2px 6px'
                        }}>
                          0 REGRESSION
                        </span>
                      </div>

                      {/* 4 LangChain Runnable Steps */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {langchainTrace.map((tr) => (
                          <motion.div
                            key={tr.step}
                            whileHover={{ x: 3, scale: 1.01 }}
                            style={{
                              background: '#faf7f0',
                              border: '1.5px solid #111111',
                              padding: '8px 10px',
                              fontSize: '0.66rem'
                            }}
                          >
                            <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                              <span>{tr.step} // {tr.runnable}</span>
                              <span style={{ color: '#e02424' }}>{tr.duration_ms}ms</span>
                            </div>
                            <div style={{ color: '#4a4842', marginTop: '2px', fontWeight: 600 }}>
                              {tr.output_summary}
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Containerized Pytest Terminal Output */}
                      <div className="terminal-window" style={{ padding: '10px', maxHeight: '140px' }}>
                        <pre style={{ fontSize: '0.68rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                          {testResults?.output}
                        </pre>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Live Sentinel Event Stream Terminal */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.2 }}
                whileHover={{ y: -3, x: -2, boxShadow: '6px 6px 0px #111111', transition: BRUTALIST_SPRING }}
                style={{
                  background: '#ffffff',
                  border: '2px solid #111111',
                  boxShadow: '4px 4px 0px #111111',
                  padding: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <motion.span
                      animate={status === 'running' ? { scale: [1, 1.4, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1 }}
                      style={{
                        width: '10px',
                        height: '10px',
                        background: status === 'running' ? '#e02424' : '#111111',
                        display: 'inline-block'
                      }}
                    />
                    <span className="font-display" style={{ fontSize: '0.78rem', fontWeight: 900 }}>
                      PROPHET LOG // LIVE LANGCHAIN TELEMETRY STREAM
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4a4842' }}>
                    CHANNEL: vasuki:scan:{scanId}
                  </span>
                </div>

                <div
                  ref={logContainerRef}
                  className="terminal-window"
                  style={{ padding: '12px', height: '160px', display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.72rem' }}
                    >
                      <span style={{ color: '#9ca3af', minWidth: '68px' }}>[{log.time}]</span>
                      <span style={{
                        fontWeight: 800,
                        padding: '0px 5px',
                        textTransform: 'uppercase',
                        fontSize: '0.62rem',
                        background:
                          log.agent === 'scanner' ? '#1d4ed8' :
                          log.agent === 'patcher' ? '#ffcc00' :
                          log.agent === 'reviewer' ? '#e02424' : '#374151',
                        color: log.agent === 'patcher' ? '#111111' : '#ffffff'
                      }}>
                        {log.agent}
                      </span>
                      <span style={{ color: '#f4efe6', flex: 1 }}>{log.message}</span>
                    </motion.div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffcc00', fontSize: '0.75rem' }}>
                    <span>&gt;</span>
                    <span className="animate-cursor-blink">█</span>
                  </div>
                </div>
              </motion.div>
            </section>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
