import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ziptodist from "../data/ziptodist.json";
import reps from "../data/reps.json";

export default function SearchPage() {
  const [selectedCounty, setSelectedCounty] = useState("");
  const navigate = useNavigate();
  const counties = Object.keys(ziptodist).sort();

  const handleSearch = () => {
    if (!selectedCounty) return;
    const districtNum = ziptodist[selectedCounty];
    const repData = reps[districtNum];
    if (repData) {
      navigate("/rep", { state: { rep: repData, district: districtNum } });
    }
  };

  return (
    <div className="search-page">
      <h1>Find Your Representative</h1>
      <label>
        Select your county:
        <select value={selectedCounty} onChange={(e) => setSelectedCounty(e.target.value)}>
          <option value="">-- Choose a county --</option>
          {counties.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>
      </label>
      <button onClick={handleSearch} disabled={!selectedCounty}>
        Search
      </button>
    </div>
  );
}
