import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getSponLegislation, extractBillTitles } from "./api/votes";
import { analyzePromisesFulfillment } from "./api/geminiClient";

const PROMISE_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12",
  "#9b59b6", "#1abc9c", "#e67e22", "#34495e",
  "#e91e63", "#00bcd4"
];

export default function RepDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { rep, district } = location.state || {};

  const [fulfillmentScore, setFulfillmentScore] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [thinking, setThinking] = useState(null);
  const [billTitles, setBillTitles] = useState([]);
  const [showThinking, setShowThinking] = useState(false);
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
        const arr = await getSponLegislation(rep.bioguideId);
        const titles = extractBillTitles(arr);
        setBillTitles(titles);

        const { score, breakdown: bd, thinking: th } = await analyzePromisesFulfillment(rep, titles);
        setFulfillmentScore(score);
        setBreakdown(bd);
        setThinking(th);
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

  // Build reverse map: bill number → promise indices
  const billToPromiseIndices = {};
  breakdown.forEach((item, idx) => {
    item.correlatingBills.forEach(bill => {
      const key = String(bill.number);
      if (!billToPromiseIndices[key]) billToPromiseIndices[key] = [];
      billToPromiseIndices[key].push(idx);
    });
  });

  const scoreColor =
    fulfillmentScore >= 70 ? "#2ecc71" :
    fulfillmentScore >= 40 ? "#f39c12" :
    "#e74c3c";

  return (
    <div className="rep-detail">
      <button className="back-btn" onClick={() => navigate("/")}>← Back to Search</button>

      <section className="rep-info">
        <h1>{rep.name}</h1>
        <p><strong>District:</strong> {district}</p>
        <p><strong>Party:</strong> {rep.party}</p>
      </section>

      <section className="analysis">
        <h2>Promise Fulfillment Analysis</h2>
        {loading && <p className="loading-text">Analyzing sponsored bills with AI…</p>}
        {error && <p className="error">{error}</p>}

        {fulfillmentScore !== null && (
          <div className="score-badge" style={{ borderColor: scoreColor }}>
            <span className="score-value" style={{ color: scoreColor }}>{fulfillmentScore}%</span>
            <span className="score-label">Promise Fulfillment Rate</span>
          </div>
        )}
      </section>

      {breakdown.length > 0 && (
        <section className="graph-section">
          <h2>Promises vs. Sponsored Bills</h2>
          <p className="graph-hint">Colored badges show which promises each bill relates to.</p>

          <div className="graph-layout">
            {/* LEFT: Promises */}
            <div className="graph-col graph-col--promises">
              <h3>Campaign Promises</h3>
              {rep.promises.map((promise, idx) => (
                <div key={idx} className="graph-promise-card">
                  <span
                    className="promise-badge"
                    style={{ background: PROMISE_COLORS[idx % PROMISE_COLORS.length] }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <strong>{promise.topic}</strong>
                    <p>{promise.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: Bills */}
            <div className="graph-col graph-col--bills">
              <h3>Sponsored Bills</h3>
              {billTitles.map((bill, idx) => {
                const indices = billToPromiseIndices[String(bill.number)] || [];
                return (
                  <div key={idx} className="graph-bill-card">
                    <div className="bill-badges">
                      {indices.length > 0
                        ? indices.map(i => (
                            <span
                              key={i}
                              className="promise-badge"
                              style={{ background: PROMISE_COLORS[i % PROMISE_COLORS.length] }}
                              title={rep.promises[i]?.topic}
                            >
                              {i + 1}
                            </span>
                          ))
                        : <span className="promise-badge no-match" title="No matching promise">–</span>
                      }
                    </div>
                    <div className="bill-info">
                      <span className="bill-tag">{bill.type.toUpperCase()} {bill.number}</span>
                      <span className="bill-title">{bill.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {breakdown.length > 0 && (
        <section className="breakdown-section">
          <h2>Detailed Breakdown</h2>
          <p className="graph-hint">Per-promise analysis from AI — scroll to see all.</p>
          <div className="breakdown-list">
            {breakdown.map((item, idx) => (
              <div key={idx} className="breakdown-item">
                <div className="breakdown-header">
                  <span
                    className="promise-badge"
                    style={{ background: PROMISE_COLORS[idx % PROMISE_COLORS.length] }}
                  >
                    {idx + 1}
                  </span>
                  <strong>{item.promiseTopic}</strong>
                </div>
                <p className="breakdown-promise-text">{item.promiseText}</p>
                <p className="breakdown-reasoning">{item.reasoning}</p>
                {item.correlatingBills.length > 0 ? (
                  <ul className="breakdown-bills">
                    {item.correlatingBills.map((bill, bi) => (
                      <li key={bi}>
                        <span className="bill-tag">{bill.type.toUpperCase()} {bill.number}</span>
                        {bill.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-bills">No correlated bills found.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {thinking && (
        <section className="thinking-section">
          <button
            className="thinking-toggle"
            onClick={() => setShowThinking(v => !v)}
          >
            {showThinking ? "▲ Hide AI Thinking" : "▼ Show AI Thinking Process"}
          </button>
          {showThinking && (
            <pre className="thinking-content">{thinking}</pre>
          )}
        </section>
      )}
    </div>
  );
}
