import { useLocation, useNavigate } from "react-router-dom";
import "./styles/app.css";

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const county = location.state?.county || "No county selected";

  return (
    <div className="app-container">
      <h1>Results Page</h1>
      <p>Selected County: <strong>{county}</strong></p>
      <p>This is the new page displaying the county from the search query.</p>
      <section className="submit-section">
        <button className="submit-button" onClick={() => navigate("/")}>
          Back To County Search
        </button>
      </section>
    </div>
  );
}