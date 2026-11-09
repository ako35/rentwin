import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Container, Form } from "react-bootstrap";
import { BsGeoAlt, BsXLg } from "react-icons/bs";
import { services } from "../../../services";
import { utils } from "../../../utils";
import { clearSearchCriteria } from "../../../store";
import { constants } from "../../../constants";
import { SITE_URL } from "../../../hooks/use-page-meta";
import { useLocale } from "../../../hooks/use-locale";
import { localizePath } from "../../../i18n/locale-routing";
import { itemListLd } from "../../../utils/seo";
import SectionHeader from "../section-header/section-header";
import Loading from "../loading/loading";
import JsonLd from "../json-ld/json-ld";
import VehicleFilters from "./vehicle-filters/vehicle-filters";
import VehicleGridCard from "./vehicle-grid-card/vehicle-grid-card";
import CustomPagination from "../custom-pagination/custom-pagination";
import "./vehicles.scss";

const { routes } = constants;

const PAGE_SIZE = 9;
const TRANSMISSION_ORDER = ["Manual", "SemiAutomatic", "Automatic"];
const FUEL_TYPE_ORDER = ["Gasoline", "Diesel", "Hybrid", "Electricity", "LPG", "CNG", "Hydrogen"];
const EMPTY_FILTERS = { transmission: [], fuelType: [], brand: [] };
// "recommended" keeps the API order (by model); the price sorts are offered
// only when at least one listed vehicle has a price for this rental type.
const PRICE_SORTS = ["priceAsc", "priceDesc"];
const SORTS = ["recommended", ...PRICE_SORTS, "yearDesc", "nameAsc"];

const vehicleName = (v) => [v.brand, v.model].filter(Boolean).join(" ").trim();
const byName = (a, b) => vehicleName(a).localeCompare(vehicleName(b), "tr");

