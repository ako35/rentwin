import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Container } from "react-bootstrap";
import { BsGeoAlt, BsXLg } from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { clearSearchCriteria } from "../../../store";
import SectionHeader from "../section-header/section-header";
import Loading from "../loading/loading";
import VehicleResultRow from "./vehicle-result-row/vehicle-result-row";
import CustomPagination from "../custom-pagination/custom-pagination";
import "./vehicles.scss";

const PAGE_SIZE = 6;

const Vehicles = () => {
  const { t } = useTranslation("vehicles");
  const dispatch = useDispatch();
  const searchCriteria = useSelector((state) => state.reservation.searchCriteria);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [page, setPage] = useState(0);

  // With a homepage search the list is limited to vehicles that are actually
  // free for that date range; without one ("Araçlar" menu) every vehicle shows.
  const availability = searchCriteria
    ? {
        pickUpTime: utils.functions.combineDateAndTime(searchCriteria.pickUpDate, searchCriteria.pickUpTime),
        dropOffTime: utils.functions.combineDateAndTime(searchCriteria.dropOffDate, searchCriteria.dropOffTime),
      }
    : undefined;

  const loadData = async () => {
    setLoading(true);
    try {
      const vehiclesData = await services.vehicle.getVehiclesByPage(0, 200, "model", "ASC", availability);
      setVehicles(vehiclesData.content || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCriteria]);

  const totalPages = Math.max(1, Math.ceil(vehicles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedVehicles = vehicles.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

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
      {!searchCriteria && (
        <SectionHeader title1={t("sections.vehicleModels.title1")} title2={t("sections.vehicleModels.title2")} desc={t("sections.vehicleModels.desc")} />
      )}
      {
        loading ? <Loading height={500} /> :
        vehicles.length === 0 ? (
          <p className="vehicles__empty">
            {searchCriteria ? t("searchSummary.noResults") : t("emptyList")}
          </p>
        ) : (
          <>
            <div className="vehicles__list">
              {pagedVehicles.map((item) => (
                <VehicleResultRow key={item.id} {...item} />
              ))}
            </div>
            {
              totalPages > 1 && (
                <div className="vehicles__pagination">
                  <CustomPagination
                    loadData={(index) => setPage(index)}
                    paging={{ pageNumber: currentPage, totalPages }}
                  />
                </div>
              )
            }
          </>
        )
      }
    </Container>
  )
}

export default Vehicles
