import { Routes, Route } from "react-router-dom";
import SearchPage from "./components/SearchPage";
import RepDetailPage from "./components/RepDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/rep" element={<RepDetailPage />} />
    </Routes>
  );
}