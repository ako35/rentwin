import { useTranslation } from "react-i18next";

// Vehicle views for the handover report, printed blank so staff circle existing
// damage by hand and note the code (Ç / G / K / E). One drawing per
// Vehicle.bodyType so the sheet actually resembles the car being handed over
// — a Transit çift kabin no longer gets a sedan outline. All sourced from
// Pixabay (Pixabay Content License — free for commercial use, no attribution
// required); BINEK is the original four-view "Technical car blueprint" (CC0,
// via Wikimedia Commons), the rest are single-view line drawings in a
// different style since no matching four-view set exists for them yet.
const DIAGRAM_BY_BODY_TYPE = {
  BINEK: "/img/arac-hasar-krokisi.png",
  SUV: "/img/arac-hasar-krokisi-suv.png",
  PANELVAN_MINIBUS: "/img/arac-hasar-krokisi-panelvan.png",
  KAMYONET: "/img/arac-hasar-krokisi-kamyonet.png",
};

const VehicleDiagram = ({ bodyType }) => {
  const { t } = useTranslation("admin");
  const d = (key) => t(`reservations.contract.print.tutanak.${key}`);
  const src = DIAGRAM_BY_BODY_TYPE[bodyType] || DIAGRAM_BY_BODY_TYPE.BINEK;

  return (
    <div className="cprint-diagram">
      <img src={src} alt={d("damageTitle")} className="cprint-diagram__sheet" />
      <p className="cprint-diagram__legend">{d("diagramLegend")}</p>
    </div>
  );
};

export default VehicleDiagram;
