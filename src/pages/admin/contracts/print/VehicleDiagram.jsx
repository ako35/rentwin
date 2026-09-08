import { useTranslation } from "react-i18next";

// Vehicle views for the handover report, printed blank so staff circle existing
// damage by hand and note the code (Ç / G / K / E). The drawing is a generic
// four-view car blueprint (front · rear · flank · plan) from Wikimedia Commons,
// released CC0 — no attribution required. Source file: "Technical car blueprint".
const VehicleDiagram = () => {
  const { t } = useTranslation("admin");
  const d = (key) => t(`reservations.contract.print.tutanak.${key}`);

  return (
    <div className="cprint-diagram">
      <img
        src="/img/arac-hasar-krokisi.png"
        alt={d("damageTitle")}
        className="cprint-diagram__sheet"
      />
      <p className="cprint-diagram__legend">{d("diagramLegend")}</p>
    </div>
  );
};

export default VehicleDiagram;
