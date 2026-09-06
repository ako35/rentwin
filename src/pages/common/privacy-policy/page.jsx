import { useTranslation } from "react-i18next";
import { Container } from "react-bootstrap";
import { PageHeader, Spacer } from "../../../components";
import { usePageMeta } from "../../../hooks/use-page-meta";

const PrivacyPolicyPage = () => {
  const { t } = useTranslation("common");
  // No published policy text yet — keep it out of the index until it has content.
  usePageMeta({ title: t("privacyPolicy.title"), noindex: true });

  return (
    <>
      <PageHeader title={t("privacyPolicy.title")} />
      <Spacer />
      <Container>
        <p>{t("privacyPolicy.placeholder")}</p>
      </Container>
      <Spacer />
    </>
  );
};

export default PrivacyPolicyPage;
