import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownToLine, ArrowRight, Check, ChevronDown, ExternalLink, GitBranch, GitFork as Github, History, LoaderCircle, Play, Radar, ShieldCheck, SquareTerminal, TestTubes, Wrench, X, Zap } from 'lucide-react'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const DEMO = 'https://github.com/dhanrajgupta2736/vasuki-security-lab'
const finished = new Set(['completed', 'failed', 'blocked'])
const stages = [
  { key: 'scanner', name: 'RECON', role: 'Scanner', text: 'Find security flaws', icon: Radar, color: '#2358e7' },
  { key: 'patcher', name: 'FORGE', role: 'Coder', text: 'Write targeted fixes', icon: Wrench, color: '#ec5843' },
  { key: 'reviewer', name: 'SHIELD', role: 'Reviewer', text: 'Review the final source', icon: ShieldCheck, color: '#e4b900' },
  { key: 'tester', name: 'PROOF', role: 'Tester', text: 'Prove no regressions', icon: TestTubes, color: '#269166' },
]
async function request(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`)
  }
  return response.json()
}
function Badge({ status = 'idle' }) {
  return <span className={`badge ${status}`}><i />{status.replaceAll('_', ' ')}</span>
}
function Geometry({ active }) {
  return <div className={`geometry ${active ? 'working' : ''}`} aria-hidden="true">
    <div className="geo-grid" />
    <motion.div className="geo-circle" animate={{ rotate: active ? 360 : 90 }} transition={{ duration: active ? 10 : 3, repeat: active ? Infinity : 0, ease: 'linear' }} />
    <motion.div className="geo-square" animate={{ rotate: [0, 90, 180, 270, 360] }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} />
    <div className="geo-cross">+</div><span className="geo-caption">SCAN → PATCH → PROVE</span>
  </div>
}
function Tests({ evidence }) {
  const before = evidence.original_tests
  const after = evidence.patched_tests
  if (!before) return <Empty icon={TestTubes} text="The baseline runs before any source changes." />
  const previous = new Map((before.cases || []).map(c => [c.id, c]))
  const current = new Map((after?.cases || []).map(c => [c.id, c]))
  const cases = [...new Set([...previous.keys(), ...current.keys()])]
  return <>
    <div className="test-summary">
      <div><span>VULNERABLE BASELINE</span><strong>{before.passed}<small> / {before.total} passing</small></strong><p>{before.failed} failed · {before.errors} errors</p></div>
      <ArrowRight size={24} />
      <div className={after?.success ? 'success-text' : ''}><span>PATCHED RESULT</span><strong>{after ? after.passed : '—'}<small>{after ? ` / ${after.total} passing` : ' awaiting execution'}</small></strong><p>{after ? `${after.failed} failed · ${after.errors} errors` : 'Recorded after the review and test cycle'}</p></div>
    </div>
    <div className="proof-strip"><span>Runner: <b>{after?.runner || before.runner}</b></span><span>Regressions: <b>{after ? evidence.regressions?.length ?? '—' : '—'}</b></span><span>Missing tests: <b>{after ? evidence.missing_tests?.length ?? '—' : '—'}</b></span></div>
    <div className="build-evidence">{[['Baseline build', before], ['Patched build', after]].map(([label, result]) => <div key={label}><span>{label}</span><b className={result?.build?.success ? 'success-text' : ''}>{result?.build ? result.build.success ? 'Passed' : 'Failed' : result ? 'Not recorded' : 'Awaiting execution'}</b><small>{result?.build?.kind?.replaceAll('-', ' ') || 'Build evidence appears after execution'}</small>{result?.build && <details className="output"><summary>Build output <ChevronDown size={14} /></summary><pre>{result.build.output || 'No output'}</pre></details>}</div>)}</div>
    <div className="proof-strip"><span>Test code and configuration: <b>{evidence.test_inputs_unchanged === true ? 'Unchanged' : evidence.test_inputs_unchanged === false ? 'Changed — blocked' : 'Not yet verified'}</b></span><span>Execution fingerprints: <b>{after?.test_inputs ? before.test_inputs?.unchanged && after.test_inputs.unchanged ? 'Preserved' : 'Changed — blocked' : 'Not yet recorded'}</b></span></div>
    {(before.error || after?.error) && <div className="error-box">{after?.error || before.error}</div>}
    <div className="table-scroll"><table><thead><tr><th>Executed test</th><th>Kind</th><th>Before</th><th>After</th></tr></thead><tbody>{cases.map(id => <tr key={id}>
      <td className="test-name">{(current.get(id) || previous.get(id)).name}</td><td>{(current.get(id) || previous.get(id)).security ? <span className="security-label">Security</span> : 'Functional'}</td><td><Badge status={previous.get(id)?.status || 'new'} /></td><td><Badge status={current.get(id)?.status || (after ? 'missing' : 'pending')} /></td>
    </tr>)}</tbody></table></div>
    {after && <details className="output"><summary>Test runner output <ChevronDown size={15} /></summary><pre>{after.output || after.error}</pre></details>}
  </>
}
function Empty({ icon: Icon = SquareTerminal, text }) {
  return <div className="empty"><Icon size={30} strokeWidth={1.5} /><p>{text}</p></div>
}
function Diff({ patch }) {
  return <details className="patch" open><summary><span><GitBranch size={17} />{patch.file}</span><span className="patch-engine">{patch.model_used}<ChevronDown size={16} /></span></summary><pre>{(patch.final_diff || patch.diff || '').split('\n').map((line, i) => <div key={i} className={line.startsWith('+') && !line.startsWith('+++') ? 'addition' : line.startsWith('-') && !line.startsWith('---') ? 'deletion' : line.startsWith('@@') ? 'hunk' : ''}>{line || ' '}</div>)}</pre></details>
}
export default function LiveDashboard() {
  const [health, setHealth] = useState(null)
  const [connectionError, setConnectionError] = useState('')
  const [history, setHistory] = useState([])
  const [scanId, setScanId] = useState(() => localStorage.getItem('vasuki.scan') || '')
  const [scan, setScan] = useState(null)
  const [events, setEvents] = useState([])
  const [repo, setRepo] = useState(DEMO)
  const [branch, setBranch] = useState('')
  const [projectPath, setProjectPath] = useState('')
  const [publish, setPublish] = useState(true)
  const [viaN8n, setViaN8n] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('findings')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [tick, setTick] = useState(Date.now())
  const [clockOffset, setClockOffset] = useState(0)
  const logEnd = useRef(null)
  const active = scan && !finished.has(scan.status)
  useEffect(() => {
    let alive = true
    async function refresh() {
      try {
        const [h, jobs] = await Promise.all([request('/api/health'), request('/api/analysis/')])
        if (alive) { setHealth(h); setHistory(jobs); setConnectionError('') }
      } catch (e) { if (alive) { setConnectionError(e.message); setHealth(null) } }
    }
    refresh()
    const interval = setInterval(refresh, 10000)
    return () => { alive = false; clearInterval(interval) }
  }, [])
  useEffect(() => {
    setScan(null); setEvents([]); setError('')
    if (!scanId) return
    localStorage.setItem('vasuki.scan', scanId)
    let alive = true
    let socket
    const merge = incoming => setEvents(old => {
      const map = new Map(old.map(e => [e.event_id, e]))
      incoming.filter(e => e.event_id).forEach(e => map.set(e.event_id, e))
      return [...map.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    })
    async function refresh() {
      try {
        const [job, log] = await Promise.all([request(`/api/analysis/${scanId}`), request(`/api/analysis/${scanId}/events`)])
        if (!alive) return
        setScan(job); merge(log)
        if (job.server_time) setClockOffset(Date.parse(job.server_time) - Date.now())
        if (finished.has(job.status)) clearInterval(interval)
      } catch (e) { if (alive) setError(e.message) }
    }
    const interval = setInterval(refresh, 1800)
    refresh()
    try {
      const url = new URL(API || location.origin)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.pathname = `/ws/scan/${scanId}`
      socket = new WebSocket(url)
      socket.onmessage = message => { if (alive) { try { merge([JSON.parse(message.data)]) } catch { /* polling recovers */ } } }
    } catch { /* HTTP polling remains available */ }
    return () => { alive = false; clearInterval(interval); socket?.close() }
  }, [scanId])
  useEffect(() => { logEnd.current?.parentElement.scrollTo({ top: logEnd.current.parentElement.scrollHeight }) }, [events.length])
  useEffect(() => { const timer = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(timer) }, [])
  async function start(bundled = false) {
    setSubmitting(true); setError('')
    try {
      const result = await request(bundled ? '/api/analysis/demo' : viaN8n && health?.n8n_configured ? '/api/analysis/orchestrated' : '/api/analysis/', { method: 'POST', body: bundled ? undefined : JSON.stringify({ repo_url: repo, branch: branch.trim() || null, project_path: projectPath.trim(), publish_pr: publish }) })
      setScanId(result.scan_id); setTab('findings')
      setHistory(await request('/api/analysis/'))
    } catch (e) { setError(e.message) } finally { setSubmitting(false) }
  }
  const findings = scan?.vulnerabilities || []
  const patches = scan?.patches || []
  const evidence = scan?.test_results || {}
  const notes = scan?.review_notes || {}
  const progress = events.reduce((n, e) => e.data?.progress ?? n, scan?.status === 'pending' ? 1 : 0)
  const duration = scan ? Math.max(0, Math.round(((scan.completed_at ? Date.parse(scan.completed_at + 'Z') : tick + clockOffset) - Date.parse(scan.created_at + 'Z')) / 1000)) : 0
  const seconds = `${Math.floor(duration / 60)}m ${String(duration % 60).padStart(2, '0')}s`
  const done = scan?.status === 'completed' && evidence.regression_free === true
  return <div className="app-shell">
    <aside className="rail"><a href="#" className="brand-mark" aria-label="VASUKI home">V<span /></a><div className="rail-main"><button className="rail-button selected" aria-label="Pipeline dashboard" onClick={() => document.getElementById('pipeline').scrollIntoView({ behavior: 'smooth' })}><Zap /></button><button className="rail-button" aria-label="Scan history" onClick={() => setHistoryOpen(true)}><History /></button><a className="rail-button" href={DEMO} target="_blank" rel="noreferrer" aria-label="Demo repository"><Github /></a></div><div className="rail-bottom"><span className="rail-dot" />V.01</div></aside>
    <div className="workspace">
      <header className="topbar"><a href="#" className="wordmark">VASUKI<span>Autonomous security sentinel</span></a><div className="top-actions"><span className={`connection ${health ? 'online' : ''}`}><i />{health ? 'Backend connected' : 'Backend offline'}</span><button className="button subtle" onClick={() => setHistoryOpen(true)}><History size={16} />Run history</button></div></header>
      <main>
        <section className="hero"><div><div className="eyebrow"><span /> FOUR AGENTS. ONE MISSION.</div><h1>Find it. Fix it.<br /><span>Prove it.</span></h1><p>From vulnerable code to a verified pull request.<br />Security fixes with evidence you can inspect.</p><div className="hero-tags"><span><ShieldCheck size={15} />Source review</span><span><TestTubes size={15} />Regression gates</span><span><Github size={15} />Draft pull requests</span></div></div><Geometry active={active} /></section>
        <section className="intake panel"><div className="section-label"><span>01 / DEPLOY THE COLLECTIVE</span><span className="mono">GitHub → verified patch</span></div><form onSubmit={e => { e.preventDefault(); start() }}><label className="repo-label" htmlFor="repository">Repository URL</label><div className="repo-row"><div className="repo-input"><Github size={21} /><input id="repository" type="url" required value={repo} onChange={e => setRepo(e.target.value)} placeholder="https://github.com/owner/repository" /></div><button className="button primary" disabled={submitting || active}>{submitting ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}Start pipeline</button></div><div className="intake-options"><label>Branch<input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Auto-detect default" /></label><label>Project directory<input value={projectPath} onChange={e => setProjectPath(e.target.value)} placeholder="Repository root" /></label><label className="checkbox"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />Publish a draft PR after validation</label>{health?.n8n_configured && <label className="checkbox"><input type="checkbox" checked={viaN8n} onChange={e => setViaN8n(e.target.checked)} />Route through n8n</label>}</div></form><div className="intake-footer"><span><i className={`tiny-dot ${health?.docker_available ? 'green' : ''}`} />{health?.docker_available ? 'Docker sandbox ready' : 'Isolated runner ready'}</span><button className="text-button" onClick={() => start(true)} disabled={submitting || active || !health}><Play size={14} />Run bundled security lab <ArrowRight size={14} /></button></div>{(error || connectionError) && <div className="error-box"><X size={16} />{error || `Cannot reach the backend: ${connectionError}`}</div>}</section>
        <section id="pipeline" className="pipeline-section"><div className="section-heading"><div><div className="eyebrow">02 / LIVE ORCHESTRATION</div><h2>The agent collective<span className="heading-dot">.</span></h2></div><div className="run-state">{scan && <><span className="mono">{scan.scan_id.slice(0, 8)} · {seconds}</span><Badge status={scan.status} /></>}{!scan && <Badge status="ready" />}</div></div>
          <div className="agent-track">{stages.map((s, i) => { const state = scan?.agents?.[s.key] || 'idle'; const Icon = s.icon; return <motion.article key={s.key} className={`agent-card ${state}`} style={{ '--agent-color': s.color }} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .09 }}><div className="agent-top"><span className="mono">0{i + 1} / {s.role.toUpperCase()}</span><Badge status={state} /></div><div className="agent-icon"><Icon size={27} strokeWidth={1.6} /></div><h3>{s.name}</h3><p>{s.text}</p><div className="agent-footer">{state === 'running' ? <><div className="signal-bars"><i /><i /><i /><i /></div> Working</> : state === 'done' ? <><Check size={15} /> Stage finished</> : state === 'error' ? <><X size={15} /> Needs attention</> : <><span className="waiting-dot" />Awaiting handoff</>}</div>{state === 'running' && <motion.div className="agent-sweep" animate={{ x: ['-100%', '400%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />}</motion.article> })}</div>
          {scan && <div className="progress-row"><div className="progress-track"><motion.div animate={{ width: `${progress}%` }} transition={{ duration: .6 }} /></div><span className="mono">{progress}%</span></div>}
        </section>
        {scan?.error_message && <div className="outcome blocked"><ShieldCheck size={23} /><div><b>Publication gate stopped this run</b><p>{scan.error_message}</p></div></div>}
        <AnimatePresence>{done && <motion.div className="outcome verified" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}><div className="verified-icon"><Check /></div><div><b>Security fixes verified. Original behavior preserved.</b><p>{evidence.patched_tests?.passed} tests passed · {evidence.security_tests_count} security checks · {evidence.regressions?.length || 0} regressions · {evidence.patched_tests?.runner}</p></div>{scan.pr_url ? <a className="button dark" href={scan.pr_url} target="_blank" rel="noreferrer">View draft PR <ExternalLink size={16} /></a> : <a className="button dark" href={`${API}/api/reports/${scanId}/patch`} download>Download patch <ArrowDownToLine size={16} /></a>}</motion.div>}</AnimatePresence>
        <div className="metrics"><Metric label="SECURITY FINDINGS" value={scan ? findings.length : '—'} text={scan ? `${findings.filter(v => v.severity === 'CRITICAL').length} critical · ${findings.filter(v => v.severity === 'HIGH').length} high` : 'Detected by configured rules'} color="blue" /><Metric label="TARGETED PATCHES" value={scan ? patches.length : '—'} text={patches.length ? [...new Set(patches.map(p => p.model_used))].join(', ') : 'Generated from source context'} color="red" /><Metric label="REVIEWED FIXES" value={notes.summary ? `${notes.summary.approved}/${notes.summary.total ?? patches.length}` : '—'} text={notes.summary ? `${notes.remaining_findings?.length ?? 0} remaining findings` : 'Source checks repeated after edits'} color="yellow" /><Metric label="TESTS PASSING" value={evidence.patched_tests ? `${evidence.patched_tests.passed}/${evidence.patched_tests.total}` : '—'} text={evidence.patched_tests ? `${evidence.fixed_tests?.length || 0} failing security tests fixed` : 'Individual results, before and after'} color="green" /></div>
        <div className="results-grid"><section className="panel results"><div className="section-label"><span>03 / INSPECT THE EVIDENCE</span>{scan && <a href={`${API}/api/reports/${scanId}/full`} target="_blank" rel="noreferrer" className="text-button">Report <ArrowDownToLine size={14} /></a>}</div><div className="tabs">{[['findings', 'Findings', findings.length], ['patches', 'Patches', patches.length], ['tests', 'Tests', evidence.patched_tests?.total], ['review', 'Review', undefined]].map(([key, title, count]) => <button key={key} className={tab === key ? 'current' : ''} onClick={() => setTab(key)}>{title}{count != null && <span>{count}</span>}</button>)}</div><div className="tab-content"><AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
          {tab === 'findings' && (findings.length ? findings.map(v => <article className="finding" key={v.id}><div className="finding-heading"><span className={`severity ${v.severity.toLowerCase()}`}>{v.severity}</span><span className="mono">{v.cwe_id || v.cve_id || v.rule_id}</span></div><h4>{v.category.replaceAll('-', ' ')}</h4><p>{v.message}</p><div className="file-location"><GitBranch size={14} />{v.file}:{v.line_start}<span>{v.source}</span></div>{v.code_snippet && <pre className="snippet">{v.code_snippet}</pre>}</article>) : <Empty icon={Radar} text={scan && finished.has(scan.status) ? 'No findings returned by the configured analyzer.' : 'Source findings appear here as RECON completes.'} />)}
          {tab === 'patches' && (patches.length ? <><div className="evidence-actions"><a className="text-button" href={`${API}/api/reports/${scanId}/patch`} download>Download complete diff <ArrowDownToLine size={14} /></a></div>{patches.filter((p, i) => !p.final_diff || patches.findIndex(x => x.file === p.file) === i).map((p, i) => <Diff key={i} patch={p} />)}</> : <Empty icon={Wrench} text="FORGE changes only the affected source files." />)}
          {tab === 'tests' && <Tests evidence={evidence} />}
          {tab === 'review' && (notes.summary ? <><div className={`review-verdict ${notes.all_findings_resolved ? 'clear' : ''}`}><ShieldCheck size={25} /><div><b>{notes.all_findings_resolved ? 'Configured source findings resolved' : 'Security findings remain'}</b><p>{notes.summary.approved} approved · {notes.summary.rejected} rejected</p></div></div>{(notes.individual_reviews || []).map((r, i) => <div className="review-item" key={i}><Badge status={r.recommendation === 'approve' ? 'passed' : 'failed'} /><span>{r.file || r.patch_id || `Patch ${i + 1}`}</span><p>{r.reasoning || r.reason || r.notes || r.verdict}</p></div>)}<div className="verification-checks">{evidence.verification_checks && <><strong>{evidence.verification_score}/100 · executed validation checks</strong>{Object.entries(evidence.verification_checks).map(([name, passed]) => <div key={name}>{passed ? <Check size={14} /> : <X size={14} />}<span>{name.replaceAll("_", " ")}</span></div>)}</>}</div><p className="review-note">Review checks the final source with the same analysis rules and validates Python syntax. Passing tests provide separate behavioral evidence.</p>{!!notes.syntax_errors?.length && <pre className="snippet">{JSON.stringify(notes.syntax_errors, null, 2)}</pre>}</> : <Empty icon={ShieldCheck} text="SHIELD rechecks source findings before tests can proceed." />)}
        </motion.div></AnimatePresence></div></section>
        <section className="panel event-panel"><div className="section-label"><span><SquareTerminal size={16} /> AGENT EVENT STREAM</span><span className={`live-label ${active ? 'active' : ''}`}><i />{active ? 'LIVE' : 'LOG'}</span></div><div className="terminal"><div className="terminal-header"><i /><i /><i /><span>{scan ? `scan/${scan.scan_id.slice(0, 8)}` : 'Awaiting a run'}</span></div><div className="event-scroll">{events.length ? events.map(e => <div className={`event ${e.level}`} key={e.event_id}><span className="event-time">{new Date(e.timestamp).toLocaleTimeString('en-GB')}</span><span className={`event-agent ${e.agent}`}>{e.agent}</span><p>{e.message}</p></div>) : <div className="terminal-empty"><span className="cursor" />Waiting for the collective…<small>Events come from actual pipeline operations.</small></div>}<div ref={logEnd} /></div></div><div className="event-footer"><span>{events.length} recorded events</span>{scan?.completed_at && <a href={`${API}/api/reports/${scanId}/evidence`} className="text-button" download>Evidence <ArrowDownToLine size={13} /></a>}</div></section></div>
        {scan && <div className="run-details"><span><GitBranch size={14} />{scan.repo_url} {scan.branch && `· ${scan.branch}`}</span>{evidence.patch_sha && <span className="mono">commit {evidence.patch_sha.slice(0, 12)}</span>}</div>}
        <footer><span>VASUKI / BUILD WITH PROOF.</span><span>{health?.model || 'Model unavailable'} · {health?.scanner || 'Source analyzer'} · {health?.redis || 'Event bus'}</span></footer>
      </main>
    </div>
    <AnimatePresence>{historyOpen && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setHistoryOpen(false)}><motion.div className="history-modal panel" initial={{ x: 80 }} animate={{ x: 0 }} onClick={e => e.stopPropagation()}><div className="section-label"><span>RUN HISTORY</span><button className="icon-button" aria-label="Close history" onClick={() => setHistoryOpen(false)}><X /></button></div>{history.length ? history.map(job => <button className="history-entry" key={job.scan_id} onClick={() => { setScanId(job.scan_id); setHistoryOpen(false); if (job.repo_url.startsWith('https://')) { setRepo(job.repo_url); setBranch(job.branch || ''); setProjectPath(job.project_path || '') } }}><div><strong>{job.repo_url.split('/').slice(-2).join('/')}</strong><span>{job.scan_id.slice(0, 8)} · {job.branch || 'default branch'} · {new Date(job.created_at + 'Z').toLocaleString()}</span></div><Badge status={job.status} /><ArrowRight size={17} /></button>) : <Empty icon={History} text="Your first run will appear here." />}</motion.div></motion.div>}</AnimatePresence>
  </div>
}
export { Tests, Diff, request, Badge, Empty }
function Metric({ label, value, text, color }) {
  return <div className={`metric ${color}`}><span>{label}</span><motion.strong key={value} initial={{ opacity: .4, y: 6 }} animate={{ opacity: 1, y: 0 }}>{value}</motion.strong><p>{text}</p></div>
}
