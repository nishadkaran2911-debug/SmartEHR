import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllCachedPatientCharts,
  clearCachedSession,
  readCachedPatientChart,
  readCachedSession,
  readLatestCachedPatientChart,
  saveCachedPatientChart,
  saveCachedSession,
} from "@/lib/offlineStore";
import type { DoctorPatientRecord } from "@/lib/doctorPatientRecord";

const samplePatient: DoctorPatientRecord = {
  id: "patient-1",
  name: "Aarav Patel",
  age: 42,
  gender: "Male",
  bloodGroup: "O+",
  contact: "9999999999",
  aiSummary: "Stable patient summary.",
  aiHighlights: ["Diabetes"],
  medicalHistory: [],
  reports: [],
  prescriptions: [],
};

describe("offlineStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores and restores the cached session", () => {
    saveCachedSession({
      _id: "doctor-1",
      name: "Dr. Mehta",
      role: "doctor",
      email: "doctor@example.com",
    });

    expect(readCachedSession()).toEqual({
      _id: "doctor-1",
      name: "Dr. Mehta",
      role: "doctor",
      email: "doctor@example.com",
    });

    clearCachedSession();
    expect(readCachedSession()).toBeNull();
  });

  it("stores patient charts and tracks the latest cached chart", () => {
    saveCachedPatientChart(samplePatient);

    const cachedChart = readCachedPatientChart("patient-1");
    expect(cachedChart?.data.name).toBe("Aarav Patel");
    expect(readLatestCachedPatientChart()?.patientId).toBe("patient-1");
  });

  it("clears all stored patient charts", () => {
    saveCachedPatientChart(samplePatient);
    clearAllCachedPatientCharts();

    expect(readCachedPatientChart("patient-1")).toBeNull();
    expect(readLatestCachedPatientChart()).toBeNull();
  });
});
