import React from 'react';

interface RunningManAnimationProps {
    size?: 'xs' | 'sm' | 'md' | 'lg';
    label?: string;
    sublabel?: string;
    color?: string;
    showTrack?: boolean;
    inline?: boolean;
    className?: string;
}

export const RunningManAnimation: React.FC<RunningManAnimationProps> = ({
    size = 'sm',
    label,
    sublabel,
    color = 'var(--primary-glow, #38bdf8)',
    showTrack = true,
    inline = false,
    className = ''
}) => {
    // Dimensions based on size
    const dimensions = {
        xs: { width: 18, height: 18, viewBoxSize: 32 },
        sm: { width: 26, height: 26, viewBoxSize: 32 },
        md: { width: 44, height: 44, viewBoxSize: 40 },
        lg: { width: 72, height: 72, viewBoxSize: 48 }
    }[size];

    const svgContent = (
        <div 
            className={`running-man-wrapper ${inline ? 'd-inline-flex' : 'd-flex'} align-items-center justify-content-center ${className}`}
            style={{ position: 'relative' }}
            title={label || "Step / Phase in progress"}
        >
            <svg 
                width={dimensions.width} 
                height={dimensions.height} 
                viewBox="0 0 40 40" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="running-man-svg"
            >
                {/* Ground Speed Dashes */}
                {showTrack && (
                    <g className="runner-track-lines" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6">
                        <line x1="6" y1="36" x2="16" y2="36" className="track-dash-1" />
                        <line x1="20" y1="36" x2="34" y2="36" className="track-dash-2" />
                        <line x1="12" y1="38" x2="26" y2="38" className="track-dash-3" />
                    </g>
                )}

                {/* Runner Body Group (Bobs during stride) */}
                <g className="runner-body-group">
                    {/* Head */}
                    <circle cx="23" cy="8" r="3.2" fill={color} />

                    {/* Torso (forward lean) */}
                    <path 
                        d="M22 11.5 L17.5 21" 
                        stroke={color} 
                        strokeWidth="2.8" 
                        strokeLinecap="round" 
                    />

                    {/* Back Arm (pumps opposite to front arm) */}
                    <g className="runner-back-arm" style={{ transformOrigin: '21px 13px' }}>
                        <path 
                            d="M21 13 L15 16.5 L11 14" 
                            stroke={color} 
                            strokeWidth="2.2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            opacity="0.75"
                        />
                    </g>

                    {/* Back Leg (driving back / bent knee) */}
                    <g className="runner-back-leg" style={{ transformOrigin: '17.5px 21px' }}>
                        <path 
                            d="M17.5 21 L12 26 L7 24" 
                            stroke={color} 
                            strokeWidth="2.4" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            opacity="0.75"
                        />
                    </g>

                    {/* Front Leg (striding forward / knee high) */}
                    <g className="runner-front-leg" style={{ transformOrigin: '17.5px 21px' }}>
                        <path 
                            d="M17.5 21 L24 25.5 L28 34" 
                            stroke={color} 
                            strokeWidth="2.6" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    </g>

                    {/* Front Arm (pumping forward) */}
                    <g className="runner-front-arm" style={{ transformOrigin: '21px 13px' }}>
                        <path 
                            d="M21 13 L27 16 L31 12.5" 
                            stroke={color} 
                            strokeWidth="2.4" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    </g>
                </g>
            </svg>

            <style>{`
                .runner-body-group {
                    animation: runnerBobbing 0.38s infinite alternate ease-in-out;
                }
                .runner-front-leg {
                    animation: runnerCycleFrontLeg 0.38s infinite alternate ease-in-out;
                }
                .runner-back-leg {
                    animation: runnerCycleBackLeg 0.38s infinite alternate ease-in-out;
                }
                .runner-front-arm {
                    animation: runnerCycleFrontArm 0.38s infinite alternate ease-in-out;
                }
                .runner-back-arm {
                    animation: runnerCycleBackArm 0.38s infinite alternate ease-in-out;
                }
                .track-dash-1 {
                    animation: trackSlide 0.38s infinite linear;
                }
                .track-dash-2 {
                    animation: trackSlide 0.38s infinite linear 0.1s;
                }
                .track-dash-3 {
                    animation: trackSlide 0.38s infinite linear 0.2s;
                }

                @keyframes runnerBobbing {
                    0% { transform: translateY(0px) rotate(1deg); }
                    100% { transform: translateY(-2.2px) rotate(-1deg); }
                }

                @keyframes runnerCycleFrontLeg {
                    0% { transform: rotate(-32deg); }
                    100% { transform: rotate(38deg); }
                }

                @keyframes runnerCycleBackLeg {
                    0% { transform: rotate(36deg); }
                    100% { transform: rotate(-30deg); }
                }

                @keyframes runnerCycleFrontArm {
                    0% { transform: rotate(34deg); }
                    100% { transform: rotate(-32deg); }
                }

                @keyframes runnerCycleBackArm {
                    0% { transform: rotate(-32deg); }
                    100% { transform: rotate(34deg); }
                }

                @keyframes trackSlide {
                    0% { transform: translateX(8px); opacity: 0.2; }
                    50% { opacity: 0.8; }
                    100% { transform: translateX(-12px); opacity: 0.1; }
                }
            `}</style>
        </div>
    );

    if (!label && !sublabel) {
        return svgContent;
    }

    return (
        <div className={`d-flex align-items-center gap-2 ${inline ? 'd-inline-flex' : ''} ${className}`}>
            {svgContent}
            <div className="d-flex flex-column text-start">
                {label && (
                    <span className="small fw-bold text-uppercase font-mono" style={{ color, letterSpacing: '0.04em' }}>
                        {label}
                    </span>
                )}
                {sublabel && (
                    <span className="text-white-50 font-mono" style={{ fontSize: '0.72rem' }}>
                        {sublabel}
                    </span>
                )}
            </div>
        </div>
    );
};
