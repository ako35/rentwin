import { useTranslation } from "react-i18next";
import { utils } from "../../../../../utils";

// Top ribbon: contract id / "Yeni Kontrat", optional contract no, status badge,
// last-updated.
const ContractRibbon = ({ isCreate, contractId, referenceNo, status, updatedAt }) => {
  const { t } = useTranslation("admin");
  const { t: tCommon } = useTranslation("common");
  const c = (key) => t(`reservations.contract.${key}`);

  return (
    <div className={`contract-page__ribbon${isCreate ? " contract-page__ribbon--create" : ""}`}>
      <div className="contract-page__ribbon-main">
        <span className="contract-page__ribbon-id">
          {isCreate ? c("newTitle") : `${c("title")} # ${contractId.slice(0, 10).toUpperCase()}`}
        </span>
        {!isCreate && referenceNo && (
          <span className="contract-page__ribbon-ref">
            ({c("contractNo")}: # {referenceNo})
          </span>
        )}
        {!isCreate && status && (
          <span className={`contract-page__badge contract-page__badge--${status.toLowerCase()}`}>
            {tCommon(`options.contractStatus.${status}`)}
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
