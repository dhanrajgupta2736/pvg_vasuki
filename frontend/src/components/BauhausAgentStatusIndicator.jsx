import React from 'react';
import { motion } from 'framer-motion';

/**
 * Bauhaus primary palette constants
 */
export const BAUHAUS_PALETTE = {
  red: '#e02424',
  yellow: '#ffcc00',
  blue: '#1d4ed8',
  green: '#15803d',
  black: '#111111',
  cream: '#f4efe6',
  white: '#ffffff',
  muted: '#9ca3af'
};

/**
 * Mapping the 4 autonomous agents to their canonical Bauhaus colors and attributes
 */
export const AGENT_CONFIGS = {
  cve: {
    id: 'cve',
    name: 'CVE Detection',
    shortName: 'CVE DETECT',
    code: '01',
    color: BAUHAUS_PALETTE.red,
    activeStates: ['SCAN', 'SCANNING', 'DETECTING', 'SEARCHING'],
    completedStates: ['FLAGGED', 'IDENTIFIED', 'ANALYZED'],
    idleLabel: 'STANDBY',
    activeLabel: 'SCANNING AST'
  },
  patching: {
    id: 'patching',
    name: 'Patching',
    shortName: 'PATCHING',
    code: '02',
    color: BAUHAUS_PALETTE.yellow,
    textColor: BAUHAUS_PALETTE.black,
    activeStates: ['PATCHING', 'SYNTHESIZING', 'GENERATING'],
    completedStates: ['PATCHED', 'GENERATED', 'READY'],
    idleLabel: 'QUEUED',
    activeLabel: 'LCEL SYNTH'
  },
  review: {
    id: 'review',
    name: 'Review',
    shortName: 'REVIEW',
    code: '03',
    color: BAUHAUS_PALETTE.blue,
    textColor: BAUHAUS_PALETTE.white,
    activeStates: ['REVIEWING', 'AUDITING', 'VERIFYING AST'],
    completedStates: ['APPROVED', 'PASSED', 'VERIFIED'],
    idleLabel: 'PENDING',
    activeLabel: 'AUDITING'
  },
  verification: {
    id: 'verification',
    name: 'Verification',
    shortName: 'VERIFY',
    code: '04',
    color: BAUHAUS_PALETTE.green,
    textColor: BAUHAUS_PALETTE.white,
    activeStates: ['TESTING', 'VERIFYING', 'RUNNING PYTEST'],
    completedStates: ['PASSED', '14/14 PASS', 'CERTIFIED'],
    idleLabel: 'IDLE',
    activeLabel: 'CONTAINER TEST'
  }
};

/**
 * 1. BauhausAgentCircle: Reusable geometric circle representing agent state
 * using strict Bauhaus circle aesthetics with bold borders and color fills.
 */
