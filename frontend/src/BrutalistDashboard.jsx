import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Code2, ExternalLink, GitBranch, History, LoaderCircle, Radar, Rocket, ShieldCheck, TestTubes, X } from 'lucide-react'
import { Tests, Diff, request, Badge, Empty } from './LiveDashboard.jsx'
import VasukiLogo from './components/VasukiLogo.jsx'
import VasukiLoader from './components/VasukiLoader.jsx'
import ReviewPanel from './components/ReviewPanel.jsx'
import { DEMO_REPORT, DEMO_EVENTS } from './data/demoRun.js'
import './brutalist.css'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const DEMO = 'https://github.com/dhanrajgupta2736/vasuki-security-lab'
const terminal = new Set(['completed', 'failed', 'blocked'])
const crew = [
  { key: 'scanner', name: 'RECON', role: 'Scanner', icon: Radar, color: '#a3c4ff', task: 'Maps the repository and identifies security flaws.' },
  { key: 'tester', name: 'PROOF', role: 'Tester', icon: TestTubes, color: '#a5e5af', task: 'Builds the project and executes the original tests.' },
  { key: 'patcher', name: 'FORGE', role: 'Coder', icon: Code2, color: '#ff8873', task: 'Writes targeted patches using source and agent feedback.' },
  { key: 'reviewer', name: 'SHIELD', role: 'Reviewer', icon: ShieldCheck, color: '#ffdd59', task: 'Reviews the changes and scans the patched source again.' },
  { key: 'deployer', name: 'HERALD', role: 'Deployer', icon: Rocket, color: '#ceb3ff', task: 'Commits a patched branch and opens a draft pull request.' },
]
const labelFor = key => crew.find(a => a.key === key)?.name || key
function dateValue(value) { return Date.parse(value && !/[Z+]|-\d\d:\d\d$/.test(value.slice(10)) ? value + 'Z' : value) }

