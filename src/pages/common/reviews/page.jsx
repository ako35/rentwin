import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { JsonLd, Loading, PageHeader, ReviewCard, ReviewForm, Spacer } from "../../../components";
import { usePageMeta } from "../../../hooks/use-page-meta";
import { autoRentalLd, breadcrumbLd } from "../../../utils/seo";
import { services } from "../../../services";
import "./style.scss";

const EMPTY = { items: [], count: 0, average: 0 };

const ReviewsPage = () => {
  const { t } = useTranslation("reviews");
  const { t: tCommon } = useTranslation("common");
  usePageMeta(t("seoTitle"), t("seoDescription"));

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(EMPTY);

  const load = () => {
    services.review
      .getReviews()
      .then((res) => setData(res || EMPTY))
      .catch(() => setData(EMPTY))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
      <JsonLd
        id="ld-autorental"
        data={autoRentalLd({
          reviewSummary: data.count ? { count: data.count, average: data.average } : null,
          reviews: data.items.slice(0, 10),
        })}
      />
      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <Container className="reviews-page">
        <p className="reviews-page__intro">{t("intro")}</p>
        {data.count > 0 && (
          <p className="reviews-page__summary">{t("summary", { count: data.count, average: data.average })}</p>
        )}

        <div className="reviews-page__layout">
          <div className="reviews-page__list">
            {loading ? (
              <Loading height={300} />
            ) : data.items.length === 0 ? (
              <p className="reviews-page__empty">{t("empty")}</p>
            ) : (
              data.items.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </div>

          <div className="reviews-page__form">
            <h2>{t("form.heading")}</h2>
            <ReviewForm />
          </div>
        </div>
      </Container>
      <Spacer />
    </>
  );
};

export default ReviewsPage;
