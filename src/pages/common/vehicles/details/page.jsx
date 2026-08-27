import { Col, Container, Row } from "react-bootstrap";
import {
  BookingForm,
  DetailsPanel,
  Loading,
  PageHeader,
  Spacer,
} from "../../../../components";
import { useEffect, useState } from "react";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { setVehicle } from "../../../../store";

const VehicleDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const { vehicleId } = useParams();
  const dispatch = useDispatch();
  const { t } = useTranslation("vehicles");

  const loadData = async () => {
    try {
      const data = await services.vehicle.getVehicleById(vehicleId);
      dispatch(setVehicle(data));
    } catch (error) {
      utils.functions.swalToast(
        t("loadError"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <PageHeader title={t("detailsPageTitle")} />
      <Spacer />
      <Container className="vehicle-details">
        <Row>
          {loading ? (
            <Loading height="500px" />
          ) : (
            <>
              <Col xl={8}>
                <DetailsPanel />
              </Col>
              <Col xl={4}>
                <BookingForm />
              </Col>
            </>
          )}
        </Row>
      </Container>
      <Spacer />
    </>
  );
};

export default VehicleDetailsPage;
