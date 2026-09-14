const envApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
export const API_URL = envApiUrl || "http://localhost:5000/api";
export const API_ROOT = API_URL.replace(/\/api$/, "");

export const getAuthToken = () => localStorage.getItem("ehr_token");
export const setAuthToken = (token: string) => localStorage.setItem("ehr_token", token);
export const removeAuthToken = () => localStorage.removeItem("ehr_token");
export const toApiAssetUrl = (assetPath: string) =>
  assetPath.startsWith("http") ? assetPath : `${API_ROOT}${assetPath.startsWith("/") ? assetPath : `/${assetPath}`}`;

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // some responses might not have json, so we catch parsing errors
  let data = {};
  if (response.headers.get("Content-Type")?.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (text) data = { message: text };
  }

  if (!response.ok) {
    const error: any = new Error((data as any).message || "An error occurred");
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
