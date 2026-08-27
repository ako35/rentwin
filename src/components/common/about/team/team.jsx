import { Col, Container, Row } from "react-bootstrap"
import { useTranslation } from "react-i18next"
import SectionHeader from "../../section-header/section-header"
import Spacer from "../../spacer/spacer"
import TeamMember from "./member/member"

const Team = () => {
  const { t } = useTranslation("home");
  const teamMembers = t("team", { returnObjects: true });

  return (
    <div className="team">
      <SectionHeader title1={t("sections.team.title1")} title2={t("sections.team.title2")} />
      <Spacer />
      <Container>
        <Row className='gy-5'>
          {
            teamMembers.map(item => (
              <Col lg={4} key={item.id}>
                <TeamMember {...item} />
              </Col>
            ))
          }
        </Row>
      </Container>
    </div>
  )
}

export default Team