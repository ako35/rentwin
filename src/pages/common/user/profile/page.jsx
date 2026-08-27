import { Col, Container, Row } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { PageHeader, Spacer, UserAvatar, UserPasswordForm, UserProfileForm } from "../../../../components";

const UserProfilePage = () => {
  const { t } = useTranslation("user");
  return (
    <>
      <PageHeader title={t("profile.pageTitle")} />
      <Spacer />
      <Container>
        <Row className="justify-content-center gap-5">
          <Col lg={2} className="text-center">
            <UserAvatar />
          </Col>
          <Col lg={4}>
            <UserProfileForm />
          </Col>
          <Col lg={4}>
            <UserPasswordForm />
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default UserProfilePage