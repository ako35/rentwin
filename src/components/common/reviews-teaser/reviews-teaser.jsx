import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { JsonLd, StarRating, AppLink } from "../../";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { autoRentalLd } from "../../../utils/seo";
import "./reviews-teaser.scss";

const { routes } = constants;

// Homepage-only. Renders the site's single <JsonLd id="ld-autorental"> node
// for hydrated (non-bot) browsers — mirrors what the bot prerender emits for
// "/" (backend/src/lib/seo-ld.js) — plus a small visible teaser once at
// least one review is approved. `data === null` (not yet loaded) still lets
// the JsonLd mount with the base Organization node once the fetch resolves.
const ReviewsTeaser = () => {
  const { t } = useTranslation("reviews");
  const [data, setData] = useState(null);

  useEffect(() => {
    services.review
      .getReviews(10)
      .then(setData)
      .catch(() => setData({ items: [], count: 0, average: 0 }));
  }, []);

  if (!data) return null;

  return (
    <>
      <JsonLd
        id="ld-autorental"
        data={autoRentalLd({
          reviewSummary: data.count ? { count: data.count, average: data.average } : null,
          reviews: data.items,
        })}
      />
      {data.count > 0 && (
        <section className="reviews-teaser">
          <StarRating value={Math.round(data.average)} />
          <span className="reviews-teaser__text">{t("summary", { count: data.count, average: data.average })}</span>
          <AppLink to={routes.reviews} className="reviews-teaser__link">
            {t("teaserCta")}
          </AppLink>
        </section>
      )}
    </>
  );
};

export default ReviewsTeaser;
