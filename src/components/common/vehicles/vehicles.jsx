import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Col, Container, Row } from "react-bootstrap";
import { BsGeoAlt, BsXLg } from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { clearSearchCriteria } from "../../../store";
import SectionHeader from "../section-header/section-header";
import Loading from "../loading/loading";
import VehicleCard from "./vehicle-card/vehicle-card";
import CustomPagination from "../custom-pagination/custom-pagination";
import "./vehicles.scss";

const Vehicles = () => {
  const { t } = useTranslation("vehicles");
  const dispatch = useDispatch();
  const searchCriteria = useSelector((state) => state.reservation.searchCriteria);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [paging, setPaging] = useState({})

  const availability = searchCriteria
    ? {
        pickUpTime: utils.functions.combineDateAndTime(searchCriteria.pickUpDate, searchCriteria.pickUpTime),
        dropOffTime: utils.functions.combineDateAndTime(searchCriteria.dropOffDate, searchCriteria.dropOffTime),
      }
    : undefined;

  const loadData = async (page) => {
    setLoading(true);
    try {
      const vehiclesData = await services.vehicle.getVehiclesByPage(page, 6, "model", "ASC", availability);
      const { content, totalPages, pageable: { pageNumber}, } = vehiclesData;

      setVehicles(content);
      setPaging({
        pageNumber,
        totalPages
      })
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCriteria]);

  const fmt = (date, time) => moment(`${date} ${time}`).format("DD MMM YYYY HH:mm");

  return (
    <Container className="vehicles">
      {searchCriteria && (
        <div className="vehicles__search-summary">
          <div className="vehicles__search-summary-text">
            <span className="vehicles__search-summary-location">
              <BsGeoAlt /> {searchCriteria.pickUpLocation}
              {searchCriteria.dropOffLocation !== searchCriteria.pickUpLocation
                ? ` → ${searchCriteria.dropOffLocation}`
                : ""}
            </span>
            <span className="vehicles__search-summary-range">
              {t("searchSummary.range", {
                pickUp: fmt(searchCriteria.pickUpDate, searchCriteria.pickUpTime),
                dropOff: fmt(searchCriteria.dropOffDate, searchCriteria.dropOffTime),
              })}
            </span>
            <small>{t("searchSummary.hint")}</small>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => dispatch(clearSearchCriteria())}
          >
            <BsXLg /> {t("searchSummary.clear")}
          </Button>
        </div>
      )}
      <SectionHeader title1={t("sections.vehicleModels.title1")} title2={t("sections.vehicleModels.title2")} desc={t("sections.vehicleModels.desc")} />
      {
        loading ? <Loading height={500} /> :
        <>
          {vehicles && vehicles.length === 0 && (
            <p className="vehicles__empty">{t("searchSummary.noResults")}</p>
          )}
          <Row className="gy-4">
            {
              vehicles && vehicles.length > 0 && vehicles.map((item, index) => (
                <Col sm={6} lg={4} key={index}>
                  <VehicleCard {...item} />
                </Col>
              ))
            }
          </Row>
          {
            paging?.totalPages > 1 && (
              <Row className="mt-5">
                <CustomPagination loadData={loadData} paging={paging} />
              </Row>
            )
          }
        </>
      }
    </Container>
  )
}

export default Vehicles
