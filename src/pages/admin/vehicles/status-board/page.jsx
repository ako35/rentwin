import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsSearch } from "react-icons/bs";
import { services } from "../../../../services";
import { utils } from "../../../../utils";
import { constants } from "../../../../constants";
import { Loading } from "../../../../components";
import "./style.scss";

const { routes } = constants;

const matches = (query, fields) => {
  const q = query.trim().toLocaleLowerCase("tr");
  if (!q) return true;
  return fields.some((f) => (f || "").toLocaleLowerCase("tr").includes(q));
};

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
  const navigate = useNavigate();
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

  const goToContract = (row) => row.contractId && navigate(`${routes.adminContracts}/${row.contractId}`);
  const goToVehicle = (row) => navigate(`${routes.adminVehicles}/${row.id}`);

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
                  <th>{b("branch")}</th>
                  <th>{b("specs")}</th>
                </tr>
              </thead>
              <tbody>
                {rentedRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="status-board__empty">{b("noRented")}</td>
                  </tr>
                )}
                {rentedRows.map((row) => (
                  <tr key={row.id} onClick={() => goToContract(row)} className="status-board__row">
                    <td className="status-board__plate">{row.licensePlate}</td>
                    <td title={vehicleLabel(row)}>{vehicleLabel(row) || "—"}</td>
                    <td>{row.dropOffTime ? utils.functions.getDateUTC(row.dropOffTime) : "—"}</td>
                    <td title={row.customerName || ""}>{row.customerName || "—"}</td>
                    <td>{row.branchCode || "—"}</td>
                    <td className="status-board__specs">{specs(row).filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th>{b("branch")}</th>
                  <th>{b("specs")}</th>
                </tr>
              </thead>
              <tbody>
                {availableRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="status-board__empty">{b("noAvailable")}</td>
                  </tr>
                )}
                {availableRows.map((row) => (
                  <tr key={row.id} onClick={() => goToVehicle(row)} className="status-board__row">
                    <td className="status-board__plate">{row.licensePlate}</td>
                    <td title={vehicleLabel(row)}>{vehicleLabel(row) || "—"}</td>
                    <td>
                      {row.nearestReservation ? utils.functions.getDateUTC(row.nearestReservation) : b("noReservation")}
                    </td>
                    <td>{row.branchCode || "—"}</td>
                    <td className="status-board__specs">{specs(row).filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="status-board__hint">{b("rowHint")}</p>
    </div>
  );
};

export default AdminVehicleStatusBoardPage;