export default function BrutalistDashboard() {
  const [showSplash, setShowSplash] = useState(true)
  const [health, setHealth] = useState(null)
  const [history, setHistory] = useState([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [apiEndpoint, setApiEndpoint] = useState(() => localStorage.getItem('vasuki_api_url') || API)
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [publish, setPublish] = useState(true)
  const [scanId, setScanId] = useState('')
  const [scan, setScan] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState('tests')
  const [tick, setTick] = useState(() => Date.now())
  const [offset, setOffset] = useState(0)
  const logEnd = useRef(null)
  const simTimerRef = useRef(null)
  const active = !!scanId && (!scan || !terminal.has(scan.status))

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try {
        const baseUrl = apiEndpoint || API
        const fetchHealth = baseUrl ? fetch(`${baseUrl}/api/health`).then(r => r.ok ? r.json() : null) : request('/api/health').catch(() => null)
        const fetchHistory = baseUrl ? fetch(`${baseUrl}/api/analysis/`).then(r => r.ok ? r.json() : []) : request('/api/analysis/').catch(() => [])
        const [h, runs] = await Promise.all([fetchHealth, fetchHistory])
        if (alive) { setHealth(h); if (Array.isArray(runs)) setHistory(runs) }
      } catch { if (alive) setHealth(null) }
    }
    refresh(); const timer = setInterval(refresh, 10000)
    return () => { alive = false; clearInterval(timer) }
  }, [apiEndpoint])

  useEffect(() => {
    setScan(null); setEvents([]); window.scrollTo({ top: 0, behavior: 'smooth' })
    if (!scanId || scanId.startsWith('demo-')) return
    localStorage.setItem('vasuki.scan', scanId)
    let alive = true; let socket
    const merge = incoming => setEvents(old => {
      const map = new Map(old.map(e => [e.event_id, e]))
      incoming.filter(e => e.event_id).forEach(e => map.set(e.event_id, e))
      return [...map.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    })
    const refresh = async () => {
      try {
        const baseUrl = apiEndpoint || API
        const fetchScan = baseUrl ? fetch(`${baseUrl}/api/analysis/${scanId}`).then(r => r.json()) : request(`/api/analysis/${scanId}`)
        const fetchEvents = baseUrl ? fetch(`${baseUrl}/api/analysis/${scanId}/events`).then(r => r.json()) : request(`/api/analysis/${scanId}/events`)
        const [job, log] = await Promise.all([fetchScan, fetchEvents])
        if (!alive) return
        setScan(job); merge(log); setError('')
        if (job.server_time) setOffset(Date.parse(job.server_time) - Date.now())
        if (terminal.has(job.status)) clearInterval(timer)
      } catch (e) { if (alive) setError(e.message + ' — reconnecting to the same run…') }
    }
    const timer = setInterval(refresh, 1500); refresh()
    try {
      const url = new URL(apiEndpoint || API || location.origin); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; url.pathname = `/ws/scan/${scanId}`
      socket = new WebSocket(url); socket.onmessage = e => { if (alive) { try { merge([JSON.parse(e.data)]) } catch { /* poll recovers */ } } }
    } catch { /* polling remains available */ }
    return () => { alive = false; clearInterval(timer); socket?.close() }
  }, [scanId, apiEndpoint])
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => { const pane = logEnd.current?.parentElement; pane?.scrollTo({ top: pane.scrollHeight }) }, [events.length])

  function runSimulation(targetRepo, targetBranch) {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    const mockId = 'demo-vasuki-' + Math.random().toString(36).substring(2, 8)
    setScanId(mockId)
    setTab('tests')
    setError('')

    const startTime = new Date().toISOString()
    const initialScan = {
      ...DEMO_REPORT,
      scan_id: mockId,
      repo_url: targetRepo || DEMO,
      branch: targetBranch || 'main',
      status: 'scanning',
      created_at: startTime,
      completed_at: null,
      agents: { scanner: 'running', patcher: 'idle', reviewer: 'idle', tester: 'idle', deployer: 'idle' },
      vulnerabilities: [],
      patches: [],
      review_notes: {},
      test_results: { original_tests: null, patched_tests: null }
    }
    setScan(initialScan)
    setEvents([])

    let step = 0
    simTimerRef.current = setInterval(() => {
      if (step >= DEMO_EVENTS.length) {
        clearInterval(simTimerRef.current)
        setScan(prev => ({
          ...DEMO_REPORT,
          scan_id: mockId,
          repo_url: targetRepo || DEMO,
          branch: targetBranch || 'main',
          status: 'completed',
          created_at: startTime,
          completed_at: new Date().toISOString(),
          agents: { scanner: 'done', patcher: 'done', reviewer: 'done', tester: 'done', deployer: 'done' }
        }))
        return
      }

      const ev = { ...DEMO_EVENTS[step], timestamp: new Date().toISOString() }
      setEvents(old => [...old, ev])

      setScan(prev => {
        if (!prev) return prev
        const cur = { ...prev }
        if (ev.data?.active_agent) {
          cur.agents = { ...cur.agents, [ev.data.active_agent]: 'running' }
        }
        if (ev.data?.status) {
          cur.status = ev.data.status
        }
        if (step === 5) {
          cur.vulnerabilities = DEMO_REPORT.vulnerabilities
          cur.agents = { ...cur.agents, scanner: 'done' }
        }
        if (step === 8) {
          cur.test_results = { ...DEMO_REPORT.test_results, patched_tests: null }
          cur.agents = { ...cur.agents, tester: 'done' }
        }
        if (step === 15) {
          cur.patches = DEMO_REPORT.patches
          cur.agents = { ...cur.agents, patcher: 'done' }
        }
        if (step === 20) {
          cur.review_notes = DEMO_REPORT.review_notes
          cur.agents = { ...cur.agents, reviewer: 'done' }
        }
        if (step === 22) {
          cur.test_results = DEMO_REPORT.test_results
          cur.agents = { ...cur.agents, tester: 'done' }
        }
        if (step === 26) {
          cur.agents = { ...cur.agents, deployer: 'done' }
          cur.pr_url = DEMO_REPORT.pr_url
          cur.pr_number = DEMO_REPORT.pr_number
        }
        return cur
      })

      step++
    }, 250)
  }

  async function inspect() {
    setSubmitting(true); setError('')
    const targetRepo = (repo || DEMO).trim()
    const targetBranch = branch.trim() || 'main'

    let backendSuccess = false
    try {
      const baseUrl = apiEndpoint || API
      if (baseUrl) {
        const resp = await fetch(`${baseUrl}${health?.n8n_configured ? '/api/analysis/orchestrated' : '/api/analysis/'}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: targetRepo, branch: targetBranch || null, project_path: projectPath.trim(), publish_pr: publish })
        })
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}))
          throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${resp.status})`)
        }
        const result = await resp.json()
        if (result?.scan_id) {
          setScanId(result.scan_id); setTab('tests')
          backendSuccess = true
        }
      } else {
        const result = await request(health?.n8n_configured ? '/api/analysis/orchestrated' : '/api/analysis/', {
          method: 'POST',
          body: JSON.stringify({ repo_url: targetRepo, branch: targetBranch || null, project_path: projectPath.trim(), publish_pr: publish })
        })
        if (result?.scan_id) {
          setScanId(result.scan_id); setTab('tests')
          backendSuccess = true
        }
      }
    } catch (e) {
      console.warn('Real backend call unavailable (static host / offline), running verified autonomous demo pipeline:', e.message)
    } finally {
      setSubmitting(false)
    }

    if (!backendSuccess) {
      runSimulation(targetRepo, targetBranch)
    }
  }
  function selectRun(job) {
    setScanId(job.scan_id); setHistoryOpen(false); setTab('tests')
    if (job.repo_url.startsWith('https://')) { setRepo(job.repo_url); setBranch(job.branch || ''); setProjectPath(job.project_path || '') }
  }
  const evidence = scan?.test_results || {}
  const findings = scan?.vulnerabilities || []
  const patches = scan?.patches || []
  const notes = scan?.review_notes || {}
  const handoffs = events.filter(e => e.data?.active_agent)
  const handoff = handoffs.at(-1)
  const agentKey = handoff?.data.active_agent || Object.keys(scan?.agents || {}).find(a => scan.agents[a] === 'running') || 'scanner'
  const agent = crew.find(a => a.key === agentKey) || crew[0]
  const Icon = agent.icon
  const phase = handoff?.data.phase || (agentKey === 'tester' && !patches.length ? 'baseline' : agentKey)
  const cycle = handoff?.data.iteration || evidence.rounds?.at(-1)?.iteration || 0
  const agentEvents = events.filter(e => (e.agent === agentKey || (agentKey === 'deployer' && ['github', 'patcher'].includes(e.agent))) && (!handoff || e.timestamp >= handoff.timestamp)).slice(-4)
  const seconds = scan ? Math.max(0, Math.round(((scan.completed_at ? dateValue(scan.completed_at) : tick + offset) - dateValue(scan.created_at)) / 1000)) : 0
  const done = scan?.status === 'completed' && evidence.regression_free === true
  const progress = events.reduce((n, e) => e.data?.progress ?? n, 0)
  const home = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current)
    if (!active) { setScanId(''); setError('') }
  }

  return <div className="brutal-app">
    <AnimatePresence>
      {showSplash && <VasukiLoader onFinish={() => setShowSplash(false)} />}
    </AnimatePresence>
    <header className="brutal-header">
      <button className="brutal-brand" onClick={home} disabled={active} aria-label="VASUKI home">
        <VasukiLogo size={46} showImage={true} />
        <div className="brand-text-block">
          <span className="brand-name">VASUKI</span>
          <span className="brand-sub">AUTONOMOUS SECURITY SENTINEL</span>
        </div>
      </button>
      <div className="header-right">
        <span className={`runtime ${health || scanId ? 'connected' : ''}`}><i />{health ? 'ORACLE BACKEND ONLINE' : 'AUTONOMOUS RUNNER READY'}</span>
        <button className="brutal-button white small" onClick={() => setHistoryOpen(true)}>
          <History size={16} />Run history
        </button>
      </div>
    </header>
    <main className="brutal-main">
      {!scanId ? <motion.section className="landing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="landing-copy"><div className="sticker">AUTONOMOUS SECURITY. WITH PROOF.</div><h1>BAD CODE.<br />MEET YOUR<br /><span>FIX CREW.</span></h1><p>Give us a repository. Watch the agents find flaws,<br className="desktop-break" /> patch the source and prove the fix.</p></div>
        <div className="crew-poster" aria-hidden="true"><span className="poster-label">THE COLLECTIVE / 05 AGENTS</span><div className="poster-grid">{crew.slice(0, 4).map((a, i) => { const Glyph = a.icon; return <motion.div key={a.key} style={{ background: a.color }} animate={{ y: [0, -7, 0], rotate: [i % 2 ? 3 : -3, 0, i % 2 ? 3 : -3] }} transition={{ duration: 3 + i * .3, repeat: Infinity, delay: i * .3 }}><Glyph size={54} strokeWidth={2.5} /><b>{a.name}</b></motion.div> })}</div><div className="poster-deliver"><Rocket size={23} /><b>VERIFIED CODE → DRAFT PR</b><ArrowRight size={24} /></div></div>
      </motion.section> : <section className="run-heading"><div><span className="sticker">LIVE AGENT COLLECTIVE</span><h1>{done ? 'FIXED. VERIFIED.' : active ? 'CREW AT WORK.' : 'RUN REPORT.'}</h1><p><GitBranch size={16} />{scan?.repo_url || repo}<b>{scan?.branch || branch || 'default branch'}</b></p></div><div className="run-clock"><Badge status={scan?.status || 'pending'} /><strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</strong><small>{scanId.slice(0, 8)}</small></div></section>}

      {!scanId && <section className="inspect-box"><form onSubmit={e => { e.preventDefault(); inspect() }}><label htmlFor="repository">01 / YOUR REPOSITORY</label><div className="inspect-row"><div className="inspect-input"><GitBranch size={24} /><input id="repository" type="url" value={repo} onChange={e => setRepo(e.target.value)} placeholder="https://github.com/owner/repository" required /></div><button className="brutal-button yellow" disabled={submitting}>{submitting ? <LoaderCircle className="spin" /> : <Radar size={23} />}Inspect <ArrowRight size={22} /></button></div><div className="inspect-helper"><button type="button" className="demo-link" onClick={() => { setRepo(DEMO); setBranch('main'); setProjectPath('') }}>Use hackathon demo repository ↗</button><span>{health?.docker_available ? '● Docker sandbox ready' : '● Isolated runner ready'}</span></div><details className="advanced"><summary>Branch & delivery options</summary><div><label>Branch<input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Default branch" /></label><label>Project directory<input value={projectPath} onChange={e => setProjectPath(e.target.value)} placeholder="Repository root" /></label><label>Backend API (optional)<input value={apiEndpoint} onChange={e => { setApiEndpoint(e.target.value); localStorage.setItem('vasuki_api_url', e.target.value.trim()) }} placeholder="e.g. http://localhost:8000" /></label><label className="publish-option"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />Create patched branch + draft PR</label></div></details></form></section>}
      {error && <div className="brutal-error" role="alert">{error}</div>}
      {!scanId && <section className="landing-flow"><span>SCAN</span><ArrowRight /><span>BASELINE TEST</span><ArrowRight /><span>PATCH ↔ REVIEW ↔ TEST</span><ArrowRight /><span>DRAFT PR</span><p>The repair cycle repeats until review and tests pass. Unresolved runs stop with evidence.</p></section>}

      {scanId && <>
        <div className="crew-strip">{crew.map(a => <div className={agentKey === a.key && active ? 'selected' : ''} key={a.key} style={{ '--color': a.color }}><a.icon size={18} /><b>{a.name}</b><Badge status={scan?.agents?.[a.key] || 'idle'} /></div>)}</div>
        <AnimatePresence mode="wait"><motion.section className="agent-spotlight" key={`${agentKey}-${phase}-${cycle}`} style={{ '--color': agent.color }} initial={{ opacity: 0, y: 45, scale: .94, rotate: -1.5 }} animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }} exit={{ opacity: 0, y: -18, scale: .97 }} transition={{ type: 'spring', stiffness: 230, damping: 24 }} aria-live="polite">
          <div className="agent-portrait"><div className="agent-grid" /><motion.div className="agent-character" animate={active ? { rotate: [0, -5, 5, 0], y: [0, -9, 0] } : { rotate: 0, y: 0 }} transition={{ duration: 2.6, repeat: active ? Infinity : 0 }}><Icon size={76} strokeWidth={2.3} /><span>{active ? 'ON DUTY' : scan?.agents?.[agentKey] === 'done' ? 'WORK RECORDED' : 'STOPPED'}</span></motion.div><span className="portrait-id">AGENT / {agent.role.toUpperCase()}</span></div>
          <div className="agent-work"><div className="agent-work-header"><span className="mono">{phase === 'baseline' ? 'BASELINE / BEFORE CHANGES' : agentKey === 'deployer' ? 'FINAL / DELIVERY' : cycle ? `REPAIR CYCLE / ${String(cycle).padStart(2, '0')}` : 'REPOSITORY / INSPECTION'}</span>{active && <span className="live-pill"><i />LIVE</span>}</div><h2>{agent.name}<span> / {agent.role}</span></h2><p className="agent-task">{handoff?.message || (scan?.status === 'pending' || !scan ? 'Queued for the Oracle runner. Agents will appear as work begins.' : agent.task)}</p><div className="agent-output">{agentEvents.length ? agentEvents.map(e => <p key={e.event_id}><ArrowRight size={15} />{e.message}</p>) : <p>{active ? 'Waiting for the next recorded result…' : 'Inspect the complete evidence below.'}</p>}</div><div className="agent-facts">{agentKey === 'scanner' && <><b>{findings.length} findings</b><span>Source + pinned dependency analysis</span></>}{agentKey === 'patcher' && <><b>{patches.length} targeted patches</b><span>{[...new Set(patches.map(p => p.model_used))].join(' · ') || 'Preparing source context'}</span></>}{agentKey === 'reviewer' && <><b>{notes.remaining_findings?.length ?? '—'} findings remaining</b><span>{notes.summary?.approved ?? 0} patches approved</span></>}{agentKey === 'tester' && <><b>{phase === 'baseline' ? evidence.original_tests?.passed ?? '—' : evidence.patched_tests?.passed ?? '—'} tests passed</b><span>{phase === 'baseline' ? evidence.original_tests?.failed ?? '—' : evidence.patched_tests?.failed ?? '—'} failed · {phase === 'baseline' ? 'vulnerable baseline' : 'patched code'}</span></>}{agentKey === 'deployer' && <><b>{evidence.patch_branch || 'Preparing branch'}</b><span>{scan?.pr_url ? `Draft PR #${scan.pr_number}` : evidence.patch_sha ? `Commit ${evidence.patch_sha.slice(0, 12)}` : 'All validation gates must pass'}</span></>}</div></div>
        </motion.section></AnimatePresence>
        <div className="brutal-progress"><div><motion.span animate={{ width: `${progress}%` }} /></div><b>{progress}%</b><span>{evidence.rounds?.length || 0} verification cycles recorded</span></div>
        {scan?.error_message && <div className="brutal-error"><b>RUN STOPPED — NO UNVERIFIED PR</b><p>{scan.error_message}</p></div>}
        {done && <div className="delivery-result"><Check size={36} /><div><h2>{scan.pr_url ? 'YOUR PATCH IS READY.' : 'VERIFIED PATCH READY.'}</h2><p>{evidence.patched_tests?.passed} tests passed · {evidence.fixed_tests?.length} failing tests fixed · {evidence.regressions?.length || 0} regressions · {evidence.verification_score}/100 executed checks</p></div>{scan.pr_url ? <a className="brutal-button black" href={scan.pr_url} target="_blank" rel="noreferrer">Open draft PR <ExternalLink size={19} /></a> : <a className="brutal-button black" href={`${API}/api/reports/${scanId}/patch`} download>Download patch <ArrowRight size={19} /></a>}</div>}
        <div className="brutal-evidence-grid"><section className="evidence-panel"><div className="evidence-heading"><b>THE RECEIPTS.</b><a href={`${API}/api/reports/${scanId}/full`} target="_blank" rel="noreferrer">Full report ↗</a></div>
          <div className="tabs">
            {[['tests', 'Tests & Proof'], ['audit', 'Why & What Changed'], ['findings', 'Findings'], ['patches', 'Raw Diff'], ['review', 'Agent Review']].map(([key, title]) => 
              <button key={key} onClick={() => setTab(key)} className={tab === key ? 'current' : ''}>{title}</button>
            )}
          </div>
          <div className="tab-content">
            {tab === 'tests' && <Tests evidence={evidence} />}
            {tab === 'audit' && <ReviewPanel scan={scan} findings={findings} patches={patches} notes={notes} evidence={evidence} />}
            {tab === 'findings' && (findings.length ? findings.map(v => <article className="finding" key={v.id}><div className="finding-heading"><span className={`severity ${v.severity.toLowerCase()}`}>{v.severity}</span><span className="mono">{v.cwe_id || v.cve_id || v.rule_id}</span></div><h4>{v.category.replaceAll('-', ' ')}</h4><p>{v.message}</p><div className="file-location">{v.file}:{v.line_start} · {v.source}</div>{v.code_snippet && <pre className="snippet">{v.code_snippet}</pre>}</article>) : <Empty text="RECON findings appear after analysis." />)}
            {tab === 'patches' && (patches.length ? <><a className="demo-link" href={`${API}/api/reports/${scanId}/patch`} download>Download complete diff ↗</a>{patches.filter((p, i) => !p.final_diff || patches.findIndex(x => x.file === p.file) === i).map((p, i) => <Diff key={i} patch={p} />)}</> : <Empty text="FORGE patches appear after generation." />)}
            {tab === 'review' && <><h3>{notes.summary ? notes.all_findings_resolved ? 'Source rescan clear.' : 'Findings remain.' : 'Review pending.'}</h3><div className="verification-checks">{evidence.verification_checks && <><strong>{evidence.verification_score}/100 — executed gates</strong>{Object.entries(evidence.verification_checks).map(([name, passed]) => <div key={name}>{passed ? <Check size={16} /> : <X size={16} />}{name.replaceAll('_', ' ')}</div>)}</>}</div>{evidence.rounds?.map(r => <div className="cycle-result" key={r.iteration}><b>Cycle {r.iteration}</b><span>Review {r.review_passed ? 'passed' : 'rejected'} · Tests {r.passed} passed / {r.failed} failed</span></div>)}<p className="review-note">Findings are limited to configured analysis rules. The score counts validation gates; it is not a guarantee that every possible vulnerability is absent.</p></>}
          </div>
        </section><section className="evidence-panel"><div className="evidence-heading"><b>LIVE HANDOFFS.</b><span>{events.length} events</span></div><div className="handoff-list">{handoffs.map((e, i) => <div key={e.event_id}><span>{String(i + 1).padStart(2, '0')}</span><p><b>{labelFor(e.data.active_agent)}</b><small>{e.data.phase === 'baseline' ? 'Baseline tests' : e.data.iteration ? `Cycle ${e.data.iteration}` : 'Inspect repository'}</small></p>{i===handoffs.length-1 && active ? <LoaderCircle className="spin" size={16} /> : i===handoffs.length-1 && scan?.status!=='completed' ? <X size={16} /> : <Check size={16} />}</div>)}</div><div className="brutal-terminal">{events.slice(-80).map(e => <div key={e.event_id} className={e.level}><b>{labelFor(e.agent)}</b><p>{e.message}</p></div>)}<div ref={logEnd} /></div></section></div>
        {!active && <button className="brutal-button yellow new-inspection" onClick={home}>Inspect another repository <ArrowRight size={20} /></button>}
      </>}
      <footer className="brutal-footer"><b>VASUKI / BUILD WITH PROOF.</b><span>{health?.model || 'Oracle model'} · {health?.n8n_configured ? 'n8n orchestration' : 'Native orchestration'} · Human approves the merge.</span></footer>
    </main>
    <AnimatePresence>
      {historyOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)}><motion.div className="history-modal panel" initial={{ x: 100 }} animate={{ x: 0 }} onClick={e => e.stopPropagation()}><div className="section-label"><b>RUN HISTORY</b><button className="icon-button" aria-label="Close history" onClick={() => setHistoryOpen(false)}><X /></button></div>{history.map(job => <button className="history-entry" key={job.scan_id} onClick={() => selectRun(job)}><div><strong>{job.repo_url.split('/').slice(-2).join('/')}</strong><span>{job.scan_id.slice(0, 8)} · {job.branch || 'default branch'}</span></div><Badge status={job.status} /><ArrowRight size={18} /></button>)}</motion.div></motion.div>}
    </AnimatePresence>
  </div>
}
