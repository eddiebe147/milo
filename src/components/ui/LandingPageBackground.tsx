import React from 'react'

export const LandingPageBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-pipboy-background pointer-events-none">

            {/* 1. Deep black vignette - submarine cockpit darkness */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)'
                }}
            />

            {/* 2. Subtle grid - like instrument panel backing */}
            <div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(0, 255, 65, 0.15) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 255, 65, 0.15) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* 3. Scratches / wear marks overlay */}
            <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='23' x2='45' y2='28' stroke='%23ffffff' stroke-width='0.5' opacity='0.3'/%3E%3Cline x1='60' y1='67' x2='100' y2='72' stroke='%23ffffff' stroke-width='0.3' opacity='0.2'/%3E%3Cline x1='20' y1='80' x2='55' y2='85' stroke='%23ffffff' stroke-width='0.4' opacity='0.25'/%3E%3Cline x1='75' y1='15' x2='95' y2='12' stroke='%23ffffff' stroke-width='0.3' opacity='0.15'/%3E%3C/svg%3E")`,
                    backgroundSize: '200px 200px'
                }}
            />

            {/* 4. Film grain / noise texture */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    mixBlendMode: 'overlay'
                }}
            />

            {/* 5. Slow pulsing radar sweep effect */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div
                    className="absolute w-[150vmax] h-[150vmax]"
                    style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0, 255, 65, 0.03) 30deg, transparent 60deg)',
                        animation: 'spin 20s linear infinite'
                    }}
                />
            </div>

            {/* 6. Horizontal scanlines - CRT monitor effect */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)',
                    backgroundSize: '100% 4px'
                }}
            />

            {/* 7. Moving scanline */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0, 255, 65, 0.02) 50%, transparent 100%)',
                    backgroundSize: '100% 200%',
                    animation: 'scanline 6s linear infinite'
                }}
            />

            {/* 8. Corner wear / damage marks */}
            <div className="absolute top-0 left-0 w-32 h-32 opacity-20"
                style={{
                    background: 'radial-gradient(ellipse at top left, rgba(100,80,60,0.3) 0%, transparent 70%)'
                }}
            />
            <div className="absolute bottom-0 right-0 w-48 h-48 opacity-15"
                style={{
                    background: 'radial-gradient(ellipse at bottom right, rgba(80,60,40,0.3) 0%, transparent 70%)'
                }}
            />

            {/* 9. Faint glow spots - like distant instrument lights */}
            <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-pipboy-orange/20 blur-sm" />
            <div className="absolute top-[15%] right-[15%] w-1 h-1 rounded-full bg-pipboy-red/30 blur-[2px]" />
            <div className="absolute bottom-[25%] left-[20%] w-1.5 h-1.5 rounded-full bg-pipboy-green/20 blur-sm" />

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes scanline {
                    0% { background-position: 0 -100%; }
                    100% { background-position: 0 100%; }
                }
            `}</style>
        </div>
    )
}
