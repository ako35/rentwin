import { useState } from "react";

// Right-column hero visual.
//
// Preferred: drop a background-removed studio photo of a REAL fleet car
// (Clio / Egea / Doblo — passenger + light-commercial composite is fine) at
// public/img/hero-car.png and it is picked up automatically, with a soft
// ground shadow applied in CSS (.fleet-car__photo).
//
// Until that asset exists a restrained single-tone silhouette stands in — it
// reads as a placeholder mark, not as an attempt at a real photo, so the hero
// never ships a luxury stock image that misrepresents the fleet.
const CarMark = () => (
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
      <radialGradient id="fc-glow" cx="50%" cy="44%" r="55%">
        <stop offset="0" stopColor="#3eb846" stopOpacity="0.16" />
        <stop offset="1" stopColor="#3eb846" stopOpacity="0" />
      </radialGradient>
    </defs>

    <ellipse cx="360" cy="128" rx="350" ry="126" fill="url(#fc-glow)" />
    <ellipse cx="366" cy="224" rx="238" ry="13" fill="#0f172a" opacity="0.12" />

    {/* one clean silhouette — no window/pillar details that can misalign */}
    <path
      d="M60 196
         Q54 168 74 160
         C112 150 150 150 176 148
         L214 112
         Q232 102 272 102
         L404 102
         Q446 104 470 132
         L512 154
         C556 148 604 148 642 158
         Q672 165 674 186
         Q676 194 668 196
         L60 196 Z"
      fill="url(#fc-body)"
    />
    <rect x="646" y="168" width="24" height="12" rx="4" fill="#3eb846" opacity="0.85" />

    {[176, 556].map((cx) => (
      <g key={cx} transform={`translate(${cx} 196)`}>
        <circle r="34" fill="#eef2f7" />
        <circle r="30" fill="#1e293b" />
        <circle r="14" fill="#cbd5e1" />
        <circle r="5" fill="#3eb846" />
      </g>
    ))}
  </svg>
);

const FleetCar = () => {
  const [photo, setPhoto] = useState(false);

  return (
    <div className={`fleet-car${photo ? " fleet-car--photo" : ""}`}>
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
      {!photo && <CarMark />}
    </div>
  );
};

export default FleetCar;
