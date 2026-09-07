import { Outlet } from "react-router-dom"
import { Header, Footer } from "../../components"
import "./style.scss"


const CommonLayout = () => {
  return (
    <>
      <Header />
      <main className="common-main">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default CommonLayout
