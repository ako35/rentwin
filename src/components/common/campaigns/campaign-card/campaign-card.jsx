import { useTranslation } from "react-i18next";
import { BsArrowRight, BsCalendarEvent, BsTag } from "react-icons/bs";
import AppLink from "../../app-link/app-link";
import { responsiveImage } from "../../../../utils/image-url";
import "./campaign-card.scss";

// Posters are shown whole at card width: one column on phones, 2–3 per row above.
const POSTER_IMAGE = {
  widths: [480, 640, 960, 1280],
  fallback: 640,
  sizes: "(max-width: 576px) 92vw, (max-width: 992px) 46vw, 380px",
};

const CampaignCard = ({ campaign, compact = false }) => {
  const { t, i18n } = useTranslation("campaigns");
  const locale = i18n.language === "en" ? "en-GB" : "tr-TR";
  const fmt = (value) => new Date(value).toLocaleDateString(locale);

  const { title, description, imageId, ctaLabel, ctaUrl, startsAt, endsAt } = campaign;

  let validity = "";
  if (startsAt && endsAt) validity = t("validBetween", { start: fmt(startsAt), end: fmt(endsAt) });
  else if (endsAt) validity = t("validUntil", { date: fmt(endsAt) });

  const isInternal = ctaUrl && ctaUrl.startsWith("/");
  const ctaText = ctaLabel || t("cta");

  return (
    <article className={`campaign-card${compact ? " campaign-card--compact" : ""}`}>
      <div className={`campaign-card__media${imageId ? "" : " campaign-card__media--empty"}`}>
        {imageId ? (
          <img {...responsiveImage(imageId, POSTER_IMAGE)} alt={title} loading="lazy" decoding="async" />
        ) : (
          <BsTag />
        )}
      </div>
      <div className="campaign-card__body">
        <h3 className="campaign-card__title">{title}</h3>
        {validity && (
          <p className="campaign-card__validity">
            <BsCalendarEvent /> {validity}
          </p>
        )}
        <p className="campaign-card__desc">{description}</p>
        {ctaUrl &&
          (isInternal ? (
            <AppLink to={ctaUrl} className="btn btn-primary btn-sm campaign-card__cta">
              {ctaText} <BsArrowRight />
            </AppLink>
          ) : (
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm campaign-card__cta"
            >
              {ctaText} <BsArrowRight />
            </a>
          ))}
      </div>
    </article>
  );
};

export default CampaignCard;
