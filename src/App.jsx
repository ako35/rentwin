import { useEffect, useState } from "react";
import AppRouter from "./router";
import { LoadingPage } from "./pages";
import { services } from "./services";
import { useDispatch } from "react-redux";
import { loginFailure, loginSuccess } from "./store";

const App = () => {
  const [loading, setLoading] = useState(
    !!services.encryptedLocalStorage.getItem("rentwintoken")
  );
  const dispatch = useDispatch();

  const loadData = async () => {
    try {
      const token = services.encryptedLocalStorage.getItem("rentwintoken");

      if (token) {
        const userData = await services.user.getUser();
        dispatch(loginSuccess(userData));
      }
    } catch (error) {
      dispatch(loginFailure());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {
        loading ? <LoadingPage /> : <AppRouter />
      }
    </>
  )
}

export default App
