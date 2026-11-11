import { FallingLeaves } from 'falling-leaves/react'

interface FallingLeavesOverlayProps {
  /** Override the default leaf count (18). Useful when a larger surface needs more leaves. */
  count?: number
}

/**
 * Centralised falling-leaves overlay.
 *
 * Drop this inside any element that has `position: relative` (or any
 * non-static position) to confine the leaves to that element.
 *
 * The canvas is pointer-events: none so it never blocks clicks below it.
 */
export function FallingLeavesOverlay({ count = 18 }: FallingLeavesOverlayProps) {
  return (
    <FallingLeaves
      count={count}
      shapes={['maple', 'oak', 'ginkgo', 'birch']}
      colors={['#c0392b', '#e67e22', '#d4ac0d', '#6b8f3e', '#a04000', '#c07a2a']}
      size={[10, 22]}
      speed={[0.4, 1.0]}
      wind={[-0.3, 0.6]}
      sway={[0.3, 1.2]}
      rotationSpeed={[0.4, 1.8]}
      opacity={0.72}
      zIndex={0}
      style={{ pointerEvents: 'none', borderRadius: 'inherit' }}
    />
    
  )
}
