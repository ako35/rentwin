import { useEffect, useState } from "react";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { CampaignCard, JsonLd, Loading, PageHeader, Spacer } from "../../../components";
import { usePageMeta } from "../../../hooks/use-page-meta";
import { breadcrumbLd } from "../../../utils/seo";
import { services } from "../../../services";
import "./style.scss";

const CampaignsPage = () => {
  const { t } = useTranslation("campaigns");
  const { t: tCommon } = useTranslation("common");
  usePageMeta(t("seoTitle"), t("seoDescription"));

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    services.campaign
      .getCampaigns()
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
      <PageHeader title={t("pageTitle")} />
      <Spacer />
      <Container className="campaigns-page">
        <p className="campaigns-page__intro">{t("intro")}</p>

        {loading ? (
          <Loading height={300} />
        ) : campaigns.length === 0 ? (
          <p className="campaigns-page__empty">{t("empty")}</p>
        ) : (
          <div className="campaigns-page__grid">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </Container>
      <Spacer />
    </>
  );
};

export default CampaignsPage;
