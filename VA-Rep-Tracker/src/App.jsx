import { useEffect } from "react";
import { getCosponLegislation } from "./api/votes";
import { getSponLegislation } from "./api/votes";

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
}