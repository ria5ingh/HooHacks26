// App.jsx
import { Route, Routes } from "react-router-dom";
import SearchPage from "./SearchPage";
import ResultsPage from "./ResultsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
}