const congress_key = import.key.env.VITE_CONGRESS_API_KEY

const client = axios.create({
  baseURL: "https://api.congress.gov/v3",
  timeout: 10000,
  params: { format: "json", api_key: CONGRESS_API_KEY }
});