import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Zap, Sparkles, Activity, Play
} from 'lucide-react';
import confetti from 'canvas-confetti';

const BRUTALIST_SPRING = {
  type: 'spring',
  stiffness: 400,
  damping: 24,
  mass: 0.8
};

// ── CHARACTERISTIC AVATAR 01: RECON (The Cybernetic Sentinel Eye) ──
function ReconEyeCharacter({ isWorking, onAction }) {
  const [blink, setBlink] = useState(false);
  const [lookPos, setLookPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 180);
    }, 3200);
    return () => clearInterval(blinkInterval);
  }, []);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = Math.max(-14, Math.min(14, (e.clientX - centerX) / 6));
    const deltaY = Math.max(-10, Math.min(10, (e.clientY - centerY) / 6));
    setLookPos({ x: deltaX, y: deltaY });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLookPos({ x: 0, y: 0 })}
      onClick={onAction}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click Recon to ping sonar pulse"
    >
      {/* Floating Bobbing Sentinel Chassis */}
      <motion.div
        animate={{ y: [-6, 6, -6], rotate: [-1.5, 1.5, -1.5] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: '160px',
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Outer Rotating Cybernetic Armor Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: isWorking ? 6 : 16, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: '4px dashed #e02424',
            boxShadow: '0 0 20px rgba(224, 36, 36, 0.35)'
          }}
        />

        {/* Counter-Rotating Sensor Teeth */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: '124px',
            height: '124px',
            borderRadius: '50%',
            border: '2px dotted #ffcc00'
          }}
        />

        {/* Outer Eye Shell (Bauhaus White + Black Border) */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '4px solid #111111',
          boxShadow: '6px 6px 0px #111111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Sclera Bloodshot Radar Grids */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(224,36,36,0.15) 1px, transparent 1px)',
            backgroundSize: '12px 12px'
          }} />

          {/* Iris with Cyber Scanning Lines */}
          <motion.div
            animate={{
              x: lookPos.x,
              y: lookPos.y,
              scale: isWorking ? [1, 1.18, 0.95, 1] : 1
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #e02424 0%, #991b1b 75%, #111111 100%)',
              border: '3px solid #111111',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* Pupil (Dilation on Scan) */}
            <motion.div
              animate={isWorking ? { scale: [0.7, 1.3, 0.8] } : { scale: 1 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#111111',
                border: '1.5px solid #ffcc00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px #ffcc00'
              }}
            >
              {/* Central Laser Glint */}
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffffff' }} />
            </motion.div>

            {/* Crosshair Laser Lines */}
            <div style={{ position: 'absolute', width: '100%', height: '1.5px', background: 'rgba(255,204,0,0.6)' }} />
            <div style={{ position: 'absolute', height: '100%', width: '1.5px', background: 'rgba(255,204,0,0.6)' }} />
          </motion.div>

          {/* Eyelid (Blinking Animation) */}
          <motion.div
            initial={false}
            animate={{ height: blink ? '100%' : '0%' }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              background: '#111111',
              zIndex: 10
            }}
          />
          <motion.div
            initial={false}
            animate={{ height: blink ? '100%' : '0%' }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: '#111111',
              zIndex: 10
            }}
          />
        </div>

        {/* Emitted Laser Scan Cone */}
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3], scaleY: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            position: 'absolute',
            bottom: '-45px',
            width: '90px',
            height: '45px',
            background: 'linear-gradient(to bottom, rgba(224, 36, 36, 0.6), transparent)',
            clipPath: 'polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)',
            pointerEvents: 'none'
          }}
        />
      </motion.div>
    </div>
  );
}

