import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Star, Lock, GitFork, ArrowRight, ChevronDown, LogOut, Loader2, GitBranch, Code2, ExternalLink, ShieldCheck, KeyRound } from 'lucide-react'

export const GithubIcon = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', Java: '#b07219',
  Go: '#00ADD8', Rust: '#dea584', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Dockerfile: '#384d54',
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`
}

export default function GitHubConnect({ apiEndpoint, onSelectRepo, onClose, onStatusChange }) {
  const [token, setToken] = useState(() => localStorage.getItem('vasuki_gh_token') || '')
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState(null)
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)
  const [oauthConfig, setOauthConfig] = useState({ client_id: '', configured: false })
  const [showPatFallback, setShowPatFallback] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [langFilter, setLangFilter] = useState('all')
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [branches, setBranches] = useState([])
  const [branchLoading, setBranchLoading] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('')
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)

  // Fetch OAuth config from backend
  useEffect(() => {
    let alive = true
    async function loadConfig() {
      try {
        const resp = await fetch(`${apiEndpoint}/api/github/oauth/config`)
        if (resp.ok) {
          const cfg = await resp.json()
          if (alive) setOauthConfig(cfg)
        }
      } catch {
        // Fallback to empty if endpoint not reachable
      }
    }
    loadConfig()
    return () => { alive = false }
  }, [apiEndpoint])

  // Auto connect if existing token found
  useEffect(() => {
    if (token && !connected) tryConnect(token)
  }, [])

  async function tryConnect(tok) {
    setLoading(true); setError('')
    try {
      const resp = await fetch(`${apiEndpoint}/api/github/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok }),
      })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.detail || `Auth failed (${resp.status})`)
      }
      const data = await resp.json()
      setUser(data.user)
      setRepos(data.repos)
      setConnected(true)
      localStorage.setItem('vasuki_gh_token', tok)
      onStatusChange?.(true)
    } catch (e) {
      setError(e.message)
      localStorage.removeItem('vasuki_gh_token')
      onStatusChange?.(false)
    } finally {
      setLoading(false)
    }
  }

  async function exchangeCode(code, redirectUri) {
    setLoading(true); setError('')
    try {
      const resp = await fetch(`${apiEndpoint}/api/github/oauth/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      })
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.detail || `OAuth exchange failed (${resp.status})`)
      }
      const data = await resp.json()
      if (data.token) {
        localStorage.setItem('vasuki_gh_token', data.token)
        setToken(data.token)
        await tryConnect(data.token)
      } else {
        throw new Error('No access token returned by OAuth exchange')
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAuthorize() {
    setAuthorizing(true)
    setError('')
    try {
      const clientId = oauthConfig.client_id || import.meta.env.VITE_GITHUB_CLIENT_ID || ''
      if (!clientId) {
        setShowPatFallback(true)
        throw new Error(
          'GitHub OAuth App is not configured on the backend yet. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env, or use the Personal Access Token option below.'
        )
      }

      const redirectUri = window.location.origin + '/'
      const state = Math.random().toString(36).slice(2)
      sessionStorage.setItem('vasuki_gh_oauth_state', state)

      const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=repo,read:user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

      // Attempt OAuth popup window
      const width = 600, height = 720
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2
      const popup = window.open(
        authUrl,
        'vasuki_gh_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
      )

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup was blocked by browser, fallback to full page redirect
        window.location.href = authUrl
        return
      }

      // Listen for message from popup
      let timer = null
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.type === 'VASUKI_GH_OAUTH_TOKEN' && event.data.token) {
          window.removeEventListener('message', handleMessage)
          if (timer) clearInterval(timer)
          setToken(event.data.token)
          await tryConnect(event.data.token)
          setAuthorizing(false)
        } else if (event.data?.type === 'VASUKI_GH_OAUTH_CODE' && event.data.code) {
          window.removeEventListener('message', handleMessage)
          if (timer) clearInterval(timer)
          await exchangeCode(event.data.code, redirectUri)
          setAuthorizing(false)
        } else if (event.data?.type === 'VASUKI_GH_OAUTH_ERROR') {
          window.removeEventListener('message', handleMessage)
          if (timer) clearInterval(timer)
          setError(event.data.error || 'Authorization failed')
          setAuthorizing(false)
        }
      }
      window.addEventListener('message', handleMessage)

      timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          window.removeEventListener('message', handleMessage)
          setAuthorizing(false)
        }
      }, 1000)

    } catch (e) {
      setError(e.message)
      setAuthorizing(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const resp = await fetch(`${apiEndpoint}/api/github/repos?page=${page + 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (resp.ok) {
        const data = await resp.json()
        if (data.repos.length) {
          setRepos(prev => [...prev, ...data.repos])
          setPage(p => p + 1)
        }
      }
    } catch { /* ignore */ } finally { setLoadingMore(false) }
  }

  async function selectRepo(repo) {
    setSelectedRepo(repo)
    setSelectedBranch(repo.default_branch)
    setBranchLoading(true)
    try {
      const [owner, name] = repo.full_name.split('/')
      const resp = await fetch(`${apiEndpoint}/api/github/branches?owner=${owner}&repo=${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (resp.ok) {
        const data = await resp.json()
        setBranches(data.branches)
      }
    } catch { /* ignore */ } finally { setBranchLoading(false) }
  }

  function confirmScan() {
    if (selectedRepo) {
      onSelectRepo(selectedRepo.html_url, selectedBranch)
      onClose()
    }
  }

  function disconnect() {
    localStorage.removeItem('vasuki_gh_token')
    setToken(''); setUser(null); setRepos([]); setConnected(false); setSelectedRepo(null)
    onStatusChange?.(false)
  }

  const languages = [...new Set(repos.map(r => r.language).filter(Boolean))].sort()
  const filtered = repos.filter(r => {
    if (langFilter !== 'all' && r.language !== langFilter) return false
    if (search && !r.full_name.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <motion.div className="gh-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="gh-modal" initial={{ y: 40, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 30, opacity: 0 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="gh-header">
          <div className="gh-header-left">
            <GithubIcon size={22} />
            <span>{connected ? `Connected as ${user?.login}` : 'Authorize GitHub'}</span>
          </div>
          <div className="gh-header-right">
            {connected && <button className="gh-disconnect" onClick={disconnect}><LogOut size={14} /> Disconnect</button>}
            <button className="gh-close" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
          </div>
        </div>

        {/* Not connected — OAuth Authorize UI */}
        {!connected && (
          <div className="gh-connect-form">
            <div className="gh-connect-icon"><GithubIcon size={46} /></div>
            <div className="gh-badge-pill">GITHUB OAUTH 2.0</div>
            <h3>Authorize GitHub</h3>
            <p className="gh-auth-desc">
              Grant VASUKI access to browse and scan your repositories. We use isolated Docker sandboxes to compile, test, and generate verified draft pull requests.
            </p>

            <button
              className="brutal-button yellow gh-auth-btn"
              onClick={handleAuthorize}
              disabled={loading || authorizing}
            >
              {authorizing || loading ? <Loader2 className="spin" size={20} /> : <GithubIcon size={20} />}
              <span>{authorizing ? 'Connecting to GitHub…' : loading ? 'Authenticating…' : 'Authorize with GitHub'}</span>
              <ArrowRight size={18} />
            </button>

            {error && <div className="gh-error">{error}</div>}

            <div className="gh-oauth-badges">
              <span><ShieldCheck size={13} style={{ verticalAlign: -2 }} /> OAuth Authorization</span>
              <span>● Public & Private Repos</span>
              <span>● No Secrets Exposed</span>
            </div>

            {/* Optional PAT fallback accordion */}
            <div className="gh-pat-accordion">
              <button
                type="button"
                className="gh-pat-toggle"
                onClick={() => setShowPatFallback(!showPatFallback)}
              >
                <KeyRound size={13} />
                <span>{showPatFallback ? 'Hide manual Personal Access Token option' : 'Or connect with Personal Access Token'}</span>
              </button>

              {showPatFallback && (
                <div className="gh-pat-content">
                  <p>
                    Enter a token with <code>repo</code> scope to connect directly without OAuth:<br />
                    <a href="https://github.com/settings/tokens/new?description=VASUKI&scopes=repo" target="_blank" rel="noreferrer">
                      Generate a token on GitHub ↗
                    </a>
                  </p>
                  <div className="gh-token-row">
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      autoFocus
                    />
                    <button className="brutal-button yellow" onClick={() => tryConnect(token)} disabled={loading || !token.trim()}>
                      {loading ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
                      Connect
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="gh-token-note">
              <Lock size={13} />
              <span>Token is stored locally in your browser only. Never sent to any third party.</span>
            </div>
          </div>
        )}

        {/* Connected — repo browser */}
        {connected && !selectedRepo && (
          <div className="gh-repo-browser">
            {/* User card */}
            <div className="gh-user-card">
              <img src={user?.avatar_url} alt="" className="gh-avatar" />
              <div>
                <strong>{user?.name}</strong>
                <span>@{user?.login} · {user?.public_repos} public · {user?.total_private_repos} private</span>
              </div>
            </div>

            {/* Search & filter bar */}
            <div className="gh-search-bar">
              <div className="gh-search-input">
                <Search size={16} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search repositories..." />
              </div>
              <div className="gh-lang-filter">
                <button className={langFilter === 'all' ? 'active' : ''} onClick={() => setLangFilter('all')}>All</button>
                {languages.slice(0, 6).map(lang => (
                  <button key={lang} className={langFilter === lang ? 'active' : ''} onClick={() => setLangFilter(lang)}>
                    <span className="lang-dot" style={{ background: LANG_COLORS[lang] || '#888' }} />{lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Repo list */}
            <div className="gh-repo-list">
              {filtered.length === 0 && <div className="gh-empty">No repositories match your filter.</div>}
              {filtered.map(r => (
                <button className="gh-repo-card" key={r.full_name} onClick={() => selectRepo(r)}>
                  <div className="gh-repo-main">
                    <div className="gh-repo-name-row">
                      {r.private ? <Lock size={13} /> : <Code2 size={13} />}
                      <strong>{r.full_name}</strong>
                      {r.fork && <span className="gh-fork-badge"><GitFork size={10} /> Fork</span>}
                    </div>
                    {r.description && <p className="gh-repo-desc">{r.description}</p>}
                    <div className="gh-repo-meta">
                      {r.language && <span className="gh-lang"><span className="lang-dot" style={{ background: LANG_COLORS[r.language] || '#888' }} />{r.language}</span>}
                      {r.stargazers_count > 0 && <span><Star size={11} /> {r.stargazers_count}</span>}
                      <span>{timeAgo(r.pushed_at)}</span>
                    </div>
                  </div>
                  <ArrowRight size={18} className="gh-repo-arrow" />
                </button>
              ))}
              {repos.length >= 30 * page && (
                <button className="gh-load-more" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <Loader2 className="spin" size={16} /> : <ChevronDown size={16} />}
                  Load more repositories
                </button>
              )}
            </div>
          </div>
        )}

        {/* Selected repo — branch picker & confirm */}
        {connected && selectedRepo && (
          <div className="gh-confirm-panel">
            <button className="gh-back" onClick={() => { setSelectedRepo(null); setBranches([]) }}>
              ← Back to repositories
            </button>
            <div className="gh-selected-card">
              <div className="gh-selected-icon"><Code2 size={32} /></div>
              <div>
                <h3>{selectedRepo.full_name}</h3>
                {selectedRepo.description && <p>{selectedRepo.description}</p>}
                <div className="gh-repo-meta">
                  {selectedRepo.language && <span className="gh-lang"><span className="lang-dot" style={{ background: LANG_COLORS[selectedRepo.language] || '#888' }} />{selectedRepo.language}</span>}
                  <a href={selectedRepo.html_url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> View on GitHub</a>
                </div>
              </div>
            </div>

            <div className="gh-branch-section">
              <label><GitBranch size={14} /> Select branch</label>
              {branchLoading ? (
                <div className="gh-branch-loading"><Loader2 className="spin" size={16} /> Loading branches...</div>
              ) : (
                <div className="gh-branch-list">
                  {branches.map(b => (
                    <button
                      key={b.name}
                      className={`gh-branch-btn ${selectedBranch === b.name ? 'selected' : ''}`}
                      onClick={() => setSelectedBranch(b.name)}
                    >
                      <GitBranch size={13} />
                      {b.name}
                      {b.name === selectedRepo.default_branch && <span className="gh-default-badge">default</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="brutal-button yellow gh-scan-btn" onClick={confirmScan}>
              <ArrowRight size={20} />
              Scan {selectedRepo.full_name.split('/')[1]} on {selectedBranch}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
