import { Container } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import SectionHeader from "../../section-header/section-header"
import Spacer from "../../spacer/spacer"
import TeamMember from "./member/member"
import "./team.scss"

const Team = () => {
  const { t } = useTranslation("home");
  const teamMembers = t("team", { returnObjects: true });

  return (
    <div className="team">
      <SectionHeader title1={t("sections.team.title1")} title2={t("sections.team.title2")} />
      <Spacer />
      <Container>
        <div className="team__grid">
          {teamMembers.map((item) => (
            <TeamMember key={item.id} {...item} />
          ))}
        </div>
      </Container>
    </div>
  )
}

export default Team
