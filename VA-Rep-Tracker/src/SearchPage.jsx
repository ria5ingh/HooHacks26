import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ziptodist from "../data/ziptodist.json";
import reps from "../data/reps.json";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return Object.keys(ziptodist)
      .filter((name) => name.toLowerCase().includes(normalizedQuery))
      .slice(0, 30)
      .map((name) => ({ name, district: ziptodist[name] }));
  }, [normalizedQuery]);

  const isExactMatch = Object.prototype.hasOwnProperty.call(ziptodist, query);

  const handleSelect = (name) => setQuery(name);

  const handleSubmit = () => {
    if (!isExactMatch) return;
    const districtNum = ziptodist[query];
    const repData = reps[districtNum];
    if (repData) {
      navigate("/results", { state: { district: districtNum, county: query } });
    }
  };

  return (
    <div className="search-page">
      <h1>Find Your Representative</h1>

      <section className="sp-search">
        <label htmlFor="county-input">Search your county or city:</label>
        <input
          id="county-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Fairfax, Arlington…"
        />
      </section>

      {normalizedQuery && results.length === 0 && (
        <p className="sp-no-results">No matches for "{query}"</p>
      )}

      {results.length > 0 && (
        <ul className="sp-results">
          {results.map((item, index) => (
            <li
              key={item.name}
              style={{ "--stagger": index }}
              onClick={() => handleSelect(item.name)}
            >
              <span className="sp-result-name">{item.name}</span>
              <span className="sp-result-district">District {item.district}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="sp-submit">
        <button onClick={handleSubmit} disabled={!isExactMatch}>
          View My Rep →
        </button>
      </div>
    </div>
  );
}
