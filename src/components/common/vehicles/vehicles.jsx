import { useEffect, useMemo, useState } from "react";
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
import VehicleFilters from "./vehicle-filters/vehicle-filters";
import VehicleResultRow from "./vehicle-result-row/vehicle-result-row";
import CustomPagination from "../custom-pagination/custom-pagination";
import "./vehicles.scss";

const PAGE_SIZE = 6;
const TRANSMISSION_ORDER = ["Manual", "SemiAutomatic", "Automatic"];
const FUEL_TYPE_ORDER = ["Gasoline", "Diesel", "Hybrid", "Electricity", "LPG", "CNG", "Hydrogen"];
const EMPTY_FILTERS = { transmission: [], fuelType: [], brand: [] };

const buildGroup = (vehicles, key, order) => {
  const counts = new Map();
  vehicles.forEach((v) => {
    if (!v[key]) return;
    counts.set(v[key], (counts.get(v[key]) || 0) + 1);
  });
  const known = order.filter((value) => counts.has(value));
  const extra = [...counts.keys()].filter((value) => !order.includes(value)).sort();
  return [...known, ...extra].map((value) => ({ value, count: counts.get(value) }));
};

const Vehicles = () => {
  const { t } = useTranslation("vehicles");
  const dispatch = useDispatch();
  const searchCriteria = useSelector((state) => state.reservation.searchCriteria);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("recommended");
  const [page, setPage] = useState(0);

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
    setFilters(EMPTY_FILTERS);
    setSortBy("recommended");
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCriteria]);

  const filterOptions = useMemo(() => {
    const brand = [...new Map(vehicles.filter((v) => v.brand).map((v) => [v.brand, v])).keys()]
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, count: vehicles.filter((v) => v.brand === value).length }));

    return {
      transmission: buildGroup(vehicles, "transmission", TRANSMISSION_ORDER),
      fuelType: buildGroup(vehicles, "fuelType", FUEL_TYPE_ORDER),
      brand,
    };
  }, [vehicles]);

  const toggleFilter = (group, value) => {
    setFilters((prev) => {
      const current = prev[group];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [group]: next };
    });
    setPage(0);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const activeFilterCount = filters.transmission.length + filters.fuelType.length + filters.brand.length;

  const sortedVehicles = useMemo(() => {
    const filtered = vehicles.filter((v) => {
      if (filters.transmission.length && !filters.transmission.includes(v.transmission)) return false;
      if (filters.fuelType.length && !filters.fuelType.includes(v.fuelType)) return false;
      if (filters.brand.length && !filters.brand.includes(v.brand)) return false;
      return true;
    });

    if (sortBy === "brand") {
      filtered.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    } else if (sortBy === "model") {
      filtered.sort((a, b) => (a.model || "").localeCompare(b.model || ""));
    }

    return filtered;
  }, [vehicles, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedVehicles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedVehicles = sortedVehicles.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

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
        <div className="vehicles__layout">
          <VehicleFilters
            options={filterOptions}
            active={filters}
            onToggle={toggleFilter}
            onClear={clearFilters}
            activeCount={activeFilterCount}
          />
          <div className="vehicles__results">
            <div className="vehicles__results-toolbar">
              <span className="vehicles__results-count">
                {t("searchSummary.resultsCount", { count: sortedVehicles.length })}
              </span>
              <div className="vehicles__sort">
                <label htmlFor="vehicles-sort">{t("searchSummary.sortLabel")}</label>
                <select id="vehicles-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="recommended">{t("searchSummary.sortRecommended")}</option>
                  <option value="brand">{t("searchSummary.sortBrand")}</option>
                  <option value="model">{t("searchSummary.sortModel")}</option>
                </select>
              </div>
            </div>

            {sortedVehicles.length === 0 ? (
              <p className="vehicles__empty">{t("searchSummary.noResults")}</p>
            ) : (
              <div className="vehicles__list">
                {pagedVehicles.map((item) => (
                  <VehicleResultRow key={item.id} {...item} />
                ))}
              </div>
            )}

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
          </div>
        </div>
      }
    </Container>
  )
}

export default Vehicles
