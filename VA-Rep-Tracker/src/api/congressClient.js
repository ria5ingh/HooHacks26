import axios from "axios";

const congress_key = import.meta.env.VITE_CONGRESS_API_KEY

//instantiate axios instance for the congress API calls
const congressClient = axios.create({
  baseURL: "https://api.congress.gov/v3",
  timeout: 10000,
  params: { format: "json", api_key: congress_key }
});

//if app launched in dev env, requests are intercepted by axios for centralized logging
congressClient.interceptors.request.use(config => {
  if (import.meta.env.DEV) {
    console.log(`[Congress] → ${config.method.toUpperCase()} ${config.url}`, config.params);
  }
  return config;
});

//centralized error handling
//this funuction intercepts the response; respoonse.use() reququires two params:
        //first is the Function to be called on success,
        //second is the Function to be called on failure

congressClient.interceptors.response.use(
    //one line  arrow function on sucess (just return the response)
  response => response,
  //error function, handle and print based on code
  error => {
    if (error.response) {
      const status = error.response.status;
      if (status === 403) {
        console.error("[Congress] Bad API key — check VITE_CONGRESS_KEY in .env");
      } else if (status === 429) {
        console.warn("[Congress] Rate limited — slow down requests");
      } else {
        console.error(`[Congress] HTTP ${status}`, error.response.data);
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("[Congress] Request timed out");
    } else {
      console.error("[Congress] Network error", error.message);
    }
    //most return the Promise object so that the errors can be seen when this interception occurs
            //elsewhere
    return Promise.reject(error);
  }
);

export default congressClient;