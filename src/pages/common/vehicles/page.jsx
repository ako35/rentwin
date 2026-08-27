import { useTranslation } from "react-i18next"
import { PageHeader, Spacer, Vehicles } from "../../../components"

const VehiclesPage = () => {
  const { t } = useTranslation("vehicles");
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