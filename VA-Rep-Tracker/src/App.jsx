import { useEffect } from "react";
import { getCosponLegislation } from "./api/votes";
import { getSponLegislation } from "./api/votes";
import { extractNumberTypeMap } from "./api/votes";
import { fetchSummariesFromMap } from "./api/votes";
import { useMemo, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { getBillSummaryTest } from "./api/votes";

/** 
export default function App() {
  useEffect(() => {
    getSponLegislation("L000174")
      .then((arr) => console.log("sponsored:", arr))
      .catch((err) => console.error("sponsored error:", err));

    getCosponLegislation("L000174")
      .then((arr) => console.log("cosponsored:", arr))
      .catch((err) => console.error("cosponsored error:", err));
  }, []);

  return <div>VA Rep Dashboard</div>;
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
}
**/

export default function App() {
  useEffect(() => {
    getSponLegislation("L000174")
      .then((arr) => {
        const map = extractNumberTypeMap(arr);
        return fetchSummariesFromMap(map, "119");
      })
      .then((summaries) => console.log(summaries))
      .catch((err) => console.error(err));
  }, []);

  return <div>VA Rep Dashboard</div>;
}