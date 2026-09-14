import type { DoctorPatientRecord } from "@/lib/doctorPatientRecord";

type StoredSession = {
  _id: string;
  name: string;
  role: "patient" | "doctor" | "admin";
  email: string;
};

export type CachedPatientChart = {
  patientId: string;
  cachedAt: string;
  data: DoctorPatientRecord;
};

const SESSION_KEY = "smart-ehr-session";
const LATEST_PATIENT_KEY = "smart-ehr-latest-patient-cache";
const PATIENT_CACHE_PREFIX = "smart-ehr-patient-cache:";

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function saveCachedSession(session: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readCachedSession() {
  return readJson<StoredSession>(SESSION_KEY);
}

export function clearCachedSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

export function saveCachedPatientChart(patient: DoctorPatientRecord) {
  if (typeof window === "undefined") {
    return;
  }

  const entry: CachedPatientChart = {
    patientId: patient.id,
    cachedAt: new Date().toISOString(),
    data: patient,
  };

  window.localStorage.setItem(`${PATIENT_CACHE_PREFIX}${patient.id}`, JSON.stringify(entry));
  window.localStorage.setItem(LATEST_PATIENT_KEY, patient.id);
}

export function readCachedPatientChart(patientId: string) {
  return readJson<CachedPatientChart>(`${PATIENT_CACHE_PREFIX}${patientId}`);
}

export function readLatestCachedPatientChart() {
  if (typeof window === "undefined") {
    return null;
  }

  const patientId = window.localStorage.getItem(LATEST_PATIENT_KEY);

  if (!patientId) {
    return null;
  }

  return readCachedPatientChart(patientId);
}

export function clearCachedPatientChart(patientId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(`${PATIENT_CACHE_PREFIX}${patientId}`);

  if (window.localStorage.getItem(LATEST_PATIENT_KEY) === patientId) {
    window.localStorage.removeItem(LATEST_PATIENT_KEY);
  }
}

export function clearAllCachedPatientCharts() {
  if (typeof window === "undefined") {
    return;
  }

  const keysToDelete: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key?.startsWith(PATIENT_CACHE_PREFIX)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => window.localStorage.removeItem(key));
  window.localStorage.removeItem(LATEST_PATIENT_KEY);
}

export function isNetworkError(error: unknown) {
  if (error instanceof TypeError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message);
}