export function BauhausAgentCircle({
  color = BAUHAUS_PALETTE.red,
  isActive = false,
  isCompleted = false,
  size = 14,
  label = ''
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
      title={label}
    >
      {/* Outer pulsing ring when active */}
      {isActive && (
        <motion.span
          animate={{ scale: [1, 2.1], opacity: [0.85, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Main Bauhaus Circle */}
      <motion.div
        animate={
          isActive
            ? { scale: [1, 1.2, 1] }
            : isCompleted
            ? { scale: [1, 1.05, 1] }
            : { scale: 1 }
        }
        transition={
          isActive
            ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: isActive ? color : isCompleted ? color : '#f4efe6',
          border: '1.5px solid #111111',
          boxShadow: isActive ? '0 0 0 1px #111111' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.25s ease'
        }}
      >
        {/* Core Dot when idle or checkmark when complete */}
        {isActive ? (
          <span
            style={{
              width: `${Math.max(4, Math.floor(size * 0.35))}px`,
              height: `${Math.max(4, Math.floor(size * 0.35))}px`,
              borderRadius: '50%',
              background: color === BAUHAUS_PALETTE.yellow ? '#111111' : '#ffffff'
            }}
          />
        ) : isCompleted ? (
          <span
            style={{
              fontSize: `${Math.max(7, Math.floor(size * 0.6))}px`,
              lineHeight: 1,
              fontWeight: 900,
              color: color === BAUHAUS_PALETTE.yellow ? '#111111' : '#ffffff'
            }}
          >
            ✓
          </span>
        ) : (
          <span
            style={{
              width: `${Math.max(3, Math.floor(size * 0.28))}px`,
              height: `${Math.max(3, Math.floor(size * 0.28))}px`,
              borderRadius: '50%',
              background: '#6e6a61'
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

/**
 * 2. BauhausAgentStatusIndicator: Reusable individual agent status pill
 * with spring-based hover, tactile neo-brutalist shadow, and Bauhaus circular status indicator.
 */
export function BauhausAgentStatusIndicator({
  agentKey = 'cve',
  name,
  stateText,
  subText,
  isActive = false,
  isCompleted = false,
  onClick,
  compact = false
}) {
  const config = AGENT_CONFIGS[agentKey] || AGENT_CONFIGS.cve;
  const displayName = name || config.name;
  const statusLabel = stateText || (isActive ? config.activeLabel : config.idleLabel);
  const color = config.color;

  return (
    <motion.button
      type="button"
      whileHover={{
        y: -2,
        boxShadow: '3px 3px 0px #111111',
        transition: { type: 'spring', stiffness: 450, damping: 20 }
      }}
      whileTap={{
        y: 1,
        x: 1,
        boxShadow: '1px 1px 0px #111111',
        transition: { duration: 0.08 }
      }}
      onClick={onClick}
      role="status"
      aria-label={`${displayName}: ${statusLabel}`}
      className="font-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '8px',
        padding: compact ? '3px 7px' : '4px 10px',
        background: isActive ? '#fffbeb' : '#ffffff',
        border: isActive ? `2px solid ${color}` : '1.5px solid #111111',
        boxShadow: isActive ? '2px 2px 0px #111111' : '1.5px 1.5px 0px #111111',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        flexShrink: 0
      }}
    >
      {/* Bauhaus Geometric Circle */}
      <BauhausAgentCircle
        color={color}
        isActive={isActive}
        isCompleted={isCompleted}
        size={compact ? 12 : 14}
        label={`${displayName} status: ${statusLabel}`}
      />

      {/* Label and State */}
      <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: compact ? 'center' : 'flex-start', gap: compact ? '5px' : '0px' }}>
        <span
          className="font-display"
          style={{
            fontSize: compact ? '0.66rem' : '0.68rem',
            fontWeight: 900,
            letterSpacing: '0.02em',
            color: '#111111',
            lineHeight: 1.1
          }}
        >
          {compact ? config.shortName : displayName}
        </span>
        <span
          style={{
            fontSize: '0.58rem',
            fontWeight: 800,
            color: isActive ? color : '#6e6a61',
            letterSpacing: '0.03em',
            lineHeight: 1.1,
            textTransform: 'uppercase'
          }}
        >
          {statusLabel}
        </span>
      </div>

      {subText && !compact && (
        <span
          style={{
            fontSize: '0.54rem',
            background: '#f4efe6',
            border: '1px solid #111111',
            padding: '1px 4px',
            color: '#111111',
            fontWeight: 700
          }}
        >
          {subText}
        </span>
      )}
    </motion.button>
  );
}

/**
 * 3. BauhausAutonomousAgentsHeaderBar:
 * Comprehensive container integrating the 4 autonomous agents
 * (CVE Detection, Patching, Review, Verification) into the dashboard header.
 */
export function BauhausAutonomousAgentsHeaderBar({
  agentsState = {},
  status = 'idle',
  selectedIdx = 0,
  onSelectAgent
}) {
  // Determine states from dynamic application state
  const isRunning = status === 'running';

  const fourAgents = [
    {
      key: 'cve',
      idx: 0,
      name: 'CVE Detection',
      stateText: agentsState.scanner?.state || 'SCAN',
      subText: agentsState.scanner?.sub || 'AST Parser',
      isActive: isRunning && selectedIdx === 0,
      isCompleted: Boolean(agentsState.scanner?.state && agentsState.scanner.state !== 'IDLE' && selectedIdx > 0)
    },
    {
      key: 'patching',
      idx: 1,
      name: 'Patching',
      stateText: agentsState.patcher?.state || 'QUEUED',
      subText: agentsState.patcher?.sub || 'LangChain',
      isActive: isRunning && selectedIdx === 1,
      isCompleted: agentsState.patcher?.state === 'READY' || agentsState.patcher?.state === 'PATCHED' || selectedIdx > 1
    },
    {
      key: 'review',
      idx: 2,
      name: 'Review',
      stateText: agentsState.reviewer?.state || 'PENDING',
      subText: agentsState.reviewer?.sub || 'Shield Audit',
      isActive: isRunning && selectedIdx === 2,
      isCompleted: agentsState.reviewer?.state === 'APPROVED' || selectedIdx > 2
    },
    {
      key: 'verification',
      idx: 3,
      name: 'Verification',
      stateText: agentsState.tester?.state || 'IDLE',
      subText: agentsState.tester?.sub || 'Pytest Basin',
      isActive: isRunning && selectedIdx === 3,
      isCompleted: agentsState.tester?.state === 'PASSED' || (agentsState.tester?.state && agentsState.tester.state.includes('PASS'))
    }
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#faf7f0',
        border: '2px solid #111111',
        boxShadow: '2px 2px 0px #111111',
        padding: '3px 6px',
        gap: '6px',
        flexWrap: 'wrap'
      }}
    >
      {/* Bauhaus Flag Tag */}
      <div
        className="font-mono"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '2px 6px',
          background: '#111111',
          color: '#ffffff',
          fontSize: '0.6rem',
          fontWeight: 900,
          letterSpacing: '0.04em'
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: isRunning ? BAUHAUS_PALETTE.red : BAUHAUS_PALETTE.green,
            display: 'inline-block'
          }}
        />
        <span>4-AGENT RUNTIME</span>
      </div>

      {/* The 4 Autonomous Agents Indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {fourAgents.map((ag) => (
          <BauhausAgentStatusIndicator
            key={ag.key}
            agentKey={ag.key}
            name={ag.name}
            stateText={ag.stateText}
            isActive={ag.isActive}
            isCompleted={ag.isCompleted}
            compact={true}
            onClick={() => onSelectAgent && onSelectAgent(ag.idx)}
          />
        ))}
      </div>
    </div>
  );
}

export default BauhausAutonomousAgentsHeaderBar;
