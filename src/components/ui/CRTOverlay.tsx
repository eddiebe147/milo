import React from 'react'

export const CRTOverlay: React.FC = () => {
  return (
    <div className="crt-overlay">
      <div className="scanlines" />
      <div className="flicker" />
      <div className="vignette" />
    </div>
  )
}
