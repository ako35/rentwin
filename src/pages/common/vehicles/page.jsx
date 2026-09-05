import { useTranslation } from "react-i18next"
import { PageHeader, Spacer, Vehicles } from "../../../components"
import { usePageMeta } from "../../../hooks/use-page-meta"

const VehiclesPage = () => {
  const { t } = useTranslation("vehicles");
  usePageMeta(t("seoTitle"), t("seoDescription"));
  return (
    <>
      <PageHeader title={t("pageTitle")}/>
      <Spacer />
      <Vehicles />
      <Spacer />
    </>
  )
}

export default VehiclesPage