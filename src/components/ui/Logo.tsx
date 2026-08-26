interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * DeanVerse monogram — the site's gold-on-emerald mark, redrawn light enough
 * for a mobile shell to render it at every size without a network fetch.
 */
export function LogoMark({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="DeanVerse Digital"
      className={className}
    >
      <defs>
        <linearGradient id="dv-gold" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dfc88a" />
          <stop offset="0.55" stopColor="#c9a962" />
          <stop offset="1" stopColor="#aa8c46" />
        </linearGradient>
        <linearGradient id="dv-panel" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12211c" />
          <stop offset="1" stopColor="#0a1210" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#dv-panel)" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="13"
        stroke="url(#dv-gold)"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
      <path
        d="M13 14h7.4c5.6 0 9.1 3.5 9.1 9.6S26 33.2 20.4 33.2H13V14Zm4.3 3.6v12h2.7c3.2 0 5.1-2.2 5.1-6s-1.9-6-5.1-6h-2.7Z"
        fill="url(#dv-gold)"
      />
      <path
        d="m28.6 14 4.4 13.4L37.4 14H41l-6.6 19.2h-2.9L25 14h3.6Z"
        fill="url(#dv-gold)"
        fillOpacity="0.92"
      />
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={30} />
      <span className="flex flex-col leading-none">
        <span className="admin-heading-serif text-[0.9375rem] tracking-tight text-white">DeanVerse</span>
        <span className="admin-eyebrow mt-0.5 text-[0.5rem]">Intelligence</span>
      </span>
    </span>
  );
}
