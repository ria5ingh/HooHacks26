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
  const districtNumber = Number.parseInt(String(data?.district ?? district), 10);
  const districtPortraitSrc =
    Number.isInteger(districtNumber) && districtNumber >= 1 && districtNumber <= 11
      ? `/rep-portraits/va-${String(districtNumber).padStart(2, "0")}.png`
      : "/rep-portraits/placeholder.svg";

  const billByNumber = useMemo(() => {
    const map = new Map();
    billTitles.forEach((bill) => map.set(String(bill.number), bill));
    return map;
  }, [billTitles]);

  const billIndexByNumber = useMemo(() => {
    const map = new Map();
    billTitles.forEach((bill, idx) => map.set(String(bill.number), idx));
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

  const diagramConnections = useMemo(() => {
    const out = [];
    breakdown.forEach((item, promiseIdx) => {
      item.correlatingBills.forEach((num) => {
        const billIdx = billIndexByNumber.get(String(num));
        if (billIdx === undefined) return;
        out.push({ promiseIdx, billIdx });
      });
    });
    return out;
  }, [breakdown, billIndexByNumber]);

  const diagramRows = Math.max(breakdown.length, billTitles.length, 1);
  const diagramHeight = Math.max(220, diagramRows * 54);

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
          <p>District {district} has no entry.</p>
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

        <div className="profile-visual-row">
          <figure className="rep-portrait-card">
            <img
              className="rep-portrait"
              src={districtPortraitSrc}
              alt={`${data.representative} district portrait`}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/rep-portraits/placeholder.svg";
              }}
            />
          </figure>

          <div className="profile-fulfillment">
            <h2>Promise Fulfillment Analysis</h2>
            {score !== null && (
              <div className="fulfillment-chart">
                <div className="fulfillment-track">
                  <div
                    className="fulfillment-bar"
                    style={{
                      "--score": `${normalizedScore}%`
                    }}
                    role="img"
                    aria-label={`Promise fulfillment score ${normalizedScore} percent`}
                  >
                    <span>{normalizedScore}%</span>
                  </div>
                  <div className="fulfillment-metrics">
                    <span className="fulfillment-score">{normalizedScore}% Fulfilled</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {breakdown.length > 0 && (
        <section className="graph-section reveal-on-scroll">
          <h2>Promises vs. Sponsored Bills</h2>

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

          <div className="promise-map reveal-on-scroll">
            <h3>Promise-to-Bill Arrow Diagram</h3>
            <div className="promise-map-wrap">
              <svg
                className="promise-map-svg"
                viewBox={`0 0 1000 ${diagramHeight}`}
                role="img"
                aria-label="Arrow diagram mapping campaign promises to recently sponsored bills"
              >
                <defs>
                  <marker
                    id="promise-arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L6,3 z" fill="#7e4f2f" />
                  </marker>
                </defs>

                {diagramConnections.map((link, idx) => {
                  const y1 = 28 + link.promiseIdx * 54;
                  const y2 = 28 + link.billIdx * 54;
                  const color = PROMISE_COLORS[link.promiseIdx % PROMISE_COLORS.length];
                  return (
                    <path
                      key={`${link.promiseIdx}-${link.billIdx}-${idx}`}
                      d={`M 320 ${y1} C 445 ${y1}, 555 ${y2}, 680 ${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      markerEnd="url(#promise-arrowhead)"
                      opacity="0.86"
                    />
                  );
                })}

                {breakdown.map((item, idx) => {
                  const y = 28 + idx * 54;
                  const promiseLabel =
                    item.promiseTopic.length > 30
                      ? `${item.promiseTopic.slice(0, 27)}...`
                      : item.promiseTopic;
                  const color = PROMISE_COLORS[idx % PROMISE_COLORS.length];

                  return (
                    <g key={`promise-node-${idx}`}>
                      <rect x="20" y={y - 16} width="286" height="32" rx="9" fill="#fff4e1" stroke="#e4c8a6" />
                      <circle cx="320" cy={y} r="6" fill={color} />
                      <text x="34" y={y + 4} className="promise-map-label">{idx + 1}. {promiseLabel}</text>
                    </g>
                  );
                })}

                {billTitles.map((bill, idx) => {
                  const y = 28 + idx * 54;
                  const rawLabel = `${bill.type.toUpperCase()} ${bill.number}`;
                  const billLabel = rawLabel.length > 28 ? `${rawLabel.slice(0, 25)}...` : rawLabel;

                  return (
                    <g key={`bill-node-${idx}`}>
                      <circle cx="680" cy={y} r="6" fill="#8f5b33" />
                      <rect x="694" y={y - 16} width="286" height="32" rx="9" fill="#fff4e1" stroke="#e4c8a6" />
                      <text x="708" y={y + 4} className="promise-map-label">{billLabel}</text>
                    </g>
                  );
                })}

                {diagramConnections.length === 0 && (
                  <text x="500" y="120" textAnchor="middle" className="promise-map-empty">
                    No mapped correlations available for this district.
                  </text>
                )}
              </svg>
            </div>
          </div>
        </section>
      )}

      {breakdown.length > 0 && (
        <section className="breakdown-section reveal-on-scroll">
          <h2>Detailed Breakdown</h2>
          <p className="graph-hint">Per-promise analysis.</p>
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