// App.jsx
import { generateContent } from "./api/geminiClient";

// test of geminiClient using generateContent() function
generateContent("How does AI work?").then(console.log);

export default function App() {
  return <div>VA Rep Dashboard</div>
}