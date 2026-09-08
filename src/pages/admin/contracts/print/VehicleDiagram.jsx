import { useTranslation } from "react-i18next";

// Blueprint-style vehicle views for the handover report, printed blank so staff
// circle existing damage by hand and note the code (Ç / G / K / E). Laid out as
// an orthographic cross: left flank on top, front · plan · rear across the
// middle, right flank on the bottom. `non-scaling-stroke` keeps every line the
// same hairline weight regardless of how big each view is drawn.

const S = {
  fill: "none",
  stroke: "#111",
  strokeWidth: 1.6,
  strokeLinejoin: "round",
  strokeLinecap: "round",
  vectorEffect: "non-scaling-stroke",
};
const F = { ...S, fill: "#fff" };
const T = { ...S, strokeWidth: 1.1 };

/* ---- plan / top-down, nose to the left ---- */
const PlanView = () => (
  <svg viewBox="-40 -28 552 256" role="img">
    <path
      d="M92 15 C165 12 262 12 330 15
         C388 17 424 34 440 66 C449 82 449 118 440 134 C424 166 388 183 330 185
         C262 188 165 188 92 185 C54 184 27 167 16 137 C9 121 9 79 16 63
         C27 33 54 16 92 15 Z"
      {...F}
      strokeWidth="1.9"
    />
    <path d="M13 100 L-5 84 L-5 116 Z" fill="#111" stroke="none" />
    {/* bumper wrap hints */}
    <path d="M19 74 Q12 100 19 126 M433 72 Q441 100 433 128" {...T} />
    {/* door seams — masked by the white greenhouse */}
    <path d="M246 15 L246 185 M302 15 L302 185" {...T} />
    {/* greenhouse: one pod → windscreen | roof | backlight */}
    <rect x="170" y="44" width="182" height="112" rx="22" {...F} strokeWidth="1.7" />
    <path d="M204 45 Q199 100 204 155 M318 45 Q323 100 318 155" {...T} />
    {/* wheels */}
    <rect x="52" y="2" width="56" height="20" rx="6" {...F} />
    <rect x="338" y="2" width="56" height="20" rx="6" {...F} />
    <rect x="52" y="178" width="56" height="20" rx="6" {...F} />
    <rect x="338" y="178" width="56" height="20" rx="6" {...F} />
  </svg>
);

/* ---- flank, nose to the right (car's LEFT side); flip for the right side ---- */
const SideView = ({ flip }) => (
  <svg viewBox="-28 -24 508 212" role="img" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    {/* body with wheel-arch cut-outs */}
    <path
      d="M8 126 L8 92 Q10 80 26 76 L92 66 Q118 24 190 22 L292 22
         Q366 24 392 66 L430 74 Q448 78 450 96 L450 118 Q450 128 438 128
         L398 128 A36 36 0 0 0 326 128 L138 128 A36 36 0 0 0 66 128 L8 126 Z"
      {...F}
      strokeWidth="1.9"
    />
    {/* wheels */}
    <circle cx="102" cy="126" r="34" {...F} />
    <circle cx="362" cy="126" r="34" {...F} />
    <circle cx="102" cy="126" r="13" {...S} />
    <circle cx="362" cy="126" r="13" {...S} />
    {/* greenhouse */}
    <path d="M100 66 L110 30 Q113 24 124 24 L288 24 Q350 26 380 66 Z" {...F} strokeWidth="1.7" />
    <path d="M178 24 L178 66 M258 24 L258 66" {...T} />
    {/* doors + handles */}
    <path d="M150 66 L150 120" {...T} />
    <rect x="158" y="80" width="26" height="7" rx="3.5" {...S} />
    <rect x="206" y="80" width="26" height="7" rx="3.5" {...S} />
    {/* rocker · lamps · mirror */}
    <path d="M70 122 L392 122" {...T} />
    <path d="M420 78 L450 84 L450 104 L422 104 Z" {...S} />
    <rect x="8" y="86" width="12" height="24" rx="2" {...S} />
    <path d="M356 62 Q378 58 380 70 Q378 82 356 74 Z" {...F} />
  </svg>
);

const FrontView = () => (
  <svg viewBox="-24 -20 250 210" role="img">
    <path d="M16 152 L16 84 C16 44 30 30 54 27 L148 27 C172 30 186 44 186 84 L186 152 Z" {...F} strokeWidth="1.9" />
    <path d="M54 32 L148 32 L158 78 L44 78 Z" {...S} strokeWidth="1.7" />
    <path d="M22 92 L180 92" {...T} />
    <rect x="24" y="96" width="42" height="16" rx="4" {...S} />
    <rect x="136" y="96" width="42" height="16" rx="4" {...S} />
    <rect x="70" y="97" width="62" height="15" rx="3" {...S} />
    <path d="M20 122 L182 122" {...T} />
    <rect x="80" y="124" width="42" height="16" rx="2" {...S} />
    <path d="M16 62 L3 56 L3 80 L16 82 Z" {...F} />
    <path d="M186 62 L199 56 L199 80 L186 82 Z" {...F} />
    <rect x="22" y="142" width="34" height="16" rx="4" {...F} />
    <rect x="146" y="142" width="34" height="16" rx="4" {...F} />
  </svg>
);

const RearView = () => (
  <svg viewBox="-24 -20 250 210" role="img">
    <path d="M16 152 L16 84 C16 44 30 30 54 27 L148 27 C172 30 186 44 186 84 L186 152 Z" {...F} strokeWidth="1.9" />
    <path d="M54 32 L148 32 L158 78 L44 78 Z" {...S} strokeWidth="1.7" />
    <path d="M44 78 L158 78 M26 102 L176 102" {...T} />
    <rect x="22" y="88" width="48" height="20" rx="3" {...S} />
    <rect x="132" y="88" width="48" height="20" rx="3" {...S} />
    <path d="M20 122 L182 122" {...T} />
    <rect x="80" y="124" width="42" height="16" rx="2" {...S} />
    <path d="M16 62 L3 56 L3 80 L16 82 Z" {...F} />
    <path d="M186 62 L199 56 L199 80 L186 82 Z" {...F} />
    <rect x="22" y="142" width="34" height="16" rx="4" {...F} />
    <rect x="146" y="142" width="34" height="16" rx="4" {...F} />
  </svg>
);

const VehicleDiagram = () => {
  const { t } = useTranslation("admin");
  const d = (key) => t(`reservations.contract.print.tutanak.${key}`);

  return (
    <div className="cprint-diagram">
      <div className="cprint-diagram__cross">
        <figure className="cprint-diagram__side cprint-diagram__side--top">
          <SideView />
          <figcaption>{d("diagramLeft")}</figcaption>
        </figure>
        <figure className="cprint-diagram__front">
          <FrontView />
          <figcaption>{d("diagramFront")}</figcaption>
        </figure>
        <figure className="cprint-diagram__plan">
          <PlanView />
        </figure>
        <figure className="cprint-diagram__rear">
          <RearView />
          <figcaption>{d("diagramRear")}</figcaption>
        </figure>
        <figure className="cprint-diagram__side cprint-diagram__side--bottom">
          <SideView flip />
          <figcaption>{d("diagramRight")}</figcaption>
        </figure>
      </div>
      <p className="cprint-diagram__legend">{d("diagramLegend")}</p>
    </div>
  );
};

export default VehicleDiagram;
