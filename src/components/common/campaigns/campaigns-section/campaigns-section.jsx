import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { BsArrowRight } from "react-icons/bs";
import { CampaignCard, SectionHeader, Spacer } from "../../../";
import { services } from "../../../../services";
import { constants } from "../../../../constants";
import "./campaigns-section.scss";

const { routes } = constants;

const CampaignsSection = () => {
  const { t } = useTranslation("home");
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    services.campaign
      .getCampaigns()
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoaded(true));
  }, []);

  // Nothing to show → render no band at all (don't leave an empty section).
  if (!loaded || campaigns.length === 0) return null;

  return (
    <>
      <div className="campaigns-section">
        <SectionHeader
          title1={t("sections.campaigns.title1")}
          title2={t("sections.campaigns.title2")}
          desc={t("sections.campaigns.desc")}
        />
        <Spacer />
        <Container>
          <div className="campaigns-section__grid">
            {campaigns.slice(0, 3).map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} compact />
            ))}
          </div>
          <div className="campaigns-section__all">
            <Link to={routes.campaigns}>
              {t("sections.campaigns.seeAll")} <BsArrowRight />
            </Link>
          </div>
        </Container>
      </div>
      <Spacer />
    </>
  );
};

export default CampaignsSection;
