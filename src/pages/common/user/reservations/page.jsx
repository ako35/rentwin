import { Container, Row } from "react-bootstrap";
import {
  CustomPagination,
  PageHeader,
  SocialFollow,
  Spacer,
  UserReservationsTable,
} from "../../../../components";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { services } from "../../../../services";

const UserReservationsPage = () => {
  const { t } = useTranslation("user");
  // Set by the booking form: a customer who has just booked is the likeliest
  // to follow the Facebook page, so invite them once, above their list.
  const justBooked = Boolean(useLocation().state?.justBooked);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [paging, setPaging] = useState({});

  const loadData = async (page) => {
    try {
      const data = await services.reservation.getReservationsByPage(page);
      const {
        content,
        totalPages,
        pageable: { pageNumber },
      } = data;
      setReservations(content);
      setPaging({
        pageNumber,
        totalPages,
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(0);
  }, []);
  return (
    <>
      <PageHeader title={t("reservations.pageTitle")} />
      <Spacer />
      <Container>
        {justBooked && <SocialFollow context="booked" className="mb-4" />}
        <UserReservationsTable loading={loading} reservations={reservations} />
        {paging.totalPages > 1 && (
          <Row className="mt-5">
            <CustomPagination paging={paging} loadData={loadData} />
          </Row>
        )}
      </Container>
      <Spacer />
    </>
  );
};

export default UserReservationsPage;
