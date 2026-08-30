import { Accordion, Table } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { utils } from "../../../../../utils";
import "./details-accordion.scss";

const UserReservationDetailsAccordion = (props) => {
    const {
        pickUpLocation,
        dropOffLocation,
        pickUpTime,
        dropOffTime,
        status,
        car,
    } = props;
    const { t } = useTranslation("user");
    const { t: tCommon } = useTranslation("common");

    const accordionItems = [
        {
            id: 1,
            title: t("reservations.details.reservationDetails"),
            content: [
                {
                    label: t("reservations.details.pickUpLocation"),
                    value: pickUpLocation,
                },
                {
                    label: t("reservations.details.dropOffLocation"),
                    value: dropOffLocation,
                },
                {
                    label: t("reservations.details.pickUpTime"),
                    value: utils.functions.formatDateTime(pickUpTime),
                },
                {
                    label: t("reservations.details.dropOffTime"),
                    value: utils.functions.formatDateTime(dropOffTime),
                },
                {
                    label: t("reservations.details.status"),
                    value: tCommon(`options.reservationStatus.${status}`),
                },
            ],
        },
        {
            id: 2,
            title: t("reservations.details.carDetails"),
            content: [
                {
                    label: t("reservations.details.model"),
                    value: car.model,
                },
                {
                    label: t("reservations.details.transmission"),
                    value: tCommon(`options.transmissionTypes.${car.transmission}`),
                },
                {
                    label: t("reservations.details.fuelType"),
                    value: tCommon(`options.fuelTypes.${car.fuelType}`),
                },
            ],
        },
    ];

  return (
    <Accordion defaultActiveKey={1} className="details-accordion">
      {
        accordionItems.map((item) => (
          <Accordion.Item eventKey={item.id} key={item.id}>
            <Accordion.Header>{item.title}</Accordion.Header>
            <Accordion.Body>
              <Table striped bordered hover>
                <tbody>
                  {
                    item.content.map(item => (
                      <tr key={item.label}>
                        <td>{item.label}</td>
                        <td>{item.value}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </Table>
            </Accordion.Body>
          </Accordion.Item>
        ))
      }
    </Accordion>
  )
}

export default UserReservationDetailsAccordion