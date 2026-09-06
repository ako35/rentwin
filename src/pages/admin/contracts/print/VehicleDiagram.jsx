import { useTranslation } from "react-i18next";

// Four compact line-art views for the handover report, printed blank so staff
// mark existing damage by hand: front, right side, rear, left side.
const VehicleDiagram = () => {
  const { t } = useTranslation("admin");
  const d = (key) => t(`reservations.contract.print.tutanak.${key}`);

  const Face = ({ rear }) => (
    <svg viewBox="0 0 120 100" role="img">
      <path
        d={
          rear
            ? "M18 74 C18 50 24 38 38 34 L82 34 C96 38 102 50 102 74 L102 82 L18 82 Z"
            : "M18 74 C18 48 26 36 38 32 L82 32 C94 36 102 48 102 74 L102 82 L18 82 Z"
        }
        fill="none"
        stroke="#000"
        strokeWidth="1.8"
      />
      <path d="M34 38 L86 38 L92 58 L28 58 Z" fill="none" stroke="#000" strokeWidth="1.1" />
      <rect x="26" y="62" width="14" height="8" fill="none" stroke="#000" strokeWidth="1.1" />
      <rect x="80" y="62" width="14" height="8" fill="none" stroke="#000" strokeWidth="1.1" />
      <circle cx="34" cy="88" r="7" fill="none" stroke="#000" strokeWidth="1.4" />
      <circle cx="86" cy="88" r="7" fill="none" stroke="#000" strokeWidth="1.4" />
    </svg>
  );

  const Side = ({ flip }) => (
    <svg viewBox="0 0 180 100" role="img" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      {/* body: front to the right */}
      <path
        d="M10 66 L10 54 Q10 46 22 44 L52 40 Q66 22 96 22 L138 22 Q160 24 168 44 L170 46 Q174 48 174 56 L174 66 Q174 72 166 72 L150 72 A12 12 0 0 0 126 72 L58 72 A12 12 0 0 0 34 72 L18 72 Q10 72 10 66 Z"
        fill="none"
        stroke="#000"
        strokeWidth="1.8"
      />
      {/* greenhouse / windows */}
      <path d="M56 40 Q68 26 92 26 L118 26 L118 42 L52 42 Z" fill="none" stroke="#000" strokeWidth="1.1" />
      <path d="M122 26 L138 26 Q152 26 160 42 L122 42 Z" fill="none" stroke="#000" strokeWidth="1.1" />
      <line x1="118" y1="26" x2="118" y2="42" stroke="#000" strokeWidth="1" />
      {/* door line */}
      <line x1="88" y1="42" x2="88" y2="60" stroke="#000" strokeWidth="1" />
      {/* wheels */}
      <circle cx="46" cy="72" r="12" fill="none" stroke="#000" strokeWidth="1.6" />
      <circle cx="138" cy="72" r="12" fill="none" stroke="#000" strokeWidth="1.6" />
    </svg>
  );

  return (
    <div className="cprint-diagram">
      <div className="cprint-diagram__grid">
        <figure>
          <Face />
          <figcaption>{d("diagramFront")}</figcaption>
        </figure>
        <figure className="cprint-diagram__wide">
          <Side />
          <figcaption>{d("diagramRight")}</figcaption>
        </figure>
        <figure>
          <Face rear />
          <figcaption>{d("diagramRear")}</figcaption>
        </figure>
        <figure className="cprint-diagram__wide">
          <Side flip />
          <figcaption>{d("diagramLeft")}</figcaption>
        </figure>
      </div>
      <p className="cprint-diagram__legend">{d("diagramLegend")}</p>
    </div>
  );
};

export default VehicleDiagram;
