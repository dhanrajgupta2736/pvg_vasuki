# VASUKI Autonomous Security Patch Applied
# VASUKI Autonomous Security Patch Applied
import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Terminal, GitPullRequest, Activity, Bug, CheckCircle2,
  AlertTriangle, RefreshCw, Cpu, ExternalLink, Zap, Layers,
  ChevronRight, ArrowRight, Play, Check, X, FileCode, Search,
  Server, Lock, Globe, Sparkles, Pause, RotateCcw, Eye, Target
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import confetti from 'canvas-confetti';

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

// Presets for instant 1-click hackathon judging demos
const DEMO_PRESETS = [
  {
    name: 'PVG Vasuki Live Repo',
    url: 'https://github.com/dhanrajgupta2736/pvg_vasuki',
    branch: 'main',
    type: 'Self Repository'
  },
  {
    name: 'PyVulnerableApp (SQLi + Auth Bypass)',
    url: 'https://github.com/vulnerable-apps/python-sqli-demo',
    branch: 'main',
    type: 'Python / Flask'
  },
  {
    name: 'InsecureNodeAPI (XSS + Path Traversal)',
    url: 'https://github.com/vulnerable-apps/node-express-idor',
    branch: 'main',
    type: 'Node.js / Express'
  }
];

// ─── Chart Colors ───
const CHART_COLORS = ['#E63946', '#2D5BFF', '#FFD60A', '#2D936C', '#FF8C00'];
const SEVERITY_COLORS = { CRITICAL: '#E63946', HIGH: '#FF8C00', MEDIUM: '#FFD60A', LOW: '#2D936C' };

export default function App() {
  const [repoUrl, setRepoUrl] = useState(DEMO_PRESETS[0].url);
  const [branch, setBranch] = useState('main');
  const [scanId, setScanId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('sanctorum');
  const [activeVulnIndex, setActiveVulnIndex] = useState(0);
  const [speed, setSpeed] = useState(3);
  const [cycleCount, setCycleCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [agents, setAgents] = useState({
    scanner: { state: 'idle', label: 'RECON', sub: 'Semgrep SAST + NVD', role: 'Seeker' },
    patcher: { state: 'idle', label: 'FORGE', sub: 'LLM AST Patching', role: 'Spell Coder' },
    reviewer: { state: 'idle', label: 'SHIELD', sub: 'Anti-Hallucination', role: 'Reviewer' },
    tester: { state: 'idle', label: 'PROOF', sub: 'Container Sandbox', role: 'Deployer' }
  });

  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [patches, setPatches] = useState([]);
  const [reviewNotes, setReviewNotes] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [blastRadius, setBlastRadius] = useState([]);
  const [prUrl, setPrUrl] = useState('');
  const [prNumber, setPrNumber] = useState(0);
  const [logs, setLogs] = useState([]);

  const logContainerRef = useRef(null);
  const wsRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (agent, message, level = 'info') => {
    setLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        agent: agent || 'system',
        message,
        level
      }
    ]);
  };

  // Connect WebSocket when scanId is set
  useEffect(() => {
    if (!scanId) return;

    const ws = new WebSocket(`${WS_BASE}/ws/scan/${scanId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      addLog('system', `📡 Connected to VASUKI real-time telemetry channel: ${scanId}`, 'info');
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        const { agent, message, level, data } = event;
        addLog(agent, message, level);

        if (agent === 'scanner') {
          setAgents(a => ({ ...a, scanner: { ...a.scanner, state: 'running' } }));
        } else if (agent === 'patcher') {
          setAgents(a => ({
            ...a,
            scanner: { ...a.scanner, state: 'done' },
            patcher: { ...a.patcher, state: 'running' }
          }));
        } else if (agent === 'reviewer') {
          setAgents(a => ({
            ...a,
            patcher: { ...a.patcher, state: 'done' },
            reviewer: { ...a.reviewer, state: 'running' }
          }));
        } else if (agent === 'tester') {
          setAgents(a => ({
            ...a,
            reviewer: { ...a.reviewer, state: 'done' },
            tester: { ...a.tester, state: 'running' }
          }));
        }

        if (data && data.status === 'completed') {
          setAgents({
            scanner: { state: 'done', label: 'RECON', sub: 'Scanned 100%', role: 'Seeker' },
            patcher: { state: 'done', label: 'FORGE', sub: 'Patched 100%', role: 'Spell Coder' },
            reviewer: { state: 'done', label: 'SHIELD', sub: 'Approved', role: 'Reviewer' },
            tester: { state: 'done', label: 'PROOF', sub: 'Verified', role: 'Deployer' }
          });
          setStatus('completed');
          fetchScanDetails(scanId);
          triggerConfetti();
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    };

    ws.onerror = () => {
      addLog('system', 'WebSocket connection note: streaming falling back to polling.', 'warning');
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
        if (data.vulnerabilities) setVulnerabilities(data.vulnerabilities);
        if (data.patches) setPatches(data.patches);
        if (data.review_notes) setReviewNotes(data.review_notes);
        if (data.test_results) setTestResults(data.test_results);
        if (data.confidence_score) setConfidenceScore(data.confidence_score);
        if (data.blast_radius) setBlastRadius(data.blast_radius);
        if (data.pr_url) setPrUrl(data.pr_url);
        if (data.pr_number) setPrNumber(data.pr_number);
      }
    } catch (err) {
      console.error('Fetch details failed:', err);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (_) {}
  };

  // Launch live scan
  const handleStartScan = async () => {
    setStatus('running');
    setLogs([]);
    setVulnerabilities([]);
    setPatches([]);
    setReviewNotes(null);
    setTestResults(null);
    setConfidenceScore(null);
    setBlastRadius([]);
    setPrUrl('');
    setCycleCount(c => c + 1);

    setAgents({
      scanner: { state: 'running', label: 'RECON', sub: 'Scanning codebase...', role: 'Seeker' },
      patcher: { state: 'idle', label: 'FORGE', sub: 'Awaiting vulnerabilities', role: 'Spell Coder' },
      reviewer: { state: 'idle', label: 'SHIELD', sub: 'Awaiting patches', role: 'Reviewer' },
      tester: { state: 'idle', label: 'PROOF', sub: 'Awaiting container validation', role: 'Deployer' }
    });

    addLog('system', `🚀 Dispatching Autonomous VASUKI Pipeline for ${repoUrl}`, 'info');

    try {
      const res = await fetch(`${API_BASE}/api/analysis/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, branch })
      });
      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      const data = await res.json();
      setScanId(data.scan_id);
      addLog('orchestrator', `Job registered with Scan ID: ${data.scan_id}`, 'info');
    } catch (err) {
      addLog('system', `Live scan API offline. Engaging Simulation Mode...`, 'warning');
      simulateFullDemo();
    }
  };

  // Guaranteed Hackathon Interactive Simulation
  const simulateFullDemo = async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const mockId = 'demo-'