// Vehicles without a list price ("Fiyat için teklif alın") stay last in both
// price directions; ties fall back to make/model.
const sortVehicles = (list, sort, priceOf) => {
  if (sort === "recommended") return list;
  const sorted = [...list];
  if (PRICE_SORTS.includes(sort)) {
    const dir = sort === "priceAsc" ? 1 : -1;
    sorted.sort((a, b) => {
      const pa = priceOf(a);
      const pb = priceOf(b);
      if (pa == null && pb == null) return byName(a, b);
      if (pa == null) return 1;
      if (pb == null) return -1;
      return (pa - pb) * dir || byName(a, b);
    });
  } else if (sort === "yearDesc") {
    sorted.sort((a, b) => (Number(b.modelYear) || 0) - (Number(a.modelYear) || 0) || byName(a, b));
  } else if (sort === "nameAsc") {
    sorted.sort(byName);
  }
  return sorted;
};

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
  const { t, i18n } = useTranslation("vehicles");
  const locale = useLocale();
  const dispatch = useDispatch();
  const searchCriteria = useSelector((state) => state.reservation.searchCriteria);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(0);
  const isMonthly = searchCriteria?.rentalType === "MONTHLY";

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
    setFilters(EMPTY_FILTERS);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCriteria]);

  const filterOptions = useMemo(
    () => ({
      transmission: buildGroup(vehicles, "transmission", TRANSMISSION_ORDER),
      fuelType: buildGroup(vehicles, "fuelType", FUEL_TYPE_ORDER),
      brand: [...new Map(vehicles.filter((v) => v.brand).map((v) => [v.brand, v])).keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, count: vehicles.filter((v) => v.brand === value).length })),
    }),
    [vehicles]
  );

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

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((v) => {
        if (filters.transmission.length && !filters.transmission.includes(v.transmission)) return false;
        if (filters.fuelType.length && !filters.fuelType.includes(v.fuelType)) return false;
        if (filters.brand.length && !filters.brand.includes(v.brand)) return false;
        return true;
      }),
    [vehicles, filters]
  );

  // The card shows the monthly price for a monthly search and the daily one
  // otherwise, so the price sort follows the same field.
  const priceOf = (v) => {
    const price = Number(isMonthly ? v.monthlyPrice : v.dailyPrice);
    return price > 0 ? price : null;
  };
  const hasPrices = vehicles.some((v) => priceOf(v) != null);
  const sortOptions = hasPrices ? SORTS : SORTS.filter((key) => !PRICE_SORTS.includes(key));
  const activeSort = sortOptions.includes(sort) ? sort : "recommended";

  const sortedVehicles = useMemo(
    () => sortVehicles(filteredVehicles, activeSort, priceOf),
    // priceOf only depends on isMonthly
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredVehicles, activeSort, isMonthly]
  );

  const totalPages = Math.max(1, Math.ceil(sortedVehicles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedVehicles = sortedVehicles.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  // Dates in the page's language: "15 Kasım 2026 10:00" / "15 November 2026, 10:00".
  // (moment has no Turkish locale loaded here, so it printed "Nov".)
  const dateLocale = (locale || i18n.language) === "en" ? "en-GB" : "tr-TR";
  const fmt = (date, time) => {
    const value = new Date(`${date}T${time || "00:00"}`);
    if (Number.isNaN(value.getTime())) return `${date} ${time || ""}`.trim();
    return value.toLocaleString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ItemList mirrors the bot-prerender's (backend/src/lib/seo-ld.js) — only
  // for the plain catalog view, not an ephemeral date-search result.
  const itemListElement = useMemo(() => {
    if (searchCriteria || vehicles.length === 0) return null;
    return vehicles.slice(0, 100).map((v, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: vehicleName(v),
      url: `${SITE_URL}${localizePath(`${routes.vehicles}/${v.id}`, locale)}`,
    }));
  }, [vehicles, searchCriteria, locale]);

  return (
    <Container className="vehicles">
      {itemListElement && (
        <JsonLd id="ld-itemlist" data={itemListLd({ name: t("pageTitle"), itemListElement })} />
      )}
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
              {searchCriteria.rentalType === "MONTHLY"
                ? t("searchSummary.monthsRange", { months: searchCriteria.months || 1 })
                : t("searchSummary.range", {
                    pickUp: fmt(searchCriteria.pickUpDate, searchCriteria.pickUpTime),
                    dropOff: fmt(searchCriteria.dropOffDate, searchCriteria.dropOffTime),
                  })}
            </span>
          </div>
          <Button variant="outline-secondary" size="sm" onClick={() => dispatch(clearSearchCriteria())}>
            <BsXLg /> {t("searchSummary.clear")}
          </Button>
        </div>
      )}
      {!searchCriteria && (
        <SectionHeader
          title1={t("sections.vehicleModels.title1")}
          title2={t("sections.vehicleModels.title2")}
          desc={t("sections.vehicleModels.desc")}
        />
      )}

      {loading ? (
        <Loading height={500} />
      ) : vehicles.length === 0 ? (
        <p className="vehicles__empty">
          {searchCriteria ? t("searchSummary.noResults") : t("emptyList")}
        </p>
      ) : (
        <div className="vehicles__layout">
          <VehicleFilters
            options={filterOptions}
            active={filters}
            onToggle={toggleFilter}
            onClear={clearFilters}
            activeCount={activeFilterCount}
          />

          <div className="vehicles__results">
            <div className="vehicles__results-bar">
              <div className="vehicles__results-count">
                {t("searchSummary.resultsCount", { count: filteredVehicles.length })}
              </div>
              <label className="vehicles__sort">
                <span>{t("sort.label")}</span>
                <Form.Select
                  size="sm"
                  value={activeSort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(0);
                  }}
                >
                  {sortOptions.map((key) => (
                    <option key={key} value={key}>
                      {t(`sort.${key}`)}
                    </option>
                  ))}
                </Form.Select>
              </label>
            </div>

            {filteredVehicles.length === 0 ? (
              <p className="vehicles__empty">{t("filters.noMatch")}</p>
            ) : (
              <div className="vehicles__grid">
                {pagedVehicles.map((item) => (
                  <VehicleGridCard key={item.id} {...item} listView rentalType={searchCriteria?.rentalType} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="vehicles__pagination">
                <CustomPagination
                  loadData={(index) => setPage(index)}
                  paging={{ pageNumber: currentPage, totalPages }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  );
};

export default Vehicles;
