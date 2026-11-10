import React from 'react';

interface LogoIconProps {
  className?: string;
  size?: number | string;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className = 'w-9 h-9', size }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Clausora Emblem"
    >
      <defs>
        <linearGradient id="cla-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="cla-logo-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="cla-logo-ribbon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E0E7FF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <filter id="cla-logo-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#312E81" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Rounded Squircle Container */}
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="108"
        fill="url(#cla-logo-bg)"
        filter="url(#cla-logo-glow)"
      />
      <rect
        x="24"
        y="24"
        width="464"
        height="464"
        rx="108"
        stroke="#A5B4FC"
        strokeOpacity="0.35"
        strokeWidth="4"
      />

      {/* Geometric C-Ribbon Curve (Bilateral Contract & Escrow Enclosure) */}
      <path
        d="M 360 155 C 325 118 280 98 225 98 C 138 98 68 168 68 256 C 68 344 138 414 225 414 C 280 414 325 394 360 357"
        stroke="url(#cla-logo-ribbon)"
        strokeWidth="36"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner Verification Check & Work DNA Assurance Vector */}
      <path
        d="M 195 260 L 240 305 L 340 185"
        stroke="url(#cla-logo-accent)"
        strokeWidth="34"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Bilateral Counterpart Nexus Nodes */}
      {/* Top Node (Client Handshake) */}
      <circle cx="360" cy="155" r="24" fill="#38BDF8" />
      <circle cx="360" cy="155" r="10" fill="#FFFFFF" />

      {/* Bottom Node (Provider Handshake) */}
      <circle cx="360" cy="357" r="24" fill="#C084FC" />
      <circle cx="360" cy="357" r="10" fill="#FFFFFF" />

      {/* Dynamic Verification Pulse Pip */}
      <circle cx="240" cy="305" r="8" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
};

interface LogoProps {
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  showTagline = true,
  size = 'md',
  className = '',
}) => {
  const iconSizeClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
  const textClass =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
      ? 'text-xl sm:text-2xl'
      : 'text-base sm:text-lg';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 group ${className}`}>
      <div className={`${iconSizeClass} shrink-0 transition-transform duration-200 group-hover:scale-105 drop-shadow-md`}>
        <LogoIcon className="w-full h-full" />
      </div>
      <div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className={`font-extrabold ${textClass} text-white tracking-tight leading-none`}>
            CLAUSORA
          </span>
          <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-semibold leading-none">
            AI + PayPal
          </span>
        </div>
        {showTagline && (
          <p className="hidden md:block text-[10px] text-slate-400 font-medium mt-1 leading-tight">
            Understand the work. Verify the outcome. Release the payment.
          </p>
        )}
      </div>
    </div>
  );
};
