import { useEffect, useMemo, useRef, useState } from "react";
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

function hexToRgba(hex, alpha) {
  const clean = String(hex || "").replace("#", "").trim();
  if (clean.length !== 6) return `rgba(143, 91, 51, ${alpha})`;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

  const districtMapSrc =
    Number.isInteger(districtNumber) && districtNumber >= 1 && districtNumber <= 11
      ? `/district-maps/dist-${String(districtNumber).padStart(2, "0")}.png`
      : "/district-maps/placeholder.svg";

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

  const [expandedBills, setExpandedBills] = useState(new Set());
  const [hoveredPromiseIdx, setHoveredPromiseIdx] = useState(null);
  const [arrowData, setArrowData] = useState({ lines: [], w: 0, h: 0 });
  const containerRef = useRef(null);
  const promiseRefs = useRef([]);
  const billRefs = useRef([]);
  const billAnchorRefs = useRef([]);

  const toggleBill = (idx) => {
    setExpandedBills(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  useEffect(() => {
    if (!containerRef.current || !diagramConnections.length) return;
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const w = cRect.width;
      const h = container.offsetHeight;
      const lines = diagramConnections.flatMap(({ promiseIdx, billIdx }) => {
        const pEl = promiseRefs.current[promiseIdx];
        const bEl = billAnchorRefs.current[billIdx];
        if (!pEl || !bEl) return [];
        const pRect = pEl.getBoundingClientRect();
        const bRect = bEl.getBoundingClientRect();
        return [{
          x1: pRect.right - cRect.left,
          y1: pRect.top + pRect.height / 2 - cRect.top,
          x2: bRect.left - cRect.left,
          y2: bRect.top + bRect.height / 2 - cRect.top,
          promiseIdx,
        }];
      });
      setArrowData({ lines, w, h });
    }
    const rafId = requestAnimationFrame(measure);
    const observer = new ResizeObserver(() => requestAnimationFrame(measure));
    observer.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [diagramConnections]);

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
            <h2>Promise Fulfillment Score</h2>
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
                </div>
              </div>
            )}
          </div>

          <figure className="district-map-card">
            <img
              className="district-map"
              src={districtMapSrc}
              alt={`Congressional district ${districtNumber} map`}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/district-maps/placeholder.svg";
              }}
            />
            <figcaption className="district-map-label">VA-{data.district} District Map</figcaption>
          </figure>
        </div>
      </section>

      {breakdown.length > 0 && (
        <section className="graph-section reveal-on-scroll">
          <h2>Promises vs. Sponsored Bills</h2>

          <div className="graph-map-container" ref={containerRef}>
            {arrowData.lines.length > 0 && (
              <svg
                className="graph-map-overlay"
                width={arrowData.w}
                height={arrowData.h}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="graph-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="5"
                    refY="3"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L0,6 L6,3 z" fill="#8f5b33" opacity="0.7" />
                  </marker>
                </defs>
                {arrowData.lines.map(({ x1, y1, x2, y2, promiseIdx }, i) => {
                  const mx = (x1 + x2) / 2;
                  const color = PROMISE_COLORS[promiseIdx % PROMISE_COLORS.length];
                  return (
                    <path
                      key={i}
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      markerEnd="url(#graph-arrow)"
                      opacity="0.65"
                    />
                  );
                })}
              </svg>
            )}

            <div className="graph-layout">
              <div className="graph-col graph-col--promises">
                <h3>Campaign Promises</h3>
                {breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    className="graph-promise-card reveal-on-scroll"
                    style={{ "--stagger": idx }}
                    ref={el => { promiseRefs.current[idx] = el; }}
                    onMouseEnter={() => setHoveredPromiseIdx(idx)}
                    onMouseLeave={() => setHoveredPromiseIdx(null)}
                  >
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
                  const isExpanded = expandedBills.has(idx);
                  const isHoverMatch = hoveredPromiseIdx !== null && indices.includes(hoveredPromiseIdx);
                  const hoverColor = hoveredPromiseIdx !== null
                    ? PROMISE_COLORS[hoveredPromiseIdx % PROMISE_COLORS.length]
                    : "#8f5b33";
                  return (
                    <div
                      key={idx}
                      className={`graph-bill-card reveal-on-scroll${isExpanded ? " expanded" : ""}${isHoverMatch ? " is-hover-match" : ""}`}
                      style={{
                        "--stagger": idx,
                        "--hover-tint": hexToRgba(hoverColor, 0.2),
                        "--hover-border": hexToRgba(hoverColor, 0.55)
                      }}
                      onClick={() => toggleBill(idx)}
                      ref={el => { billRefs.current[idx] = el; }}
                    >
                      <div
                        className="bill-badges"
                        ref={el => { billAnchorRefs.current[idx] = el; }}
                      >
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
                        <div className="bill-info-header">
                          <span className="bill-tag">{bill.type.toUpperCase()} {bill.number}</span>
                          <span className="bill-expand-caret">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                        <span className="bill-title bill-title--truncated">
                          {bill.title}
                        </span>
                        {isExpanded && (
                          <div className="bill-title-dropdown">
                            {bill.title}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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