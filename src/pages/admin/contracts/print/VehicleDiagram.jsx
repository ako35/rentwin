import { useTranslation } from "react-i18next";

// Clean line-art vehicle views for the handover report, printed blank so staff
// circle existing damage by hand and note the code (Ç / G / K / E). One large
// plan view on top, then front, both flanks and rear beneath it.

const LINE = {
  fill: "none",
  stroke: "#111",
  strokeWidth: 2,
  strokeLinejoin: "round",
  strokeLinecap: "round",
};
const BODY = { ...LINE, fill: "#fff" };

const TopView = () => (
  <svg viewBox="0 0 268 116" role="img">
    <path
      d="M20 58 C20 42 27 33 43 29 C74 21 112 20 150 20 C196 20 222 24 238 32 C248 37 252 47 252 58 C252 69 248 79 238 84 C222 92 196 96 150 96 C112 96 74 95 43 87 C27 83 20 74 20 58 Z"
      {...BODY}
    />
    {/* nose marker */}
    <path d="M15 58 L3 49 L3 67 Z" fill="#111" stroke="none" />
    {/* greenhouse: windshield / roof / backlight */}
    <path
      d="M112 31 L190 31 Q200 33 200 46 L200 70 Q200 83 190 85 L112 85 Q106 78 106 58 Q106 38 112 31 Z"
      {...LINE}
      strokeWidth="1.7"
    />
    <path d="M128 31 L128 85 M180 31 L180 85" {...LINE} strokeWidth="1.4" />
    {/* door cuts on both flanks */}
    <path
      d="M114 20 L114 31 M146 19 L146 30 M178 20 L178 31 M114 96 L114 85 M146 97 L146 86 M178 96 L178 85"
      {...LINE}
      strokeWidth="1.4"
    />
    {/* wheels */}
    <rect x="41" y="12" width="27" height="12" rx="3" {...LINE} strokeWidth="1.6" />
    <rect x="196" y="12" width="27" height="12" rx="3" {...LINE} strokeWidth="1.6" />
    <rect x="41" y="92" width="27" height="12" rx="3" {...LINE} strokeWidth="1.6" />
    <rect x="196" y="92" width="27" height="12" rx="3" {...LINE} strokeWidth="1.6" />
  </svg>
);

const FrontView = () => (
  <svg viewBox="0 0 132 96" role="img">
    <path
      d="M16 82 L16 60 C16 40 24 30 40 27 L92 27 C108 30 116 40 116 60 L116 82 Z"
      {...BODY}
    />
    <path d="M42 30 L90 30 L98 52 L34 52 Z" {...LINE} />
    <path d="M20 58 L112 58" {...LINE} strokeWidth="1.3" />
    <path d="M22 60 L46 60 L44 69 L22 69 Z" {...LINE} strokeWidth="1.4" />
    <path d="M110 60 L86 60 L88 69 L110 69 Z" {...LINE} strokeWidth="1.4" />
    <rect x="52" y="60" width="28" height="8" rx="1.5" {...LINE} strokeWidth="1.3" />
    <circle cx="66" cy="64" r="2.2" {...LINE} strokeWidth="1.3" />
    <path d="M18 73 L114 73" {...LINE} strokeWidth="1.3" />
    <rect x="52" y="74" width="28" height="7" {...LINE} strokeWidth="1.3" />
    <path d="M40 50 L52 36 M58 50 L70 36" {...LINE} strokeWidth="1.1" />
    <path d="M17 43 L5 39 L5 51 L17 53 Z M115 43 L127 39 L127 51 L115 53 Z" {...LINE} strokeWidth="1.3" />
    <rect x="18" y="80" width="22" height="8" rx="2" {...LINE} strokeWidth="1.6" />
    <rect x="92" y="80" width="22" height="8" rx="2" {...LINE} strokeWidth="1.6" />
  </svg>
);

