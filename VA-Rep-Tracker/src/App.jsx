import { Routes, Route } from "react-router-dom";
import SearchPage from "./SearchPage";
import RepDetailPage from "./RepDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/rep" element={<RepDetailPage />} />
    </Routes>
  );
}