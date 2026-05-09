import { Route, Routes } from "react-router-dom";
import DefaultLayout from "./layouts/DefaultLayout";
import Homepage from "./pages/Homepage";
import RecapPage from "./pages/RecapPage";
import HowItWorks from "./pages/HowItWorks";

function App() {
  return (
    <Routes>
      <Route element={<DefaultLayout />}>
        <Route path="/" element={<Homepage />} />
        <Route path="/recap" element={<RecapPage />} />
        <Route path="/come-funziona" element={<HowItWorks />} />
      </Route>
    </Routes>
  );
}

export default App;
