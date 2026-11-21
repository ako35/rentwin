import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsSearch } from "react-icons/bs";
import moment from "moment/moment";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import { RowLink } from "../../../../components/admin";
import "./style.scss";

const { routes } = constants;

const matches = (query, fields) => {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return true;
  return fields.some((f) => (f || "").toLocaleLowerCase("tr").includes(q));
};

// Phone-width card: a real link when there is somewhere to go (so long-press
// "yeni sekmede aç" still works), a plain block otherwise.
const BoardCard = ({ to, className, children }) =>
  to ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );

// Fleet snapshot: every rented vehicle (who has it, until when) side by side
// with every available one (its nearest upcoming reservation, if any) — the
// same split the dashboard's Kirada/Müsait tiles count, drilled into. Deep-
// linked from those tiles via ?tab=rented|available so the matching panel
// scrolls into view on narrower screens where the two stack.
const AdminVehicleStatusBoardPage = () => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const { branchId } = useOutletContext() || {};
  const [searchParams] = useSearchParams();
  const b = (key) => t(`vehicleStatusBoard.${key}`);

  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState({ rented: [], available: [] });
  const [rentedSearch, setRentedSearch] = useState("");
  const [availableSearch, setAvailableSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    services.vehicle
      .getFleetStatusBoard(branchId)
      .then((data) =>
        setBoard({
          rented: Array.isArray(data?.rented) ? data.rented : [],
          available: Array.isArray(data?.available) ? data.available : [],
        })
      )
      .catch(() => setBoard({ rented: [], available: [] }))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    if (loading) return;
    const tab = searchParams.get("tab");
    if (tab !== "rented" && tab !== "available") return;
    document.getElementById(`status-board-${tab}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const vehicleLabel = (row) => [row.brand, row.model].filter(Boolean).join(" ");
  const specs = (row) => [
    row.transmission ? tCommon(`options.transmissionTypes.${row.transmission}`) : null,
    row.fuelType ? tCommon(`options.fuelTypes.${row.fuelType}`) : null,
  ];

  const specsText = (row) => specs(row).filter(Boolean).join(" · ");

  // Same wall-clock day count as the dashboard schedule cards
  // (components/admin/schedule-table): read the stored calendar date with the
  // UTC helper, then diff two local midnights.
  const daysUntil = (value) =>
    moment(utils.functions.getDateUTC(value)).startOf("day").diff(moment().startOf("day"), "days");
  const dueLabel = (days) => {
    if (days === 0) return t("scheduleTable.today");
    if (days > 0) return t("scheduleTable.daysLeft", { days });
    return t("scheduleTable.daysLate", { days: -days });
  };
  const when = (value) => (
    <>
      <span>{moment.utc(value).format("DD.MM.YYYY")}</span>
      <strong>{utils.functions.getTimeUTC(value)}</strong>
    </>
  );

  const rentedRows = useMemo(
    () =>
      board.rented.filter((r) =>
        matches(rentedSearch, [r.licensePlate, vehicleLabel(r), r.customerName, r.branchCode])
      ),
    [board.rented, rentedSearch]
  );
  const availableRows = useMemo(
    () =>
      board.available.filter((r) =>
        matches(availableSearch, [r.licensePlate, vehicleLabel(r), r.branchCode])
      ),
    [board.available, availableSearch]
  );

  if (loading) return <Loading height={500} />;

  return (
    <div className="status-board">
      <h2 className="status-board__title">{b("title")}</h2>

      <div className="status-board__grid">
        <section id="status-board-rented" className="status-board__panel status-board__panel--rented">
          <div className="status-board__head">
            <h3>
              {b("rented")} <span className="status-board__count">({rentedRows.length})</span>
            </h3>
            <div className="status-board__search">
              <BsSearch />
              <input
                type="text"
                placeholder={b("searchPlaceholder")}
                value={rentedSearch}
                onChange={(e) => setRentedSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="status-board__table-wrap">
            <table className="status-board__table status-board__table--rented">
              <thead>
                <tr>
                  <th>{b("plate")}</th>
                  <th>{b("vehicle")}</th>
                  <th>{b("dropOff")}</th>
                  <th>{b("customer")}</th>
                  <th>{b("specs")}</th>
                </tr>
              </thead>
              <tbody>
                {rentedRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="status-board__empty">{b("noRented")}</td>
                  </tr>
                )}
                {rentedRows.map((row) => (
                  <tr key={row.id} className="status-board__row row-link-host">
                    <td className="status-board__plate">
                      {row.contractId && (
                        <RowLink to={`${routes.adminContracts}/${row.contractId}`} label={row.customerName} />
                      )}
                      <span className="status-board__plate-text">{row.licensePlate}</span>
                    </td>
                    <td title={vehicleLabel(row)}>{vehicleLabel(row) || "—"}</td>
                    <td>{row.dropOffTime ? utils.functions.getDateUTC(row.dropOffTime) : "—"}</td>
                    <td title={row.customerName || ""}>{row.customerName || "—"}</td>
                    <td className="status-board__specs">{specsText(row) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Telefonda tablonun dar sütunları tarihi ve müşteriyi "…" ile
              kesiyordu; dar ekranda tablo gizlenir, her araç bir karta
              dönüşür (görünürlük style.scss'teki media query'de). */}
          <div className="status-board__cards">
            {rentedRows.length === 0 && <div className="status-board__cards-empty">{b("noRented")}</div>}
            {rentedRows.map((row) => {
              const days = row.dropOffTime ? daysUntil(row.dropOffTime) : null;
              return (
                <BoardCard
                  key={row.id}
                  to={row.contractId ? `${routes.adminContracts}/${row.contractId}` : null}
                  className={`status-board__card${days !== null && days < 0 ? " status-board__card--overdue" : ""}`}
                >
                  <span className="status-board__card-top">
                    <span className="status-board__card-plate">{row.licensePlate}</span>
                    {vehicleLabel(row) && <span className="status-board__card-vehicle">{vehicleLabel(row)}</span>}
                    {days !== null && <span className="status-board__card-due">{dueLabel(days)}</span>}
                  </span>
                  <span className="status-board__card-when">
                    <span className="status-board__card-label">{b("dropOffShort")}</span>
                    {row.dropOffTime ? when(row.dropOffTime) : <span>—</span>}
                  </span>
                  {row.customerName && <span className="status-board__card-customer">{row.customerName}</span>}
                  {specsText(row) && <span className="status-board__card-specs">{specsText(row)}</span>}
                </BoardCard>
              );
            })}
          </div>
        </section>

        <section id="status-board-available" className="status-board__panel status-board__panel--available">
          <div className="status-board__head">
            <h3>
              {b("available")} <span className="status-board__count">({availableRows.length})</span>
            </h3>
            <div className="status-board__search">
              <BsSearch />
              <input
                type="text"
                placeholder={b("searchPlaceholder")}
                value={availableSearch}
                onChange={(e) => setAvailableSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="status-board__table-wrap">
            <table className="status-board__table status-board__table--available">
              <thead>
                <tr>
                  <th>{b("plate")}</th>
                  <th>{b("vehicle")}</th>
                  <th>{b("nearestReservation")}</th>
                  <th>{b("specs")}</th>
                </tr>
              </thead>
              <tbody>
                {availableRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="status-board__empty">{b("noAvailable")}</td>
                  </tr>
                )}
                {availableRows.map((row) => (
                  <tr key={row.id} className="status-board__row row-link-host">
                    <td className="status-board__plate">
                      <RowLink to={`${routes.adminVehicles}/${row.id}`} label={row.licensePlate} />
                      <span className="status-board__plate-text">{row.licensePlate}</span>
                    </td>
                    <td title={vehicleLabel(row)}>{vehicleLabel(row) || "—"}</td>
                    <td>
                      {row.nearestReservation ? utils.functions.getDateUTC(row.nearestReservation) : b("noReservation")}
                    </td>
                    <td className="status-board__specs">{specsText(row) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="status-board__cards">
            {availableRows.length === 0 && <div className="status-board__cards-empty">{b("noAvailable")}</div>}
            {availableRows.map((row) => (
              <BoardCard key={row.id} to={`${routes.adminVehicles}/${row.id}`} className="status-board__card">
                <span className="status-board__card-top">
                  <span className="status-board__card-plate">{row.licensePlate}</span>
                  {vehicleLabel(row) && <span className="status-board__card-vehicle">{vehicleLabel(row)}</span>}
                  {row.nearestReservation && (
                    <span className="status-board__card-due">{dueLabel(daysUntil(row.nearestReservation))}</span>
                  )}
                </span>
                <span className="status-board__card-when">
                  <span className="status-board__card-label">{b("reservationShort")}</span>
                  {row.nearestReservation ? (
                    when(row.nearestReservation)
                  ) : (
                    <span className="status-board__card-none">{b("noUpcomingReservation")}</span>
                  )}
                </span>
                {specsText(row) && <span className="status-board__card-specs">{specsText(row)}</span>}
              </BoardCard>
            ))}
          </div>
        </section>
      </div>

      <p className="status-board__hint">
        <span className="status-board__hint-table">{b("rowHint")}</span>
        <span className="status-board__hint-cards">{b("cardHint")}</span>
      </p>
    </div>
  );
};

export default AdminVehicleStatusBoardPage;
