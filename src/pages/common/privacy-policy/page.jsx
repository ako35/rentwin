import { useTranslation } from "react-i18next";
import { Container } from "react-bootstrap";
import { PageHeader, Spacer } from "../../../components";
import { usePageMeta } from "../../../hooks/use-page-meta";
import "./style.scss";

const PrivacyPolicyPage = () => {
  const { t } = useTranslation("common");
  usePageMeta({
    title: t("privacyPolicy.title"),
    description: t("privacyPolicy.metaDescription"),
    canonical: "https://rentwin.com.tr/privacy-policy",
  });

  const sections = t("privacyPolicy.sections", { returnObjects: true });

  return (
    <>
      <PageHeader title={t("privacyPolicy.title")} />
      <Spacer />
      <Container className="privacy-policy">
        <p className="privacy-policy__intro">{t("privacyPolicy.intro")}</p>
        <p className="privacy-policy__updated">{t("privacyPolicy.updated")}</p>

        {Array.isArray(sections) &&
          sections.map((section, i) => (
            <section key={i} className="privacy-policy__section">
              <h2>{section.heading}</h2>
              {(section.paragraphs || []).map((paragraph, j) => (
                <p key={j}>{paragraph}</p>
              ))}
              {Array.isArray(section.list) && (
                <ul>
                  {section.list.map((item, k) => {
                    const splitAt = item.indexOf(" — ");
                    if (splitAt === -1) return <li key={k}>{item}</li>;
                    return (
                      <li key={k}>
                        <strong>{item.slice(0, splitAt)}</strong>
                        {item.slice(splitAt)}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
      </Container>
      <Spacer />
    </>
  );
};

export default PrivacyPolicyPage;
