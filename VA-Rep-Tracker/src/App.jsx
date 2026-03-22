// App.jsx
import { useMemo, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { generateContent } from "./api/geminiClient";
import zipToDist from "../data/ziptodist.json";
import "./styles/app.css";
import ResultsPage from "./ResultsPage";

// test of geminiClient using generateContent() function
generateContent("How does AI work?").then(console.log);

function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return Object.keys(zipToDist)
      .filter((name) => name.toLowerCase().includes(normalizedQuery))
      .slice(0, 30)
      .map((name) => ({ name, district: zipToDist[name] }));
  }, [normalizedQuery]);

  const onSelectItem = (name) => {
    setSearchQuery(name);
  };

  const handleSubmit = () => {
    navigate("/results", { state: { county: searchQuery } });
  };

  return (
    <div className="app-container">
      <h1>VA Rep Dashboard</h1>

      <section className="search-section">
        <label htmlFor="zip-query">Search county/city (ziptodist):</label>
        <input
          id="zip-query"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type a locality name..."
        />
      </section>

      <section className="results-section">
        <p>
          Search query variable: <strong>{searchQuery || "(empty)"}</strong>
        </p>

        {normalizedQuery && results.length === 0 && (
          <p>No matches found for "{searchQuery}".</p>
        )}

        {results.length > 0 && (
          <ul>
            {results.map((item, index) => (
              <li
                key={item.name}
                style={{ cursor: "pointer", "--stagger": index }}
                onClick={() => onSelectItem(item.name)}
              >
                {item.name}: District {item.district}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="submit-section">
        <button onClick={handleSubmit} className="submit-button">
          Submit
        </button>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/results" element={<ResultsPage />} />
    </Routes>
  );
}