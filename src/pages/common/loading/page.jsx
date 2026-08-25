import { Spinner } from "react-bootstrap"
import './style.scss'

const LoadingPage = () => {
  return (
    <div className="loading-page">
      <Spinner animation="border" variant="primary"/>
      <div className="logo">
        <div className="logo_text">
          RENT<span>WIN</span> <p>YOUR RELIABLE RIDE, AS LONG AS YOU NEED</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingPage