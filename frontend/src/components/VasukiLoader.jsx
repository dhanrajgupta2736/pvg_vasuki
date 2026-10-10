import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VasukiLogo from './VasukiLogo.jsx'

export default function VasukiLoader({ onFinish, duration = 1800 }) {
  const [progress, setProgress] = useState(0)
  const [statusIdx, setStatusIdx] = useState(0)

  const steps = [
    'INITIALIZING AST SYNTAX & TAINT ENGINE...',
    'CONNECTING ORACLE OCI GENAI COLLECTIVE...',
    'CALIBRATING RECON, FORGE, SHIELD & PROOF...',
    'VASUKI SENTINEL ONLINE — READY'
  ]

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, Math.round((elapsed / duration) * 100))
      setProgress(pct)

      const sIdx = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length))
      setStatusIdx(sIdx)

      if (pct >= 100) {
        clearInterval(interval)
        setTimeout(() => {
          if (onFinish) onFinish()
        }, 250)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [duration, onFinish])

  return (
    <motion.div
      className="vasuki-splash-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: 'easeInOut' }}
    >
      {/* Background Cybernetic Grid */}
      <div className="splash-grid-bg" />

      {/* Centerpiece Container */}
      <div className="splash-center">
        {/* Animated Coiled Radar Rings around Emblem */}
        <div className="splash-pulse-rings">
          <motion.div
            className="pulse-ring ring-1"
            animate={{ rotate: 360, scale: [0.95, 1.05, 0.95] }}
            transition={{ rotate: { duration: 8, repeat: Infinity, ease: 'linear' }, scale: { duration: 2.5, repeat: Infinity } }}
          />
          <motion.div
            className="pulse-ring ring-2"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Coiled Serpent Logo with Pop Animation */}
        <motion.div
          className="splash-logo-wrap"
          initial={{ scale: 0.7, opacity: 0, y: 15 }}
          animate={{ scale: [0.7, 1.08, 1], opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <VasukiLogo size={96} showImage={true} />
          {/* Glowing laser scan bar passing across logo */}
          <motion.div
            className="logo-scanner-bar"
            animate={{ y: [-50, 60] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
          />
        </motion.div>

        {/* Title & Tagline */}
        <motion.div
          className="splash-meta"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <h1 className="splash-title">VASUKI</h1>
          <span className="splash-badge">AUTONOMOUS MULTI-AGENT SECURITY SENTINEL</span>
        </motion.div>

        {/* Dynamic Status Ticker */}
        <div className="splash-status-box">
          <div className="status-indicator">
            <span className="blinking-dot" />
            <span className="status-text">{steps[statusIdx]}</span>
          </div>

          {/* Brutalist Progress Bar */}
          <div className="splash-progress-track">
            <motion.div
              className="splash-progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="splash-progress-num">
            <span>CALIBRATION</span>
            <b>{progress}%</b>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
