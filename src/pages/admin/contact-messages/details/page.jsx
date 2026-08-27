import { useEffect, useState } from "react";
import { constants } from "../../../../constants";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading, SectionHeader, TableRow } from "../../../../components";
import { Button, ButtonGroup, Spinner } from "react-bootstrap";
import { utils } from "../../../../utils";
import { services } from "../../../../services";
import "./style.scss";

const { routes } = constants;

const AdminContactMessageDetailsPage = () => {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({});
  const [deleting, setDeleting] = useState(false);
  const { t } = useTranslation("admin");

  const tableItems = [
    {
      title: t("contactMessages.name"),
      content: "name",
    },
    {
      title: t("contactMessages.email"),
      content: "email",
    },
    {
      title: t("contactMessages.subject"),
      content: "subject",
    },
    {
      title: t("contactMessages.message"),
      content: "body",
    },
  ];

  const { contactMessageId } = useParams();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      const messageData = await services.contact.getMessage(contactMessageId);
      setMessage(messageData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const removeMessage = async () => {
    setDeleting(true);
    try {
      await services.contact.deleteMessage(contactMessageId);
      utils.functions.swalToast(t("contactMessages.toasts.deleteSuccess"), "success");
    } catch (error) {
      utils.functions.swalToast(
        t("contactMessages.toasts.deleteError"),
        "error"
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    utils.functions.swalQuestion(
      t("contactMessages.toasts.deleteConfirmTitle"),
      t("contactMessages.toasts.deleteConfirmText")
    )
    .then((result) => {
      if (result.isConfirmed) {
        removeMessage();
      }
    })
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return loading ? (
    <Loading height={500} />
  ) : (
    <div className="admin-contact-message-details-page">
      <SectionHeader title1={t("contactMessages.sectionTitle1")} title2={t("contactMessages.sectionTitle2")} />
      <div className="content">
        <table>
          <tbody>
            {tableItems.map((item, index) => (
              <TableRow
                key={index}
                title={item.title}
                content={message[item.content]}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="buttons-container">
        <ButtonGroup>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting && <Spinner animation="border" size="sm" />} {t("contactMessages.delete")}
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => navigate(`${routes.adminContactMessages}`)}
          >
            {t("contactMessages.cancel")}
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default AdminContactMessageDetailsPage;
