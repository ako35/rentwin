import { Spinner, Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../../utils";

const UserReservationsTable = (props) => {
  const navigate = useNavigate();
  const { t } = useTranslation("user");
  const tableHeaders = [
    t("reservations.table.no"),
    t("reservations.table.vehicle"),
    t("reservations.table.pickUp"),
    t("reservations.table.dropOff"),
  ];

  return (
    <Table>
      <thead>
        <tr>
          {tableHeaders.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {props.loading && (
          <tr>
            <td colSpan={4} className="text-center">
              <Spinner animation="border" size="sm" />
            </td>
          </tr>
        )}
        {props.reservations.map((reservation, index) => {
          <tr
            key={reservation?.id || index}
            onClick={() => navigate(`${reservation?.id}`)}
            style={{cursor: 'pointer'}}
          >
            {[
              index + 1,
              reservation?.car?.model,
              `${
                reservation?.pickUpLocation
              } - ${utils.functions.formatDateTime(reservation?.pickUpDate)}`,
              `${
                reservation?.dropOffLocation
              } - ${utils.functions.formatDateTime(reservation?.dropOffDate)}`,
            ].map((item, index) => (
              <td key={index}>{item}</td>
            ))}
          </tr>;
        })}
      </tbody>
    </Table>
  );
};

export default UserReservationsTable;
