// Right-column hero visual — a custom, on-brand flat illustration (no stock
// asset): a car silhouette, a "trust" chip, and motion lines. Fully inline SVG
// so there's nothing to fail to load.
const FleetCar = () => (
  <div className="fleet-car">
    <svg
      className="fleet-car__art"
      viewBox="0 0 720 260"
      role="img"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef2f7" />
          <stop offset="1" stopColor="#c8d1dd" />
        </linearGradient>
        <linearGradient id="fc-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4a68" />
          <stop offset="1" stopColor="#232f45" />
        </linearGradient>
        <radialGradient id="fc-glow" cx="50%" cy="44%" r="55%">
          <stop offset="0" stopColor="#3eb846" stopOpacity="0.16" />
          <stop offset="1" stopColor="#3eb846" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="360" cy="128" rx="350" ry="126" fill="url(#fc-glow)" />

      <g>
        <rect x="2" y="150" width="54" height="5" rx="2.5" fill="#fff" opacity="0.4" />
        <rect x="16" y="166" width="38" height="5" rx="2.5" fill="#fff" opacity="0.28" />
        <rect x="28" y="182" width="24" height="5" rx="2.5" fill="#fff" opacity="0.18" />
      </g>

      <ellipse cx="366" cy="224" rx="238" ry="13" fill="#0f172a" opacity="0.18" />

      <path
        d="M58 196 Q50 166 74 158 C106 149 142 149 172 146 L212 108
           Q230 97 270 97 L406 97 Q450 99 476 130 L516 152
           C558 146 606 147 644 157 Q674 164 676 185 Q678 194 668 196 L58 196 Z"
        fill="url(#fc-body)"
      />

      <path
        d="M222 142 L222 112 Q238 101 270 101 L404 101 Q442 103 464 128 L498 148 Z"
        fill="url(#fc-glass)"
      />
      <line x1="360" y1="101" x2="360" y2="147" stroke="#0f172a" strokeWidth="3" opacity="0.5" />

      <circle cx="668" cy="178" r="7" fill="#eafff0" />
      <circle cx="668" cy="178" r="14" fill="#eafff0" opacity="0.28" />

      <rect x="620" y="168" width="26" height="11" rx="4" fill="#3eb846" opacity="0.9" />

      {[176, 556].map((cx) => (
        <g key={cx} transform={`translate(${cx} 196)`}>
          <circle r="34" fill="#eef2f7" />
          <circle r="30" fill="#1e293b" />
          <circle r="14" fill="#cbd5e1" />
          <circle r="5" fill="#3eb846" />
        </g>
      ))}

      <g transform="translate(478 38)">
        <rect x="-54" y="-24" width="108" height="48" rx="24" fill="#10351a" opacity="0.92" />
        <rect x="-54" y="-24" width="108" height="48" rx="24" fill="none" stroke="#3eb846" strokeWidth="1.5" opacity="0.6" />
        <circle cx="-28" cy="0" r="12" fill="#3eb846" />
        <path d="M-33 0 l4 4 l8 -9" stroke="#0b1524" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="-8" y="-6" width="48" height="5" rx="2.5" fill="#fff" opacity="0.85" />
        <rect x="-8" y="4" width="34" height="5" rx="2.5" fill="#fff" opacity="0.5" />
      </g>
    </svg>
  </div>
);

export default FleetCar;
