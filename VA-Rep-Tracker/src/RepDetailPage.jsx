import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSponLegislation, extractBillTitles } from "./api/votes";
import { analyzePromisesFulfillment } from "./api/geminiClient";

export default function RepDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { rep, district } = location.state || {};

  const [fulfillmentScore, setFulfillmentScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rep) {
      navigate("/");
      return;
    }

    const fetchAndAnalyze = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch sponsored legislation
        const arr = await getSponLegislation(rep.bioguideId);
        
        // 2. Extract bill titles
        const billTitles = extractBillTitles(arr);
        
        // 3. Use Gemini to analyze promise fulfillment
        const score = await analyzePromisesFulfillment(rep, billTitles);
        setFulfillmentScore(score);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to analyze representative data");
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyze();
  }, [rep, navigate]);

  if (!rep) return <div>Loading...</div>;

  return (
    <div className="rep-detail">
      <button onClick={() => navigate("/")}>← Back to Search</button>

      <section className="rep-info">
        <h1>{rep.name}</h1>
        <p><strong>District:</strong> {district}</p>
        <p><strong>Party:</strong> {rep.party}</p>
      </section>

      <section className="promises">
        <h2>Campaign Promises</h2>
        <ul>
          {rep.promises.map((promise, idx) => (
            <li key={idx}>
              <strong>{promise.topic}:</strong> {promise.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="analysis">
        <h2>Promise Fulfillment Analysis (based on legislation)</h2>
        {loading && <p>Analyzing sponsored bills...</p>}
        {error && <p className="error">{error}</p>}
        {fulfillmentScore !== null && (
          <div className="score">
            <p className="score-value">{fulfillmentScore}%</p>
            <p>Promise Fulfillment Rate</p>
          </div>
        )}
      </section>
    </div>
  );
}
