import { useTranslation } from "react-i18next";
import { Container } from "react-bootstrap";
import { JsonLd, PageHeader, Spacer } from "../../../components";
import { usePageMeta } from "../../../hooks/use-page-meta";
import { breadcrumbLd, faqLd } from "../../../utils/seo";
import "./style.scss";

const FaqPage = () => {
  const { t } = useTranslation("faq");
  const { t: tCommon } = useTranslation("common");

  // No explicit `canonical` — the hook derives it from the URL itself, so
  // /en/sss gets its own canonical instead of pointing back at /sss (that
  // hardcoded override was wrong for the English page — see privacy-policy).
  usePageMeta({
    title: t("seoTitle"),
    description: t("seoDescription"),
  });

  const items = t("items", { returnObjects: true });
  const list = Array.isArray(items) ? items : [];

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
      {list.length > 0 && <JsonLd id="ld-faq" data={faqLd(list)} />}

      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <Container className="faq">
        <p className="faq__intro">{t("intro")}</p>

        <div className="faq__list">
          {list.map((item, i) => (
            <section key={i} className="faq__item">
              <h2>{item.q}</h2>
              <p>{item.a}</p>
            </section>
          ))}
        </div>
      </Container>
      <Spacer />
    </>
  );
};

export default FaqPage;
