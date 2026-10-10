import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, AlertCircle, Shield, Sparkles, Terminal, Cpu, Database } from 'lucide-react'

export default function CodeRabbitCompareModal({ isOpen, onClose }) {
  if (!isOpen) return null

  const rows = [
    {
      feature: 'Core Architectural Role',
      coderabbit: 'Passive PR Comment Bot (wakes up only after a human opens a PR)',
      vasuki: 'Autonomous End-to-End Security Sentinel (finds, patches, proves, and opens PR autonomously)',
      vasukiAdvantage: true
    },
    {
      feature: 'Execution & Sandboxing',
      coderabbit: 'ZERO execution. Suggests code blindly without compiling or running',
      vasuki: 'Isolated Docker Sandbox & sanitized process runners with strict network isolation',
      vasukiAdvantage: true
    },
    {
      feature: 'Test Regression Verification',
      coderabbit: 'None. Cannot detect if a suggested patch breaks existing unit/integration tests',
      vasuki: 'Empirical Pre- vs Post-Patch test execution with Hard Gate: PR blocked if tests regress',
      vasukiAdvantage: true
    },
    {
      feature: 'Vulnerability Detection Scope',
      coderabbit: 'General code style, nits, and readability on line-level PR diffs',
      vasuki: 'Full-Repo SAST (Semgrep + AST), SCA Dependency CVEs (pip-audit), and OWASP Top 10 remediation',
      vasukiAdvantage: true
    },
    {
      feature: 'Self-Healing Repair Loop',
      coderabbit: 'Single-shot comment. No repair cycle if code suggestion has flaws',
      vasuki: 'Multi-round feedback loop: FORGE ↔ SHIELD ↔ PROOF until tests & reviews pass',
      vasukiAdvantage: true
    },
    {
      feature: 'Developer Burden',
      coderabbit: 'Creates MORE work: developer must manually review 20+ comments and apply changes',
      vasuki: 'Autonomous resolution: developer only reviews the final verified Draft PR with test proof',
      vasukiAdvantage: true
    },
    {
      feature: 'Data Privacy & Enterprise Air-Gap',
      coderabbit: 'Proprietary source code must be sent to third-party cloud SaaS',
      vasuki: 'Self-hostable, air-gapped on-premise, or private Oracle Cloud Infrastructure (OCI GenAI)',
      vasukiAdvantage: true
    },
    {
      feature: 'LangChain & Multi-Agent Intelligence',
      coderabbit: 'Proprietary monolithic prompt wrapper',
      vasuki: 'LangChain Core (PromptTemplates, OutputParsers, LCEL) + 5 distinct specialized agents',
      vasukiAdvantage: true
    }
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="compare-modal panel"
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="section-label compare-header">
            <div className="header-title">
              <Shield size={20} />
              <b>HOW VASUKI DIFFERS FROM CODERABBIT</b>
            </div>
            <button className="icon-button" aria-label="Close comparison" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="compare-body">
            <div className="compare-intro">
              <div className="intro-card problem-alignment">
                <strong>Alignment with Hackathon Problem Statement:</strong>
                <p>
                  The problem statement demands <i>autonomous end-to-end vulnerability discovery, safe patch generation, and empirical verification</i>. 
                  CodeRabbit is a passive PR code review commenter; <b>VASUKI is an autonomous security engineer</b> that takes a repo, fixes real CVEs/CWEs, tests them in Docker, and delivers proof-backed PRs.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Capability / Dimension</th>
                    <th className="th-cr">CodeRabbit</th>
                    <th className="th-vasuki">VASUKI (Our Platform)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="feature-name">
                        <b>{row.feature}</b>
                      </td>
                      <td className="cr-cell">
                        <span className="cr-tag"><AlertCircle size={13} /></span>
                        {row.coderabbit}
                      </td>
                      <td className="vasuki-cell">
                        <span className="vasuki-tag"><Check size={13} /></span>
                        {row.vasuki}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="limitations-fixed-box">
              <h4>TOP 3 CODERABBIT LIMITATIONS FIXED BY VASUKI:</h4>
              <div className="limitations-grid">
                <div className="lim-card">
                  <b>1. Hallucinated, Broken Suggestions</b>
                  <p>CodeRabbit doesn't execute code. Developers often get broken syntax or invalid imports. <b>VASUKI executes tests in Docker sandboxes and blocks any failing patch.</b></p>
                </div>
                <div className="lim-card">
                  <b>2. Manual Labor Fatigue</b>
                  <p>CodeRabbit posts dozens of comments requiring manual developer edits. <b>VASUKI autonomously writes, commits, and packages verified PRs.</b></p>
                </div>
                <div className="lim-card">
                  <b>3. Security Depth Blindspots</b>
                  <p>CodeRabbit focuses on code style and nits. <b>VASUKI tracks AST taint flow, Semgrep SAST rules, and pip-audit SCA CVEs with mathematical test proof.</b></p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
