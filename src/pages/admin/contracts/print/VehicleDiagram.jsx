import { useTranslation } from "react-i18next";

// Line-art car views for the handover report — printed blank so staff mark
// existing damage by hand. Large top view + smaller front / rear.
const VehicleDiagram = () => {
  const { t } = useTranslation("admin");
  const d = (key) => t(`reservations.contract.print.tutanak.${key}`);

  return (
    <div className="cprint-diagram">
      <figure className="cprint-diagram__top">
        <svg viewBox="0 0 360 150" role="img" aria-label={d("diagramTop")}>
          {/* body — front at the left, rounded corners */}
          <path
            d="M50 22 L310 22 Q346 22 346 58 L346 92 Q346 128 310 128 L50 128 Q14 128 14 92 L14 58 Q14 22 50 22 Z"
            fill="none"
            stroke="#000"
            strokeWidth="2"
          />
          {/* front bumper */}
          <path d="M14 62 Q22 58 30 62 L30 88 Q22 92 14 88" fill="none" stroke="#000" strokeWidth="1.2" />
          {/* rear bumper */}
          <path d="M346 62 Q338 58 330 62 L330 88 Q338 92 346 88" fill="none" stroke="#000" strokeWidth="1.2" />
          {/* hood line */}
          <line x1="70" y1="26" x2="70" y2="124" stroke="#000" strokeWidth="1.2" />
          {/* windshield */}
          <path d="M70 40 L112 52 L112 98 L70 110 Z" fill="none" stroke="#000" strokeWidth="1.3" />
          {/* cabin roof panel */}
          <rect x="112" y="46" width="118" height="58" fill="none" stroke="#000" strokeWidth="1.4" />
          {/* rear window */}
          <path d="M272 40 L230 52 L230 98 L272 110 Z" fill="none" stroke="#000" strokeWidth="1.3" />
          {/* trunk line */}
          <line x1="272" y1="26" x2="272" y2="124" stroke="#000" strokeWidth="1.2" />
          {/* front/rear door split */}
          <line x1="171" y1="46" x2="171" y2="104" stroke="#000" strokeWidth="1" />
          {/* side mirrors */}
          <path d="M72 22 L64 10 L82 12 Z" fill="none" stroke="#000" strokeWidth="1.4" />
          <path d="M72 128 L64 140 L82 138 Z" fill="none" stroke="#000" strokeWidth="1.4" />
        </svg>
        <figcaption>{d("diagramTop")}</figcaption>
      </figure>

      <div className="cprint-diagram__ends">
        <figure>
          <svg viewBox="0 0 130 120" role="img" aria-label={d("diagramFront")}>
            <path d="M20 84 C20 56 28 42 40 38 L90 38 C102 42 110 56 110 84 L110 94 L20 94 Z" fill="none" stroke="#000" strokeWidth="2" />
            <path d="M38 42 L92 42 L98 66 L32 66 Z" fill="none" stroke="#000" strokeWidth="1.3" />
            <rect x="28" y="72" width="16" height="9" fill="none" stroke="#000" strokeWidth="1.2" />
            <rect x="86" y="72" width="16" height="9" fill="none" stroke="#000" strokeWidth="1.2" />
            <line x1="46" y1="88" x2="84" y2="88" stroke="#000" strokeWidth="1.2" />
            <circle cx="36" cy="100" r="8" fill="none" stroke="#000" strokeWidth="1.6" />
            <circle cx="94" cy="100" r="8" fill="none" stroke="#000" strokeWidth="1.6" />
          </svg>
          <figcaption>{d("diagramFront")}</figcaption>
        </figure>

        <figure>
          <svg viewBox="0 0 130 120" role="img" aria-label={d("diagramRear")}>
            <path d="M20 84 C20 58 26 44 40 40 L90 40 C104 44 110 58 110 84 L110 94 L20 94 Z" fill="none" stroke="#000" strokeWidth="2" />
            <path d="M34 44 L96 44 L98 62 L32 62 Z" fill="none" stroke="#000" strokeWidth="1.3" />
            <rect x="26" y="68" width="18" height="11" fill="none" stroke="#000" strokeWidth="1.2" />
            <rect x="86" y="68" width="18" height="11" fill="none" stroke="#000" strokeWidth="1.2" />
            <circle cx="36" cy="100" r="8" fill="none" stroke="#000" strokeWidth="1.6" />
            <circle cx="94" cy="100" r="8" fill="none" stroke="#000" strokeWidth="1.6" />
          </svg>
          <figcaption>{d("diagramRear")}</figcaption>
        </figure>
      </div>

      <p className="cprint-diagram__legend">{d("diagramLegend")}</p>
    </div>
  );
};

export default VehicleDiagram;
