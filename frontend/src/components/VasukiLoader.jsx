import { useEffect } from 'react'
import { motion } from 'framer-motion'
import VasukiLogo from './VasukiLogo.jsx'

export default function VasukiLoader({ onFinish, duration = 750 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onFinish) onFinish()
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, onFinish])

  return (
    <motion.div
      className="vasuki-splash-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={onFinish}
    >
      <div className="splash-grid-bg" />
      <div className="splash-center">
        {/* Quick Radiant Shockwave */}
        <motion.div
          className="quick-pulse-ring"
          initial={{ scale: 0.4, opacity: 0.9 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />

        {/* Punchy Logo Spring Pop */}
        <motion.div
          className="splash-logo-wrap quick-logo-wrap"
          initial={{ scale: 0.45, opacity: 0, rotate: -8 }}
          animate={{ scale: [0.45, 1.14, 1], opacity: 1, rotate: [-8, 2, 0] }}
          transition={{ duration: 0.45, ease: [0.175, 0.885, 0.32, 1.275] }}
        >
          <VasukiLogo size={84} showImage={true} />
          {/* Laser Flash Sweep */}
          <motion.div
            className="quick-scanner-sweep"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: [ -80, 0, 80 ], opacity: [ 0, 1, 0 ] }}
            transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.1 }}
          />
        </motion.div>

        {/* Snappy Minimalist Title */}
        <motion.div
          className="splash-meta"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
        >
          <h1 className="splash-title">VASUKI</h1>
          <div className="quick-tag">
            <span className="blinking-dot" />
            <span>SENTINEL ONLINE</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
