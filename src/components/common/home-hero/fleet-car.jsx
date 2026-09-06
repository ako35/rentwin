import { useState } from "react";

// Right-column hero visual. Renders /img/hero-car.png when present (drop in a
// background-removed studio shot of a real fleet car — Clio / Egea / Doblo);
// until then a brand-neutral compact-car illustration stands in, so the hero
// never shows a luxury stock photo that misrepresents the fleet.
const CarIllustration = () => (
  <svg
    className="fleet-car__art"
    viewBox="0 0 720 340"
    role="img"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="fc-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.55" stopColor="#eef2f7" />
        <stop offset="1" stopColor="#dbe2ea" />
      </linearGradient>
      <linearGradient id="fc-glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e8eef6" />
        <stop offset="1" stopColor="#cdd8e6" />
      </linearGradient>
      <radialGradient id="fc-glow" cx="50%" cy="46%" r="52%">
        <stop offset="0" stopColor="#3eb846" stopOpacity="0.16" />
        <stop offset="1" stopColor="#3eb846" stopOpacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="360" cy="168" rx="330" ry="150" fill="url(#fc-glow)" />
    <ellipse cx="360" cy="300" rx="286" ry="20" fill="#0f172a" opacity="0.10" />

    {/* body */}
    <path
      d="M92 250
         Q196 172 250 250
         L462 250
         Q520 172 606 250
         L664 250
         Q670 224 660 206
         Q640 180 566 168
         L512 150
         L470 128
         Q444 116 410 116
         L236 116
         Q214 116 205 124
         L172 150
         Q120 158 100 196
         Q86 222 92 250 Z"
      fill="url(#fc-body)"
      stroke="#cbd5e1"
      strokeWidth="2"
    />

    {/* greenhouse */}
    <path
      d="M214 150 L236 128 L406 128 Q432 128 448 144 L470 150 Z"
      fill="url(#fc-glass)"
      stroke="#cbd5e1"
      strokeWidth="1.5"
    />
    <line x1="330" y1="129" x2="330" y2="150" stroke="#cbd5e1" strokeWidth="3" />

    {/* character line + door handles */}
    <path d="M120 206 Q360 196 624 210" fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.5" />
    <rect x="288" y="196" width="26" height="5" rx="2.5" fill="#94a3b8" opacity="0.7" />
    <rect x="360" y="196" width="26" height="5" rx="2.5" fill="#94a3b8" opacity="0.7" />

    {/* lights */}
    <rect x="636" y="188" width="26" height="15" rx="6" fill="#3eb846" opacity="0.85" />
    <rect x="94" y="192" width="12" height="17" rx="4" fill="#f59e0b" opacity="0.75" />

    {/* wheels */}
    {[210, 546].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="256" r="44" fill="#1e293b" />
        <circle cx={cx} cy="256" r="24" fill="#cbd5e1" />
        <circle cx={cx} cy="256" r="8" fill="#3eb846" />
      </g>
    ))}
  </svg>
);

const FleetCar = () => {
  const [photo, setPhoto] = useState(false);

  return (
    <div className="fleet-car">
      <img
        src="/img/hero-car.png"
        alt=""
        aria-hidden="true"
        className="fleet-car__photo"
        hidden={!photo}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth > 1) setPhoto(true);
        }}
        onError={() => setPhoto(false)}
      />
      {!photo && <CarIllustration />}
    </div>
  );
};

export default FleetCar;