const RearView = () => (
  <svg viewBox="0 0 132 96" role="img">
    <path
      d="M16 82 L16 60 C16 40 24 30 40 27 L92 27 C108 30 116 40 116 60 L116 82 Z"
      {...BODY}
    />
    <path d="M42 30 L90 30 L98 52 L34 52 Z" {...LINE} />
    <rect x="58" y="27" width="16" height="3.5" {...LINE} strokeWidth="1.1" />
    <path d="M18 52 L46 52 L46 64 L18 64 Z" {...LINE} strokeWidth="1.4" />
    <path d="M114 52 L86 52 L86 64 L114 64 Z" {...LINE} strokeWidth="1.4" />
    <path d="M34 52 L98 52 M24 66 L108 66" {...LINE} strokeWidth="1.3" />
    <rect x="50" y="55" width="32" height="9" {...LINE} strokeWidth="1.3" />
    <path d="M18 73 L114 73" {...LINE} strokeWidth="1.3" />
    <circle cx="98" cy="79" r="2.6" {...LINE} strokeWidth="1.3" />
    <path d="M60 50 L52 38" {...LINE} strokeWidth="1.1" />
    <rect x="18" y="80" width="22" height="8" rx="2" {...LINE} strokeWidth="1.6" />
    <rect x="92" y="80" width="22" height="8" rx="2" {...LINE} strokeWidth="1.6" />
  </svg>
);

const SideView = ({ flip }) => (
  <svg
    viewBox="0 0 232 96"
    role="img"
    style={flip ? { transform: "scaleX(-1)" } : undefined}
  >
    {/* wheels sit behind the body so the arches read as cut-outs */}
    <circle cx="52" cy="70" r="15" {...LINE} strokeWidth="1.7" />
    <circle cx="182" cy="70" r="15" {...LINE} strokeWidth="1.7" />
    <path
      d="M12 68 L12 52 Q12 44 28 42 L58 38 Q76 17 116 17 L160 17 Q198 19 210 42 L216 44 Q222 46 222 55 L222 64 Q222 68 214 68 Z"
      {...BODY}
    />
    <circle cx="52" cy="70" r="6" {...LINE} strokeWidth="1.5" />
    <circle cx="182" cy="70" r="6" {...LINE} strokeWidth="1.5" />
    {/* greenhouse */}
    <path d="M62 40 L66 26 Q68 22 76 22 L150 22 Q178 24 196 40 Z" {...LINE} strokeWidth="1.5" />
    <path d="M104 22 L104 40 M150 22 L150 40" {...LINE} strokeWidth="1.3" />
    {/* doors */}
    <path d="M88 40 L88 62 M126 40 L126 62" {...LINE} strokeWidth="1.3" />
    <rect x="94" y="45" width="11" height="3" rx="1.5" {...LINE} strokeWidth="1.2" />
    <rect x="112" y="45" width="11" height="3" rx="1.5" {...LINE} strokeWidth="1.2" />
    {/* wing mirror at the A-pillar */}
    <path d="M182 39 Q190 37 191 42 Q190 47 182 45 Z" {...LINE} strokeWidth="1.3" />
    {/* lamps + trim */}
    <path d="M210 45 L221 47 L221 55 L211 56 Z" {...LINE} strokeWidth="1.3" />
    <rect x="12" y="46" width="6" height="12" rx="1" {...LINE} strokeWidth="1.3" />
    <path d="M40 64 L196 64" {...LINE} strokeWidth="1.2" />
    <circle cx="30" cy="52" r="3.4" {...LINE} strokeWidth="1.2" />
  </svg>
);

const VehicleDiagram = () => {
  const { t } = useTranslation("admin");
  const d = (key) => t(`reservations.contract.print.tutanak.${key}`);

  return (
    <div className="cprint-diagram">
      <figure className="cprint-diagram__top">
        <TopView />
        <figcaption>{d("diagramTop")}</figcaption>
      </figure>
      <div className="cprint-diagram__grid">
        <figure>
          <FrontView />
          <figcaption>{d("diagramFront")}</figcaption>
        </figure>
        <figure>
          <SideView />
          <figcaption>{d("diagramLeft")}</figcaption>
        </figure>
        <figure>
          <SideView flip />
          <figcaption>{d("diagramRight")}</figcaption>
        </figure>
        <figure>
          <RearView />
          <figcaption>{d("diagramRear")}</figcaption>
        </figure>
      </div>
      <p className="cprint-diagram__legend">{d("diagramLegend")}</p>
    </div>
  );
};

export default VehicleDiagram;
