import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BsBoxArrowUpRight, BsGeoAltFill, BsMap } from "react-icons/bs";
import "./map-embed.scss";

// A Google Maps embed behind a click. The iframe pulls ~440 KB of Maps
// JavaScript, which the location and contact pages were loading for every
// visitor (mobile Lighthouse 2026-11-09). This placeholder keeps the same
// height (so nothing shifts when the map appears), shows the address, and
// loads the real map only when the visitor asks for it; the second button
// opens the place in Google Maps instead.
const MapEmbed = ({ title, src, openUrl, caption, height = 420 }) => {
  const { t } = useTranslation("common");
  const [shown, setShown] = useState(false);

  return (
    <div className="map-embed" style={{ height }}>
      {shown ? (
        <iframe
          title={title}
          src={src}
          allowFullScreen=""
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="map-embed__placeholder">
          <span className="map-embed__pin">
            <BsGeoAltFill />
          </span>
          {caption && <p className="map-embed__caption">{caption}</p>}
          <div className="map-embed__actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShown(true)}>
              <BsMap /> {t("map.show")}
            </button>
            {openUrl && (
              <a className="btn btn-outline-primary btn-sm" href={openUrl} target="_blank" rel="noopener noreferrer">
                <BsBoxArrowUpRight /> {t("map.open")}
              </a>
            )}
          </div>
          <p className="map-embed__hint">{t("map.hint")}</p>
        </div>
      )}
    </div>
  );
};

export default MapEmbed;
