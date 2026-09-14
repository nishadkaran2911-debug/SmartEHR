import { describe, expect, it } from "vitest";
import { buildDoctorPatientRecord } from "@/lib/doctorPatientRecord";

describe("buildDoctorPatientRecord", () => {
  it("normalizes doctor-facing patient chart data", () => {
    const record = buildDoctorPatientRecord(
      {
        _id: "patient-7",
        age: 30,
        gender: "Female",
        bloodGroup: "AB+",
        contactNumber: "8888888888",
        qrCode: "qr-token",
        userId: {
          name: "Sara Khan",
          email: "sara@example.com",
        },
      },
      [
        {
          title: "Blood Test",
          type: "Lab",
          date: "2026-04-20T00:00:00.000Z",
          description: "Routine lab panel",
          reportFile: "/uploads/reports/report.pdf",
          reportFileName: "report.pdf",
        },
      ],
      [
        {
          medicines: [
            {
              name: "Metformin",
              dosage: "500mg",
              duration: "30 days",
            },
          ],
        },
      ],
      {
        summary: "Patient is stable.",
        highlights: ["Follow-up needed"],
        generatedAt: "2026-04-21T00:00:00.000Z",
      },
    );

    expect(record.name).toBe("Sara Khan");
    expect(record.reports[0]?.url).toBe("http://localhost:5000/uploads/reports/report.pdf");
    expect(record.medicalHistory[0]?.reportUrl).toBe("http://localhost:5000/uploads/reports/report.pdf");
    expect(record.prescriptions[0]).toEqual({
      medicine: "Metformin",
      dosage: "500mg",
      duration: "30 days",
    });
  });

  it("fills in safe defaults when some fields are missing", () => {
    const record = buildDoctorPatientRecord({ _id: "patient-2" }, [], [], {});

    expect(record.name).toBe("Unknown patient");
    expect(record.aiSummary).toBe("No AI summary available yet.");
    expect(record.bloodGroup).toBe("Not recorded");
  });
});
