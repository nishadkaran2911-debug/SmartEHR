import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Loader2, Sparkles, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { buildDoctorPatientRecord, type DoctorPatientRecord } from "@/lib/doctorPatientRecord";
import { isNetworkError, readCachedPatientChart, saveCachedPatientChart } from "@/lib/offlineStore";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function DoctorPatientViewPage() {
  const { doctorAccess } = useAuth();
  const isOnline = useOnlineStatus();
  const [patient, setPatient] = useState<DoctorPatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [showingCachedCopy, setShowingCachedCopy] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!doctorAccess.patientId) {
        setPatient(null);
        setCachedAt(null);
        setShowingCachedCopy(false);
        setLoadMessage("");
        setLoading(false);
        return;
      }

      const cachedChart = readCachedPatientChart(doctorAccess.patientId);

      if (cachedChart && !cancelled) {
        setPatient(cachedChart.data);
        setCachedAt(cachedChart.cachedAt);
        setShowingCachedCopy(true);
        setLoadMessage("");
      }

      setLoading(!cachedChart);

      try {
        const [profile, history, prescriptions, summary] = await Promise.all([
          apiFetch(`/doctors/patient/${doctorAccess.patientId}/profile`),
          apiFetch(`/doctors/patient/${doctorAccess.patientId}/history`),
          apiFetch(`/doctors/patient/${doctorAccess.patientId}/prescriptions`),
          apiFetch(`/doctors/patient/${doctorAccess.patientId}/summary`),
        ]);

        if (cancelled) {
          return;
        }

        const nextPatient = buildDoctorPatientRecord(profile, history, prescriptions, summary);

        saveCachedPatientChart(nextPatient);
        setPatient(nextPatient);
        setCachedAt(new Date().toISOString());
        setShowingCachedCopy(false);
        setLoadMessage("");
      } catch (error) {
        console.error("Failed to fetch patient data", error);

        if (cancelled) {
          return;
        }

        if (cachedChart) {
          setPatient(cachedChart.data);
          setCachedAt(cachedChart.cachedAt);
          setShowingCachedCopy(true);
          setLoadMessage(
            isNetworkError(error)
              ? "You are offline, so this chart is coming from the last synced copy on this device."
              : "Live refresh failed, so this chart is showing the last synced copy on this device.",
          );
          return;
        }

        setPatient(null);
        setCachedAt(null);
        setShowingCachedCopy(false);
        setLoadMessage(
          isNetworkError(error)
            ? "No offline copy is stored for this patient yet. Connect once to sync the chart to this device."
            : error instanceof Error
              ? error.message
              : "Failed to load patient data.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [doctorAccess.patientId, isOnline]);

  const syncedLabel = useMemo(() => {
    if (!cachedAt) {
      return null;
    }

    const parsed = new Date(cachedAt);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toLocaleString();
  }, [cachedAt]);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-12 text-center dark:border-white/12 dark:bg-slate-900/75">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <WifiOff className="h-6 w-6" />
        </div>
        <h2 className="mt-5 text-xl font-semibold">
          {doctorAccess.patientId ? "No offline chart available yet" : "No Patient Authorized"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {doctorAccess.patientId
            ? loadMessage
            : "Please scan a student or patient QR code to view their chart."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Patient Medical History View</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Authorized chart review for {patient.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {showingCachedCopy ? "Cached chart" : "Live chart"}
            </span>
            <span className="rounded-full bg-background/80 px-4 py-2 text-xs font-medium text-muted-foreground">
              {isOnline ? "Internet connected" : "Offline mode"}
            </span>
          </div>
        </div>

        {(showingCachedCopy || loadMessage || syncedLabel) && (
          <div className="mt-6 rounded-[1.5rem] border border-primary/15 bg-primary/5 p-4 text-sm text-foreground">
            <div className="flex items-start gap-3">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">
                  {showingCachedCopy
                    ? "This patient chart is available offline on this device."
                    : "This chart has been synced for offline use."}
                </p>
                {loadMessage && <p className="text-muted-foreground">{loadMessage}</p>}
                {syncedLabel && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last synced {syncedLabel}</p>}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <h2 className="text-xl font-semibold">Profile</h2>
          <div className="mt-6 space-y-3">
            {[
              ["Name", patient.name],
              ["Age", patient.age === null ? "Not recorded" : String(patient.age)],
              ["Gender", patient.gender],
              ["Blood Group", patient.bloodGroup],
              ["Contact", patient.contact],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.25rem] border border-white/70 bg-background/75 px-4 py-3 dark:border-white/10">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AI Summary</h2>
              <p className="text-sm text-muted-foreground">Generated from profile data, timeline records, prescriptions, and uploaded reports.</p>
            </div>
          </div>
          <div className="mt-6 rounded-[1.75rem] border border-primary/15 bg-primary/5 p-5 text-sm leading-7 text-foreground">
            {patient.aiSummary}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {patient.aiHighlights?.map((item) => (
              <span key={item} className="rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <h2 className="text-xl font-semibold">History</h2>
          <div className="mt-6 space-y-4">
            {patient.medicalHistory.length === 0 && <p className="text-sm text-muted-foreground">No historical records found.</p>}
            {patient.medicalHistory.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-[1.5rem] border border-white/70 bg-background/75 p-5 dark:border-white/10">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.date} | {item.type}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                {item.reportFile && !isOnline && (
                  <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Report file metadata is available offline. Open it again when the internet returns.
                  </div>
                )}
                {item.reportUrl && isOnline && (
                  <a
                    href={item.reportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary"
                  >
                    <FileText className="h-4 w-4" />
                    Open {item.reportFileName || "report"}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
            <h2 className="text-xl font-semibold">Uploaded Reports</h2>
            <div className="mt-6 space-y-4">
              {patient.reports.length === 0 && <p className="text-sm text-muted-foreground">No uploaded reports available.</p>}
              {patient.reports.map((item, index) =>
                isOnline ? (
                  <a
                    key={`${item.title}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-[1.5rem] border border-white/70 bg-background/75 p-5 dark:border-white/10"
                  >
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.date}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{item.fileName}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </a>
                ) : (
                  <div
                    key={`${item.title}-${index}`}
                    className="flex items-center justify-between rounded-[1.5rem] border border-white/70 bg-background/75 p-5 dark:border-white/10"
                  >
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.date}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{item.fileName}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Online to open
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
            <h2 className="text-xl font-semibold">Current Prescriptions</h2>
            <div className="mt-6 space-y-4">
              {patient.prescriptions.length === 0 && <p className="text-sm text-muted-foreground">No active prescriptions.</p>}
              {patient.prescriptions.map((item, index) => (
                <div key={`${item.medicine}-${index}`} className="rounded-[1.5rem] border border-white/70 bg-background/75 p-5 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{item.medicine}</p>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Active</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.dosage} | {item.duration}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
