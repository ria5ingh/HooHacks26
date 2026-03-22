import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import sampleAIresponsesRaw from "../data/sampleAIresponses.json?raw";

const PROMISE_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12",
  "#9b59b6", "#1abc9c", "#e67e22", "#34495e",
  "#e91e63", "#00bcd4"
];

function parseSampleResponses(rawText) {
  try {
    const parsed = JSON.parse(rawText || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const sampleAIresponses = useMemo(() => parseSampleResponses(sampleAIresponsesRaw), []);

  const district = location.state?.district;
  const county = location.state?.county || "Unknown county";

  const data = useMemo(
    () => sampleAIresponses.find((item) => String(item.district) === String(district)),
    [district]
  );

  const score = data?.response?.score ?? null;
  const breakdown = data?.response?.breakdown ?? [];
  const billTitles = data?.billTitles ?? [];
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
  const meterCells = 60;
  const fulfilledCells = Math.round((normalizedScore / 100) * meterCells);

  const billByNumber = useMemo(() => {
    const map = new Map();
    billTitles.forEach((bill) => map.set(String(bill.number), bill));
    return map;
  }, [billTitles]);

  const billToPromiseIndices = useMemo(() => {
    const out = {};
    breakdown.forEach((item, idx) => {
      item.correlatingBills.forEach((num) => {
        const key = String(num);
        if (!out[key]) out[key] = [];
        out[key].push(idx);
      });
    });
    return out;
  }, [breakdown]);

  useEffect(() => {
    const elements = document.querySelectorAll(".rep-detail .reveal-on-scroll");
    if (!elements.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      elements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    elements.forEach((el, idx) => {
      el.style.setProperty("--reveal-delay", `${Math.min(idx * 30, 260)}ms`);
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [breakdown.length, billTitles.length]);

  if (!district) {
    return (
      <div className="rep-detail">
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Search</button>
        <section className="rep-info">
          <h1>No District Selected</h1>
          <p>Please go back and choose a county to view results.</p>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rep-detail">
        <button className="back-btn" onClick={() => navigate("/")}>← Back to Search</button>
        <section className="rep-info">
          <h1>No Sample Data Found</h1>
          <p>District {district} has no entry in sampleAIresponses.json.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="rep-detail">
      <button className="back-btn" onClick={() => navigate("/")}>← Back to Search</button>

      <section className="rep-info reveal-on-scroll">
        <p className="rep-kicker">Representative Profile</p>
        <h1 className="rep-name">{data.representative}</h1>
        <div className="rep-meta">
          <span className="rep-chip">
            <strong>County</strong>
            {county}
          </span>
          <span className="rep-chip">
            <strong>District</strong>
            VA-{data.district}
          </span>
          <span className="rep-chip">
            <strong>Party</strong>
            {data.party}
          </span>
        </div>

        {score !== null && (
          <div
            className="kinetic-meter"
            role="img"
            aria-label={`Promise fulfillment ${normalizedScore} percent. ${fulfilledCells} of ${meterCells} active cells.`}
          >
            <div className="km-head">
              <p className="km-percent">{normalizedScore}%</p>
              <p className="km-subtitle">Promise Fulfillment</p>
            </div>

            <div className="km-grid" aria-hidden="true">
              {Array.from({ length: meterCells }, (_, idx) => {
                const isActive = idx < fulfilledCells;
                return (
                  <span
                    key={idx}
                    className={`km-cell ${isActive ? "is-active" : "is-inactive"}`}
                    style={{ "--cell-delay": `${(idx % 20) * 60}ms` }}
                  />
                );
              })}
            </div>

            <div className="km-legend">
              <span className="km-pill km-pill-good">Fulfilled</span>
              <span className="km-pill km-pill-rest">Remaining</span>
            </div>
          </div>
        )}
      </section>

      {breakdown.length > 0 && (
        <section className="graph-section reveal-on-scroll">
            <h2>Promises vs. Sponsored Bills</h2>
            <p className="graph-hint">Data source: sampleAIresponses.json.</p>

            <div className="graph-layout">
              <div className="graph-col graph-col--promises">
                <h3>Campaign Promises</h3>
                {breakdown.map((item, idx) => (
                  <div key={idx} className="graph-promise-card reveal-on-scroll" style={{ "--stagger": idx }}>
                    <span
                      className="promise-badge"
                      style={{ background: PROMISE_COLORS[idx % PROMISE_COLORS.length] }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <strong>{item.promiseTopic}</strong>
                      <p>{item.promiseText}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="graph-col graph-col--bills">
                <h3>Most Recently Sponsored Bills</h3>
                {billTitles.map((bill, idx) => {
                  const indices = billToPromiseIndices[String(bill.number)] || [];
                  return (
                    <div key={idx} className="graph-bill-card reveal-on-scroll" style={{ "--stagger": idx }}>
                      <div className="bill-badges">
                        {indices.length > 0
                          ? indices.map((i) => (
                              <span
                                key={i}
                                className="promise-badge"
                                style={{ background: PROMISE_COLORS[i % PROMISE_COLORS.length] }}
                                title={breakdown[i]?.promiseTopic}
                              >
                                {i + 1}
                              </span>
                            ))
                          : <span className="promise-badge no-match" title="No matching promise">-</span>
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
        <section className="breakdown-section reveal-on-scroll">
          <h2>Detailed Breakdown</h2>
          <p className="graph-hint">Per-promise analysis from sample AI output.</p>
          <div className="breakdown-list">
            {breakdown.map((item, idx) => (
              <div key={idx} className="breakdown-item reveal-on-scroll" style={{ "--stagger": idx }}>
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
                    {item.correlatingBills.map((num, bi) => {
                      const bill = billByNumber.get(String(num));
                      return (
                        <li key={bi}>
                          <span className="bill-tag">{bill?.type?.toUpperCase() || "BILL"} {num}</span>
                          {bill?.title || "Title unavailable"}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="no-bills">No correlated bills found.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}