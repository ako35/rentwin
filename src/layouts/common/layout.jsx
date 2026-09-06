import { Outlet } from "react-router-dom"
import { Header, Footer } from "../../components"


const CommonLayout = () => {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default CommonLayout