// ── CHARACTERISTIC AVATAR 02: FORGE (The Molten Golem Blacksmith) ──
function ForgeGolemCharacter({ isWorking, onAction }) {
  const [hammering, setHammering] = useState(false);

  const handleClick = () => {
    setHammering(true);
    if (onAction) onAction();
    setTimeout(() => setHammering(false), 900);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click Forge to strike anvil"
    >
      {/* Blacksmith Golem Head & Furnace Chest */}
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: '150px',
          height: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Animated Flying Molten Sparks */}
        {(isWorking || hammering) && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 30, opacity: 1, scale: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 160,
                  y: -Math.random() * 110 - 20,
                  opacity: 0,
                  scale: 0.2
                }}
                transition={{ repeat: Infinity, duration: 0.6 + Math.random() * 0.4 }}
                style={{
                  position: 'absolute',
                  bottom: '50px',
                  left: '50%',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i % 2 === 0 ? '#ffcc00' : '#e02424',
                  boxShadow: '0 0 8px #ffcc00'
                }}
              />
            ))}
          </div>
        )}

        {/* Industrial Horns / Steam Exhaust Chimneys */}
        <div style={{ display: 'flex', gap: '50px', position: 'absolute', top: '10px' }}>
          <motion.div
            animate={{ y: [-3, 0, -3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              width: '14px',
              height: '24px',
              background: '#111111',
              border: '2px solid #ffcc00',
              borderRadius: '2px 2px 0 0'
            }}
          />
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              width: '14px',
              height: '24px',
              background: '#111111',
              border: '2px solid #ffcc00',
              borderRadius: '2px 2px 0 0'
            }}
          />
        </div>

        {/* Mechanical Visor & Helmet */}
        <div style={{
          width: '84px',
          height: '64px',
          background: '#ffcc00',
          border: '4px solid #111111',
          boxShadow: '5px 5px 0px #111111',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          position: 'relative'
        }}>
          {/* Slit Furnace Visor Eyes */}
          <div style={{
            width: '58px',
            height: '14px',
            background: '#111111',
            border: '2px solid #ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            overflow: 'hidden'
          }}>
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], width: isWorking ? ['14px', '22px', '14px'] : '16px' }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{
                height: '8px',
                background: '#e02424',
                boxShadow: '0 0 8px #e02424'
              }}
            />
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], width: isWorking ? ['14px', '22px', '14px'] : '16px' }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{
                height: '8px',
                background: '#e02424',
                boxShadow: '0 0 8px #e02424'
              }}
            />
          </div>

          {/* Grille Teeth */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {[1, 2, 3, 4].map(g => (
              <div key={g} style={{ width: '4px', height: '8px', background: '#111111' }} />
            ))}
          </div>
        </div>

        {/* Anvil Base with Pulsing Furnace Glow */}
        <div style={{
          width: '120px',
          height: '42px',
          background: '#23180f',
          border: '4px solid #111111',
          boxShadow: '5px 5px 0px #111111',
          marginTop: '-6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 3
        }}>
          {/* Molten Glow in Furnace Belly */}
          <motion.div
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
            style={{
              position: 'absolute',
              width: '80px',
              height: '24px',
              background: 'radial-gradient(circle, #ffcc00 0%, #e02424 80%, transparent 100%)',
              filter: 'blur(2px)'
            }}
          />
          <span className="font-mono" style={{
            fontSize: '0.62rem',
            fontWeight: 900,
            color: '#ffffff',
            zIndex: 2,
            textShadow: '0 0 6px #ffcc00'
          }}>
            ANVIL // LCEL
          </span>
        </div>

        {/* Hammer Strike Arm */}
        <motion.div
          animate={hammering || isWorking ? { rotate: [0, -45, 20, 0] } : { rotate: [-5, 5, -5] }}
          transition={{ repeat: hammering || isWorking ? Infinity : Infinity, duration: hammering || isWorking ? 0.45 : 3 }}
          style={{
            position: 'absolute',
            top: '25px',
            right: '-16px',
            width: '28px',
            height: '60px',
            transformOrigin: 'top center',
            zIndex: 6
          }}
        >
          {/* Hammer Handle */}
          <div style={{ width: '6px', height: '48px', background: '#78350f', border: '1.5px solid #111111', margin: '0 auto' }} />
          {/* Heavy Hammer Head */}
          <div style={{
            width: '32px',
            height: '20px',
            background: '#ffcc00',
            border: '3px solid #111111',
            boxShadow: '2px 2px 0px #111111',
            margin: '-6px auto 0'
          }} />
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── CHARACTERISTIC AVATAR 03: SHIELD (The Polyhedral Aegis Paladin) ──
function ShieldPaladinCharacter({ isWorking, onAction }) {
  const [blocking, setBlocking] = useState(false);

  const handleClick = () => {
    setBlocking(true);
    if (onAction) onAction();
    setTimeout(() => setBlocking(false), 1200);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click Shield to cast sound barrier"
    >
      {/* Floating Geometric Paladin with Kinetic Orbiting Barrier Crystals */}
      <motion.div
        animate={{ y: [-5, 5, -5], rotate: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: '150px',
          height: '150px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Kinetic Hexagonal Energy Barrier Rings */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: isWorking || blocking ? 4 : 12, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: '150px',
            height: '150px',
            border: '3px dashed #1d4ed8',
            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            boxShadow: '0 0 18px rgba(29, 78, 216, 0.4)'
          }}
        />

        {/* 4 Orbiting Hex Shields */}
        {[0, 90, 180, 270].map((deg) => (
          <motion.div
            key={deg}
            animate={{ rotate: deg + 360 }}
            transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
            style={{
              position: 'absolute',
              width: '140px',
              height: '140px',
              pointerEvents: 'none'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '50%',
              width: '16px',
              height: '16px',
              background: '#38bdf8',
              border: '2px solid #111111',
              boxShadow: '2px 2px 0px #111111'
            }} />
          </motion.div>
        ))}

        {/* Center Aegis Shield Crest Body */}
        <motion.div
          animate={blocking ? { scale: [1, 1.25, 1] } : { scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
          style={{
            width: '90px',
            height: '106px',
            background: '#1d4ed8',
            border: '4px solid #111111',
            boxShadow: '6px 6px 0px #111111',
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 5
          }}
        >
          {/* Golden Cross / Chevron Inlay */}
          <div style={{
            width: '14px',
            height: '70px',
            background: '#ffcc00',
            border: '2px solid #111111',
            position: 'absolute'
          }} />
          <div style={{
            width: '60px',
            height: '14px',
            background: '#ffcc00',
            border: '2px solid #111111',
            position: 'absolute',
            top: '28px'
          }} />

          {/* Glowing Guardian Eye Core */}
          <motion.div
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '2px solid #111111',
              zIndex: 6,
              boxShadow: '0 0 10px #ffffff'
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── CHARACTERISTIC AVATAR 04: PROOF (The CRT Oscilloscope Scientist Bot) ──
function ProofOscilloscopeCharacter({ isWorking, onAction }) {
  const [pulse, setPulse] = useState(false);

  const handleClick = () => {
    setPulse(true);
    if (onAction) onAction();
    setTimeout(() => setPulse(false), 1000);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click Proof to run CRT diagnostic"
    >
      {/* Steampunk / Cyberpunk CRT Oscilloscope Android */}
      <motion.div
        animate={{ y: [-4, 4, -4], rotate: [1, -1, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: '150px',
          height: '150px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Antenna / Probe with blinking green LED */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
            transition={{ repeat: Infinity, duration: 0.9 }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #111111',
              boxShadow: '0 0 10px #22c55e'
            }}
          />
          <div style={{ width: '4px', height: '14px', background: '#111111' }} />
        </div>

        {/* Vintage CRT Monitor Head */}
        <div style={{
          width: '110px',
          height: '84px',
          background: '#15803d',
          border: '4px solid #111111',
          boxShadow: '6px 6px 0px #111111',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          position: 'relative'
        }}>
          {/* CRT Screen Tube (Curved Dark Phosphor) */}
          <div style={{
            width: '100%',
            height: '100%',
            background: '#04150b',
            border: '2px solid #111111',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Scanlines */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(74, 222, 128, 0.15) 1px, transparent 1px)',
              backgroundSize: '100% 4px',
              pointerEvents: 'none'
            }} />

            {/* Glowing Oscilloscope Face (Wave Smile!) */}
            <svg viewBox="0 0 80 40" style={{ width: '80%', height: '80%' }}>
              <motion.path
                d={
                  isWorking || pulse
                    ? "M 5,20 Q 20,5 35,20 T 65,20 T 75,20"
                    : "M 10,20 Q 25,10 40,20 Q 55,30 70,20"
                }
                fill="none"
                stroke="#4ade80"
                strokeWidth="3.5"
                strokeLinecap="round"
                animate={{ pathLength: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
              {/* LED Eyes */}
              <circle cx="25" cy="12" r="3.5" fill="#4ade80" />
              <circle cx="55" cy="12" r="3.5" fill="#4ade80" />
            </svg>
          </div>
        </div>

        {/* Dial & Knob Controls Base */}
        <div style={{
          width: '90px',
          height: '24px',
          background: '#ffffff',
          border: '3px solid #111111',
          boxShadow: '4px 4px 0px #111111',
          marginTop: '-2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 8px'
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffcc00', border: '1.5px solid #111111' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e02424', border: '1.5px solid #111111' }} />
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1d4ed8', border: '1.5px solid #111111' }} />
        </div>
      </motion.div>
    </div>
  );
}

// ── CHARACTERISTIC AVATAR 05: HERALD (The Orbital Courier Drone) ──
function HeraldRocketCharacter({ isWorking, onAction }) {
  const [thrusting, setThrusting] = useState(false);

  const handleClick = () => {
    setThrusting(true);
    if (onAction) onAction();
    setTimeout(() => setThrusting(false), 1200);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title="Click Herald to fire orbital thruster"
    >
      {/* Supersonic Courier Rocket Drone */}
      <motion.div
        animate={thrusting || isWorking ? { y: [-15, -2, -15], rotate: [-4, 4, -4] } : { y: [-6, 6, -6], rotate: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: thrusting || isWorking ? 1 : 3.2, ease: 'easeInOut' }}
        style={{
          position: 'relative',
          width: '150px',
          height: '150px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Orbital Ring Path */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
          style={{
            position: 'absolute',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            border: '2px dashed #3b82f6',
            pointerEvents: 'none'
          }}
        />

        {/* Rocket Body */}
        <div style={{
          width: '64px',
          height: '88px',
          background: '#ffffff',
          border: '4px solid #111111',
          boxShadow: '6px 6px 0px #111111',
          clipPath: 'polygon(50% 0%, 100% 30%, 100% 85%, 75% 100%, 25% 100%, 0% 85%, 0% 30%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 5
        }}>
          {/* Glass Porthole Cockpit */}
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#3b82f6',
            border: '3px solid #111111',
            boxShadow: 'inset -2px -2px 0px #1d4ed8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.65rem',
            fontWeight: 900
          }}>
            PR
          </div>

          {/* GitHub PR Ribbon Seal */}
          <div style={{
            width: '38px',
            height: '8px',
            background: '#ffcc00',
            border: '1.5px solid #111111',
            marginTop: '8px'
          }} />
        </div>

        {/* Rocket Fins */}
        <div style={{
          position: 'absolute',
          bottom: '26px',
          display: 'flex',
          justifyContent: 'space-between',
          width: '92px',
          zIndex: 4
        }}>
          <div style={{
            width: '18px',
            height: '30px',
            background: '#e02424',
            border: '3px solid #111111',
            clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
          }} />
          <div style={{
            width: '18px',
            height: '30px',
            background: '#e02424',
            border: '3px solid #111111',
            clipPath: 'polygon(0% 0%, 0% 100%, 100% 100%)'
          }} />
        </div>

        {/* Thruster Plume Particles */}
        <motion.div
          animate={{
            scaleY: thrusting || isWorking ? [1, 1.8, 1] : [0.8, 1.3, 0.8],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ repeat: Infinity, duration: 0.3 }}
          style={{
            position: 'absolute',
            bottom: '-2px',
            width: '26px',
            height: '38px',
            background: 'linear-gradient(to bottom, #ffcc00 0%, #e02424 70%, transparent 100%)',
            clipPath: 'polygon(50% 100%, 100% 0%, 0% 0%)',
            zIndex: 3
          }}
        />
      </motion.div>
    </div>
  );
}

// ── AGENT PERSONA REGISTRY WITH LORE, CHARACTER TRAITS & CATCHPHRASES ──
const AGENT_PERSONAS = [
  {
    idx: 0,
    key: 'recon',
    name: 'RECON-01',
    codename: 'THE CYBERNETIC SENTINEL',
    role: 'AST Taint Profiler & Zero-Day Seeker',
    color: '#e02424',
    badge: 'CVE HUNTER',
    quote: '"Nothing lurks unparsed in the Abstract Syntax Tree. I dissect the AST node by node until every SQLi, IDOR, and traversal flaw is locked in my crosshairs."',
    lore: 'Constructed from cybernetic lenses and deterministic AST visitors. Recon sleeps with one aperture open, scanning repositories at 120,000 lines/sec.',
    catchphrase: 'TAINT DETECTED IN LINE 42: FLAGGED FOR SANITIZATION.',
    component: ReconEyeCharacter,
    stats: {
      perception: '99.9%',
      reactionSpeed: '12ms',
      cveAccuracy: '100%',
      astDepth: 'Infinite'
    },
    actionLabel: 'PING RECON SONAR'
  },
  {
    idx: 1,
    key: 'forge',
    name: 'FORGE-02',
    codename: 'THE MOLTEN BLACKSMITH',
    role: 'Surgical Patch Synthesizer & Code Foundry',
    color: '#ffcc00',
    badge: 'CODE FORGER',
    quote: '"Code is malleable steel. I strike the tainted branches with LangChain LCEL pneumatic power, welding clean parameterized statements with zero blast radius."',
    lore: 'Forged in the fires of Gemini 2.5 Pro and strict AST invariants. Forge disdains clumsy rewrites; every patch is surgical, minimal, and elegant.',
    catchphrase: 'CLANG! THE FLAW IS STRUCK. PARAMETERIZED SHIELD FORGED.',
    component: ForgeGolemCharacter,
    stats: {
      synthesisTemp: '0.2 (Cold Logic)',
      tokenThroughput: '184 tok/s',
      surgicalAccuracy: '99.8%',
      blastRadius: '4 Lines'
    },
    actionLabel: 'STOKE THE LCEL ANVIL'
  },
  {
    idx: 2,
    key: 'shield',
    name: 'SHIELD-03',
    codename: 'THE POLYHEDRAL PALADIN',
    role: 'Formal Verifier & Hallucination Guard',
    color: '#1d4ed8',
    badge: 'ZERO-TRUST GUARDIAN',
    quote: '"Trust nothing, prove everything. Before any patch touches your codebase, it must pass through my 4-fold polyhedral sound barrier of mathematical proof."',
    lore: 'A crystalline guardian born from symbolic execution proofs and anti-injection heuristics. Shield deflects malicious prompt injections with ease.',
    catchphrase: 'PROOF COMPLETE. 99.8% MATHEMATICALLY SOUND.',
    component: ShieldPaladinCharacter,
    stats: {
      soundness: '99.8%',
      injectionDeflection: '100% Immune',
      hallucinationRate: '0.00%',
      barrierArmor: 'Diamond Hard'
    },
    actionLabel: 'DEFLECT MALICIOUS INJECTION'
  },
  {
    idx: 3,
    key: 'proof',
    name: 'PROOF-04',
    codename: 'THE QUANTUM OSCILLOSCOPE SCIENTIST',
    role: 'Containerized Sandbox & Pytest Examiner',
    color: '#15803d',
    badge: 'PYTEST VERIFIER',
    quote: '"Words are cheap; green test checkmarks are truth! I spin up isolated Docker pods and subject code to 14 rigorous regression gauntlets."',
    lore: 'An eccentric CRT android whose cathode tube smiles in sine waves whenever test suites pass. It will not tolerate even a single flaky test.',
    catchphrase: '14/14 PODS GREEN. ZERO REGRESSION CERTIFIED.',
    component: ProofOscilloscopeCharacter,
    stats: {
      containerIsolation: 'Complete Jail',
      suiteLatency: '0.42s',
      passRate: '100% (14/14)',
      driftResistance: 'Absolute'
    },
    actionLabel: 'RUN OSCILLOSCOPE GAUNTLET'
  },
  {
    idx: 4,
    key: 'herald',
    name: 'HERALD-05',
    codename: 'THE ORBITAL COURIER',
    role: 'Git Branch Dispatcher & CI/CD Relay',
    color: '#3b82f6',
    badge: 'PR RELAY',
    quote: '"Target acquired: remote GitHub repository! I propel verified patches into production branches with cryptographically signed commits."',
    lore: 'A hypersonic satellite drone cruising in low Earth orbit, bridging autonomous agent consensus directly into human GitHub pull requests.',
    catchphrase: 'BRANCH aistudio TRANSMITTED. PR DISPATCHED.',
    component: HeraldRocketCharacter,
    stats: {
      orbitalVelocity: 'Mach 8.4',
      mergeReadiness: '100%',
      relayUptime: '99.99%',
      remoteLatency: '180ms'
    },
    actionLabel: 'FIRE ORBITAL DISPATCH'
  }
];

export default function AgentCharacterPopPage({
  agentIdx = 0,
  isOpen = false,
  onClose,
  onSelectAgent,
  onExpandToFullPage,
  status,
  vulnerabilities = [],
  patches = [],
  confidenceScore = 99.8,
  testResults,
  prUrl,
  prNumber = 42
}) {
  const [activeIdx, setActiveIdx] = useState(agentIdx);
  const [dialogue, setDialogue] = useState('');
  const [actionCount, setActionCount] = useState(0);

  // Sync index when prop changes
  useEffect(() => {
    setActiveIdx(agentIdx);
  }, [agentIdx]);

  const currentPersona = AGENT_PERSONAS[activeIdx] || AGENT_PERSONAS[0];

  useEffect(() => {
    setDialogue(currentPersona.catchphrase);
  }, [activeIdx, currentPersona]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCharacteristicAction = () => {
    setActionCount(c => c + 1);
    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: [currentPersona.color, '#ffcc00', '#111111', '#ffffff']
      });
    } catch {
      // ignore
    }
    setDialogue(`[OVERCLOCK ACTIVATED] ${currentPersona.catchphrase} (Burst #${actionCount + 1})`);
  };

  const CharacterComp = currentPersona.component;

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
        {/* Dark Halftone Frosted Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 10, 10, 0.78)',
            backdropFilter: 'blur(8px)',
            backgroundImage: 'radial-gradient(rgba(255, 204, 0, 0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* ── THE POPPING CHARACTER PAGE MODAL ── */}
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 35 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 25 }}
          transition={BRUTALIST_SPRING}
          style={{
            position: 'relative',
            width: '95vw',
            maxWidth: '1100px',
            maxHeight: '92vh',
            background: '#faf7f0',
            border: '4px solid #111111',
            boxShadow: '12px 12px 0px #111111',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10000
          }}
        >
          {/* Top Bauhaus Header Bar with Agent Switcher Tabs */}
          <div style={{
            background: '#ffffff',
            borderBottom: '3px solid #111111',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {/* Left Agent Selector Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span className="font-mono" style={{
                background: '#111111',
                color: '#ffcc00',
                padding: '2px 8px',
                fontSize: '0.65rem',
                fontWeight: 900,
                marginRight: '6px'
              }}>
                POP PORTAL
              </span>

              {AGENT_PERSONAS.map((persona) => {
                const isSelected = activeIdx === persona.idx;
                return (
                  <motion.button
                    key={persona.key}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      setActiveIdx(persona.idx);
                      if (onSelectAgent) onSelectAgent(persona.idx);
                    }}
                    style={{
                      background: isSelected ? persona.color : '#ffffff',
                      color: isSelected && persona.color === '#ffcc00' ? '#111111' : isSelected ? '#ffffff' : '#111111',
                      border: '2px solid #111111',
                      boxShadow: isSelected ? '3px 3px 0px #111111' : '1px 1px 0px #111111',
                      padding: '4px 10px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: persona.color,
                      border: '1px solid #111111'
                    }} />
                    {persona.name}
                  </motion.button>
                );
              })}
            </div>

            {/* Right Close Button & Keyboard Esc Prompt */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {onExpandToFullPage && (
                <motion.button
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    onExpandToFullPage(activeIdx);
                    if (onClose) onClose();
                  }}
                  className="bauhaus-btn"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.66rem',
                    background: '#111111',
                    color: '#ffcc00',
                    border: '1.5px solid #111111',
                    boxShadow: '2px 2px 0px #111111',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                  title="Expand to Full Dedicated Page"
                >
                  <span style={{ fontWeight: 800 }}>DEDICATED PAGE</span>
                  <span style={{ fontSize: '0.75rem' }}>↗</span>
                </motion.button>
              )}
              <span className="font-mono" style={{ fontSize: '0.62rem', color: '#6e6a61', fontWeight: 700 }}>
                [ESC TO CLOSE]
              </span>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onClose}
                className="bauhaus-btn"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  background: '#e02424',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Close Agent Pop Page"
              >
                <X size={18} />
              </motion.button>
            </div>
          </div>

          {/* Main Scrollable Content Area */}
          <div style={{
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* ── TOP HERO CHARACTER SHOWCASE SECTION ── */}
            <div style={{
              background: '#ffffff',
              border: '3px solid #111111',
              boxShadow: '6px 6px 0px #111111',
              padding: '20px',
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: '24px',
              alignItems: 'center'
            }}>
              {/* Left: The Kinetic Mascot Avatar Character */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#faf7f0',
                border: '2px solid #111111',
                padding: '16px',
                boxShadow: '3px 3px 0px #111111',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  background: currentPersona.color,
                  color: currentPersona.color === '#ffcc00' ? '#111111' : '#ffffff',
                  padding: '1px 5px',
                  border: '1px solid #111111'
                }}>
                  {currentPersona.badge}
                </div>

                {/* The Character Component with interactive motions */}
                <CharacterComp
                  isWorking={status === 'running'}
                  onAction={handleCharacteristicAction}
                />

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleCharacteristicAction}
                  className="bauhaus-btn"
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.65rem',
                    background: currentPersona.color,
                    color: currentPersona.color === '#ffcc00' ? '#111111' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={12} />
                  {currentPersona.actionLabel}
                </motion.button>
              </div>

              {/* Right: Character Persona Lore, Dialogue, and Specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: currentPersona.color,
                        border: '2px solid #111111',
                        display: 'inline-block'
                      }} />
                      <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>
                        {currentPersona.name} // {currentPersona.codename}
                      </h2>
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.74rem', color: '#4a4842', fontWeight: 800, marginTop: '2px' }}>
                      {currentPersona.role}
                    </div>
                  </div>

                  <span className="font-mono" style={{
                    background: '#111111',
                    color: '#ffcc00',
                    border: '1.5px solid #111111',
                    padding: '3px 8px',
                    fontSize: '0.64rem',
                    fontWeight: 900
                  }}>
                    AUTONOMOUS LEVEL 5
                  </span>
                </div>

                {/* Animated Speech Bubble with Character Voice Line */}
                <motion.div
                  key={dialogue}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    background: '#ffcc00',
                    border: '2px solid #111111',
                    boxShadow: '4px 4px 0px #111111',
                    padding: '12px 16px',
                    position: 'relative'
                  }}
                >
                  <div className="font-mono" style={{ fontSize: '0.62rem', fontWeight: 900, color: '#111111', marginBottom: '2px' }}>
                    DIRECT TRANSMISSION FROM {currentPersona.name}:
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.74rem', fontWeight: 800, color: '#111111', lineHeight: 1.4 }}>
                    {dialogue}
                  </div>
                </motion.div>

                {/* Persona Quote & Lore */}
                <div style={{ fontSize: '0.72rem', color: '#111111', lineHeight: 1.45 }}>
                  <em>{currentPersona.quote}</em>
                </div>

                <div className="font-mono" style={{ fontSize: '0.66rem', color: '#4a4842' }}>
                  <strong>ORIGIN ARCHITECTURE:</strong> {currentPersona.lore}
                </div>

                {/* 4 Characteristic Stat Badges */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginTop: '4px'
                }}>
                  {Object.entries(currentPersona.stats).map(([statKey, statVal]) => (
                    <div
                      key={statKey}
                      style={{
                        background: '#faf7f0',
                        border: '1.5px solid #111111',
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <span className="font-mono" style={{ fontSize: '0.55rem', color: '#6e6a61', textTransform: 'uppercase' }}>
                        {statKey.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="font-display" style={{ fontSize: '0.82rem', fontWeight: 900, color: '#111111' }}>
                        {statVal}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── LOWER SECTION: INTERACTIVE WORKBENCH DEEP-DIVE ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px'
            }}>
              {/* Card 1: Live Telemetry & Mission State */}
              <div style={{
                background: '#ffffff',
                border: '3px solid #111111',
                boxShadow: '4px 4px 0px #111111',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={14} />
                    <h3 className="font-display" style={{ fontSize: '0.84rem', fontWeight: 900, margin: 0 }}>
                      AGENT COCKPIT TELEMETRY
                    </h3>
                  </div>
                  <span className="font-mono" style={{
                    background: currentPersona.color,
                    color: currentPersona.color === '#ffcc00' ? '#111111' : '#ffffff',
                    border: '1px solid #111111',
                    padding: '1px 6px',
                    fontSize: '0.6rem',
                    fontWeight: 800
                  }}>
                    READY
                  </span>
                </div>

                <div className="terminal-window" style={{ padding: '12px', minHeight: '110px' }}>
                  <pre style={{ margin: 0, fontSize: '0.66rem', color: '#f4efe6', lineHeight: 1.45 }}>
                    {activeIdx === 0 && `[RECON-01] Scanning AST hierarchy: backend/api/users.py:42
[RECON-01] Quarantine Matrix: ${vulnerabilities.length || 4} CVE anomalies active (${status}).
[RECON-01] CWE-89 (SQL Injection) confirmed. Handed to Forge-02.`}
                    {activeIdx === 1 && `[FORGE-02] LCEL RunnableSequence active. Model: Gemini 2.5 Pro.
[FORGE-02] Patches Synthesized: ${patches.length || 4} AST repair diffs applied (${status}).
[FORGE-02] Prepared parameter replacement generated: +4 / -2 lines.`}
                    {activeIdx === 2 && `[SHIELD-03] Formal verification audit in progress.
[SHIELD-03] 4 Invariants checked. 0 hallucinated imports detected.
[SHIELD-03] Proof score: ${confidenceScore}% mathematically sound.`}
                    {activeIdx === 3 && `[PROOF-04] Initializing isolated Docker pytest container.
[PROOF-04] Results: ${testResults?.passed || 14} passed, ${testResults?.failed || 0} failed (${status}).
[PROOF-04] Pytest Sandbox: ZERO regressions flagged.`}
                    {activeIdx === 4 && `[HERALD-05] Dispatching commit to remote branch 'aistudio'.
[HERALD-05] Pull Request #${prNumber}: ${prUrl || 'https://github.com/dhanrajgupta2736/pvg_vasuki/pull/42'}
[HERALD-05] CI/CD Webhook: Ready for human merge confirmation.`}
                  </pre>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: '0.64rem', color: '#4a4842' }}>
                    LangChain Orchestration Consensus: <strong>SYNCHRONIZED</strong>
                  </span>
                </div>
              </div>

              {/* Card 2: Interactive Special Move Trigger */}
              <div style={{
                background: '#ffffff',
                border: '3px solid #111111',
                boxShadow: '4px 4px 0px #111111',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Zap size={14} color="#e02424" />
                    <h3 className="font-display" style={{ fontSize: '0.84rem', fontWeight: 900, margin: 0 }}>
                      CHARACTERISTIC SPECIAL ABILITY
                    </h3>
                  </div>

                  <div style={{
                    background: '#faf7f0',
                    border: '1.5px solid #111111',
                    padding: '10px',
                    fontSize: '0.68rem',
                    lineHeight: 1.4
                  }}>
                    {activeIdx === 0 && (
                      <div>
                        <strong>AST Sonar Overclock:</strong> Forces a micro-second depth-first traversal across all function decorators and raw string interpolations in the repository.
                      </div>
                    )}
                    {activeIdx === 1 && (
                      <div>
                        <strong>Surgical Anvil Blast:</strong> Superheats the LCEL prompt sequence to guarantee zero hallucinated method calls and minimal token blast radius.
                      </div>
                    )}
                    {activeIdx === 2 && (
                      <div>
                        <strong>Aegis Forcefield Lock:</strong> Deploys a mathematical zero-trust lattice that proves semantic equivalence before unit tests run.
                      </div>
                    )}
                    {activeIdx === 3 && (
                      <div>
                        <strong>Pytest Flash Sandbox:</strong> Fires up 14 parallel ephemeral test containers to stress-test concurrent token race conditions.
                      </div>
                    )}
                    {activeIdx === 4 && (
                      <div>
                        <strong>Orbital Warp Dispatch:</strong> Immediately notifies repository maintainers with automated changelogs and diff breakdowns.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleCharacteristicAction}
                    className="bauhaus-btn"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.7rem',
                      background: currentPersona.color,
                      color: currentPersona.color === '#ffcc00' ? '#111111' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Play size={13} />
                    TRIGGER {currentPersona.name} ABILITY
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
