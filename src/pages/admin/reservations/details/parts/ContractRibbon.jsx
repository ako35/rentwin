import { useTranslation } from "react-i18next";
import { utils } from "../../../../../utils";

// Top ribbon: contract id / "Yeni Kontrat", optional contract no, last-updated.
const ContractRibbon = ({ isCreate, reservationId, referenceNo, updatedAt }) => {
  const { t } = useTranslation("admin");
  const c = (key) => t(`reservations.contract.${key}`);

  return (
    <div className={`contract-page__ribbon${isCreate ? " contract-page__ribbon--create" : ""}`}>
      <div className="contract-page__ribbon-main">
        <span className="contract-page__ribbon-id">
          {isCreate ? c("newTitle") : `${c("title")} # ${reservationId.slice(0, 10).toUpperCase()}`}
        </span>
        {!isCreate && referenceNo && (
          <span className="contract-page__ribbon-ref">
            ({c("contractNo")}: # {referenceNo})
          </span>
        )}
      </div>
      <div className="contract-page__ribbon-title">{isCreate ? "" : c("detailTitle")}</div>
      <div className="contract-page__ribbon-meta">
        {!isCreate && updatedAt && (
          <>
            📅 {utils.functions.formatDateTime(updatedAt)}
            <br />
            {c("lastUpdated")}: {utils.functions.formatDateTime(updatedAt)}
          </>
        )}
      </div>
    </div>
  );
};

export default ContractRibbon;
