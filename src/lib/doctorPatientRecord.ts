import { toApiAssetUrl } from "@/lib/api";

export type DoctorPatientHistoryItem = {
  title: string;
  date: string;
  type: string;
  summary: string;
  reportFile?: string;
  reportUrl?: string;
  reportFileName?: string;
};

export type DoctorPatientReport = {
  title: string;
  date: string;
  url: string;
  fileName: string;
};

export type DoctorPrescriptionItem = {
  medicine: string;
  dosage: string;
  duration: string;
};

export type DoctorPatientRecord = {
  id: string;
  name: string;
  age: number | null;
  gender: string;
  bloodGroup: string;
  contact: string;
  email?: string;
  address?: string;
  majorHealthIssues?: string[];
  aiSummary: string;
  aiHighlights: string[];
  aiGeneratedAt?: string;
  medicalHistory: DoctorPatientHistoryItem[];
  reports: DoctorPatientReport[];
  prescriptions: DoctorPrescriptionItem[];
  qrToken?: string;
};

function formatDisplayDate(value: string | number | Date | undefined) {
  if (!value) {
    return "Unknown date";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString();
}

export function buildDoctorPatientRecord(
  profile: any,
  history: any[] = [],
  prescriptions: any[] = [],
  summary: any = {},
): DoctorPatientRecord {
  return {
    id: profile._id,
    name: profile.userId?.name || "Unknown patient",
    age: profile.age ?? null,
    gender: profile.gender || "Not recorded",
    bloodGroup: profile.bloodGroup || "Not recorded",
    contact: profile.contactNumber || "Not recorded",
    email: profile.userId?.email,
    address: profile.address,
    majorHealthIssues: profile.majorIssues || [],
    aiSummary: summary.summary || "No AI summary available yet.",
    aiHighlights: summary.highlights || [],
    aiGeneratedAt: summary.generatedAt,
    medicalHistory: history.map((item: any) => ({
      title: item.title,
      date: formatDisplayDate(item.date),
      type: item.type,
      summary: item.description || "",
      reportFile: item.reportFile,
      reportUrl: item.reportFile ? toApiAssetUrl(item.reportFile) : undefined,
      reportFileName: item.reportFileName || "report",
    })),
    reports: history
      .filter((item: any) => item.reportFile)
      .map((item: any) => ({
        title: item.title,
        date: formatDisplayDate(item.date),
        url: toApiAssetUrl(item.reportFile),
        fileName: item.reportFileName || "report",
      })),
    prescriptions: prescriptions.flatMap((prescription: any) =>
      (prescription.medicines || []).map((medicine: any) => ({
        medicine: medicine.name,
        dosage: medicine.dosage,
        duration: medicine.duration,
      })),
    ),
    qrToken: profile.qrCode,
  };
}
