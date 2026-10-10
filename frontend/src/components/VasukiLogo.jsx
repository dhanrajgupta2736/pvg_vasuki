import React from 'react'

export function VasukiLogoSvg({ size = 36, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VASUKI Cyber-Serpent Emblem"
    >
      {/* Outer Hex-Shield Contour */}
      <polygon
        points="50,4 92,26 92,74 50,96 8,74 8,26"
        fill="#171717"
        stroke="#171717"
        strokeWidth="3"
      />
      {/* Accent Inner Border */}
      <polygon
        points="50,8 88,28 88,72 50,92 12,72 12,28"
        fill="#1f2421"
        stroke="#ffdd59"
        strokeWidth="2"
      />
      {/* Cobra Hood Lateral Flaps */}
      <path
        d="M20,38 Q32,22 50,18 Q68,22 80,38 Q74,60 50,70 Q26,60 20,38 Z"
        fill="#121816"
        stroke="#3da85e"
        strokeWidth="2.5"
      />
      {/* Crown / Naga Crest (Gold) */}
      <path
        d="M40,16 L50,8 L60,16 L56,24 L44,24 Z"
        fill="#ffdd59"
        stroke="#171717"
        strokeWidth="1.5"
      />
      {/* Coiled Serpent Body Facets */}
      <path
        d="M30,42 L50,28 L70,42 L64,62 L50,72 L36,62 Z"
        fill="#18231c"
        stroke="#ffdd59"
        strokeWidth="2"
      />
      {/* Glowing Emerald Cyber Eyes */}
      <polygon points="38,36 44,38 42,42 36,40" fill="#00ff88" filter="drop-shadow(0 0 3px #00ff88)" />
      <polygon points="62,36 56,38 58,42 64,40" fill="#00ff88" filter="drop-shadow(0 0 3px #00ff88)" />
      {/* Snout & Fangs (Geometric Amber / Cyan) */}
      <polygon points="50,38 46,48 54,48" fill="#ffdd59" />
      <path d="M47,48 L46,55 M53,48 L54,55" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      {/* Interlocking "V" Crest at base */}
      <path
        d="M24,54 L50,84 L76,54 L68,54 L50,74 L32,54 Z"
        fill="#ffdd59"
        stroke="#171717"
        strokeWidth="2"
      />
    </svg>
  )
}

export default function VasukiLogo({ size = 44, showImage = true, className = '' }) {
  if (showImage) {
    return (
      <div
        className={`vasuki-logo-emblem ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src="/vasuki-logo.jpg"
          alt="VASUKI Logo"
          className="vasuki-logo-img"
          onError={(e) => {
            // fallback to SVG if image fails to render
            e.currentTarget.style.display = 'none'
            if (e.currentTarget.nextSibling) {
              e.currentTarget.nextSibling.style.display = 'block'
            }
          }}
        />
        <div style={{ display: 'none' }}>
          <VasukiLogoSvg size={size} />
        </div>
      </div>
    )
  }

  return (
    <div className={`vasuki-logo-emblem ${className}`} style={{ width: size, height: size }}>
      <VasukiLogoSvg size={size} />
    </div>
  )
}
