import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsArrowRight, BsCalendarEvent, BsTag } from "react-icons/bs";
import "./campaign-card.scss";

const API_URL = import.meta.env.VITE_APP_API_URL;

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
          <img src={`${API_URL}/files/display/${imageId}`} alt={title} loading="lazy" />
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
            <Link to={ctaUrl} className="btn btn-primary btn-sm campaign-card__cta">
              {ctaText} <BsArrowRight />
            </Link>
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
