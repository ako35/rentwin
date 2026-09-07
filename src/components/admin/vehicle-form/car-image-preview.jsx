import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Spinner } from "react-bootstrap";
import { BsStars } from "react-icons/bs";
import { utils } from "../../../utils";
import { buildCarImageUrl } from "./car-image-url";

// Live imagin.studio preview for the vehicle image column: as Marka / Model /
// Yıl / Renk change it re-points a plain <img> at imagin's CDN (no API call).
// "Bu görseli kullan" pulls the bytes into a File so it saves through the
// normal upload path.
const slug = (parts) =>
  parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "arac";

const CarImagePreview = ({ formik, onUse }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`vehicles.carImage.${key}`);

  const { brand, model, modelYear, color } = formik.values;

  // Debounce so a burst of keystrokes doesn't retarget the <img> on every one.
  const [debounced, setDebounced] = useState({ brand, model, modelYear, color });
  useEffect(() => {
    const id = setTimeout(() => setDebounced({ brand, model, modelYear, color }), 400);
    return () => clearTimeout(id);
  }, [brand, model, modelYear, color]);

  const url = useMemo(() => buildCarImageUrl(debounced), [debounced]);

  const [status, setStatus] = useState("idle"); // idle | loading | ok | error
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(url ? "loading" : "idle");
  }, [url]);

  const use = async () => {
    if (!url) return;
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (!blob.type.startsWith("image/") || blob.size < 1024) throw new Error("empty");
      const file = new File([blob], `${slug([brand, model, color])}.png`, {
        type: blob.type || "image/png",
      });
      onUse(URL.createObjectURL(blob), file);
      utils.functions.swalToast(c("used"), "success");
    } catch {
      utils.functions.swalToast(c("error"), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!url) {
    return <p className="vehicle-form__carimg-hint">{c("hint")}</p>;
  }

  return (
    <div className="vehicle-form__carimg">
      <div className="vehicle-form__carimg-frame">
        {status === "loading" && <Spinner animation="border" size="sm" />}
        {status === "error" && <span>{c("notFound")}</span>}
        <img
          src={url}
          alt={`${brand} ${model}`}
          hidden={status !== "ok"}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      </div>
      <Button
        type="button"
        variant="outline-secondary"
        size="sm"
        disabled={busy || status !== "ok"}
        onClick={use}
      >
        {busy ? <Spinner animation="border" size="sm" /> : <BsStars />} {c("use")}
      </Button>
    </div>
  );
};

export default CarImagePreview;
