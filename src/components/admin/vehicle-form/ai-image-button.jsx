import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Spinner } from "react-bootstrap";
import { BsStars } from "react-icons/bs";
import { services } from "../../../services";
import { utils } from "../../../utils";

const slugify = (parts) =>
  parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "arac";

const dataUrlToFile = (dataUrl, name) => {
  const [head, b64] = dataUrl.split(",");
  const mime = (head.match(/data:(.*?);/) || [])[1] || "image/png";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: mime });
};

// "Yapay Zeka ile Görsel Oluştur": sends the identity fields (marka / model /
// yıl / renk) to Gemini, which renders a studio catalog photo of that vehicle.
// The result is handed back as (File, previewUrl) so the page can push it into
// the normal image-upload flow when the form is saved.
const AiImageButton = ({ formik, onImage, disabled }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`vehicles.aiImage.${key}`);
  const [loading, setLoading] = useState(false);

  const { brand, model, modelYear, color } = formik.values;

  const generate = async () => {
    if (!brand || !model) {
      utils.functions.swalToast(c("needBrandModel"), "warning");
      return;
    }
    setLoading(true);
    try {
      const { dataUrl } = await services.vehicle.generateVehicleImage({
        brand,
        model,
        modelYear,
        color,
      });
      const file = dataUrlToFile(dataUrl, `${slugify([brand, model, color])}.png`);
      onImage(file, dataUrl);
      utils.functions.swalToast(c("success"), "success");
    } catch (error) {
      const key = error?.response?.data?.code === "AI_IMAGE_QUOTA" ? "quota" : "error";
      utils.functions.swalToast(c(key), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline-secondary"
      size="sm"
      className="vehicle-form__ai-image-btn"
      disabled={disabled || loading}
      onClick={generate}
    >
      {loading ? (
        <Spinner animation="border" size="sm" className="me-1" />
      ) : (
        <BsStars className="me-1" />
      )}
      {loading ? c("generating") : c("button")}
    </Button>
  );
};

export default AiImageButton;
