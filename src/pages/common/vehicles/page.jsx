import { useTranslation } from "react-i18next"
import { JsonLd, PageHeader, Spacer, Vehicles } from "../../../components"
import { usePageMeta } from "../../../hooks/use-page-meta"
import { breadcrumbLd } from "../../../utils/seo"

const VehiclesPage = () => {
  const { t } = useTranslation("vehicles");
  const { t: tCommon } = useTranslation("common");
  usePageMeta(t("seoTitle"), t("seoDescription"));
  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbLd([
          { name: tCommon("nav.home"), path: "/" },
          { name: t("pageTitle") },
        ])}
      />
      <PageHeader title={t("pageTitle")}/>
      <Spacer />
      <Vehicles />
      <Spacer />
    </>
  )
}

export default VehiclesPage