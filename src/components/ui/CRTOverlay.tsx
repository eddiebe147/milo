import React from 'react'

/**
 * CRTOverlay - Advanced Pip-Boy visual effects layer
 * Brother typewriter style with pronounced curved edges
 *
 * Layer ordering (bottom to top):
 * 1. phosphor-glow (z-1) - Subtle pulsing green afterglow
 * 2. vignette-enhanced (z-5) - Darker corners for depth
 * 3. vignette (z-5) - Base vignette
 * 4. scanlines (z-6) - Horizontal scanline pattern
 * 5. flicker (z-7) - Subtle screen flicker
 * 6. curved-edge (z-8) - CRT bezel/edge distortion (Brother typewriter style)
 * 7. corner-shadows (z-9) - Extra corner darkening for CRT tube effect
 * 8. chromatic-aberration (z-10, ::before) - RGB split at edges
 */
export const CRTOverlay: React.FC = () => {
  return (
    <div className="crt-overlay">
      <div className="phosphor-glow" />
      <div className="vignette-enhanced" />
      <div className="vignette" />
      <div className="scanlines" />
      <div className="flicker" />
      <div className="curved-edge" />
      <div className="corner-shadows" />
    </div>
  )
}
