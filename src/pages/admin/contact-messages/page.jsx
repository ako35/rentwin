import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { services } from "../../../services";
import { constants } from "../../../constants";
import { utils } from "../../../utils";
import DataTable from "react-data-table-component";
import { Loading } from "../../../components";
import "./style.scss";

const { routes } = constants;

const AdminContactMessagesPage = () => {
  const { t } = useTranslation("admin");
  const columns = utils.tables.getAdminContactMessagesColumns(t);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const navigate = useNavigate();

  const loadData = async (page) => {
    try {
      const data = await services.contact.getMessagesByPage(page, perPage);
      setMessages(data.content);
      setTotalRows(data.totalElements);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePerPageRowsChange = async (newPerPage, page) => {
    try {
      const data = await services.contact.getMessagesByPage(
        page - 1,
        newPerPage
      );
      setMessages(data.content);
      setPerPage(newPerPage);
    } catch (error) {
      utils.functions.swalToast(
        t("contactMessages.toasts.pageChangeError"),
        "error"
      );
    }
  };

  const handlePageChange = (page) => {
    loadData(page - 1);
  };

  const handleRowClicked = (row) => {
    navigate(`${routes.adminContactMessages}/${row.id}`);
  };

  // useEffect(() => {
  //   loadData(0);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  return (
    <div className="admin-contact-messages-page">
      <div className="admin-contact-messages-table-container">
        <DataTable
          title={t("contactMessages.tableTitle")}
          columns={columns}
          data={messages}
          progressPending={loading}
          progressComponent={<Loading height={500} />}
          onChangeRowsPerPage={handlePerPageRowsChange}
          onChangePage={handlePageChange}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          paginationPerPage={perPage}
          onRowClicked={handleRowClicked}
          highlightOnHover
        />
      </div>
    </div>
  );
};

export default AdminContactMessagesPage;
