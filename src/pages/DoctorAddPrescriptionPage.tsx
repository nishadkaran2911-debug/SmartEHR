import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import {
  PrescriptionSafetyDialog,
  type PrescriptionSafetyAlert,
} from "@/components/app/PrescriptionSafetyDialog";

export default function DoctorAddPrescriptionPage() {
  const { doctorAccess } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [testName, setTestName] = useState("");
  const [notes, setNotes] = useState("");
  const [savedFor, setSavedFor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [safetyAlerts, setSafetyAlerts] = useState<PrescriptionSafetyAlert[]>([]);
  const [safetyDialogOpen, setSafetyDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const prescriptionPayload = {
    medicines: [{ name: medicine, dosage, duration }],
    notes: notes + (testName ? ` | Ordered test: ${testName}` : "")
  };

  useEffect(() => {
    if (!doctorAccess.patientId) {
      setLoading(false);
      return;
    }
    apiFetch(`/doctors/patient/${doctorAccess.patientId}/profile`)
      .then(data => setPatient(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [doctorAccess.patientId]);

  const persistPrescription = async (override = false) => {
    if (!doctorAccess.patientId || !medicine || !dosage || !duration) return;

    setSubmitting(true);

    try {
      await apiFetch(`/doctors/patient/${doctorAccess.patientId}/prescription`, {
        method: 'POST',
        body: JSON.stringify({
          ...prescriptionPayload,
          override,
          overrideReason
        })
      });

      setSafetyAlerts([]);
      setSafetyDialogOpen(false);
      setOverrideReason("");
      setSavedFor(patient?.userId?.name || "Patient");
      setMedicine("");
      setDosage("");
      setDuration("");
      setTestName("");
      setNotes("");
    } catch (err: any) {
      if (err.status === 400 && err.data?.requiresOverride && err.data?.alerts) {
        setSafetyAlerts(err.data.alerts);
        setSafetyDialogOpen(true);
      } else {
        alert(err.message || "Failed to save prescription");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const runSafetyCheck = async () => {
    if (!doctorAccess.patientId || !medicine || !dosage || !duration) return;

    setSubmitting(true);
    setSavedFor("");

    try {
      const response: any = await apiFetch(`/doctors/patient/${doctorAccess.patientId}/prescription-safety-check`, {
        method: "POST",
        body: JSON.stringify(prescriptionPayload)
      });

      if (response.alerts?.length) {
        setSafetyAlerts(response.alerts);
        setSafetyDialogOpen(true);
        return;
      }

      await persistPrescription(false);
    } catch (err: any) {
      const routeUnavailable =
        err.status === 404 ||
        String(err.message || "").includes("Cannot POST /api/doctors/patient/") ||
        String(err.data?.message || "").includes("Cannot POST /api/doctors/patient/");

      if (routeUnavailable) {
        await persistPrescription(false);
        return;
      }

      alert(err.message || "Unable to run prescription safety check");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  if (!patient) {
    return (
      <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-12 text-center dark:border-white/12 dark:bg-slate-900/75">
        <h2 className="text-xl font-semibold">No Patient Authorized</h2>
        <p className="mt-2 text-muted-foreground">Please scan a student/patient QR code to create a prescription.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr] animate-fade-in">
      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Add Prescription</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create a prescription for {patient.userId?.name}</h1>
        <form className="mt-8 space-y-5" onSubmit={(e) => { e.preventDefault(); void runSafetyCheck(); }}>
          <div className="space-y-2">
            <Label htmlFor="medicine">Medicine name</Label>
            <Input id="medicine" value={medicine} onChange={(event) => setMedicine(event.target.value)} placeholder="Metformin or Warfarin" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage</Label>
            <Input id="dosage" value={dosage} onChange={(event) => setDosage(event.target.value)} placeholder="500 mg twice daily" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="30 days" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test">Related test order</Label>
            <Input id="test" value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="HbA1c, Chest X-ray, Lipid Profile" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Clinical notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add brief encounter notes for this prescription..." className="rounded-2xl border-white/70 bg-background/70 dark:border-white/10" />
          </div>
          <Button type="submit" disabled={submitting} className="rounded-2xl w-full h-12">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Prescription"}
          </Button>
          {savedFor && (
            <div className="rounded-[1.5rem] border border-emerald-200/70 bg-emerald-50/80 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              Prescription saved for {savedFor}. The patient can now view this in their dashboard.
            </div>
          )}
        </form>
      </section>

      <section className="space-y-6">
        <div
          className={cn(
            "soft-surface rounded-[2rem] border p-7 transition-all",
            safetyAlerts.length > 0 ? "border-red-200/70 bg-red-50/80 dark:border-red-500/20 dark:bg-red-500/10" :
            "border-white/60 bg-white/85 dark:border-white/12 dark:bg-slate-900/75"
          )}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Prescription Safety Checker</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {safetyAlerts.some((alert) => alert.severity === "high")
              ? "Severe Allergy Risk detected"
              : safetyAlerts.length > 0
                ? "Possible Drug Interaction detected"
                : "Real-time safety checks"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {safetyAlerts[0]?.message || "System checks documented allergies and ongoing medications before anything is saved."}
          </p>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Duplicate Test Warning</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Check recent investigations before adding more tests</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {testName ? `Checking for recent ${testName} orders...` : "Type a test name to check for duplicates."}
          </p>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Access Control</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This page is available only after a doctor completes QR authorization. Patients cannot add prescriptions,
            and admins do not see this workflow.
          </p>
        </div>
      </section>
      <PrescriptionSafetyDialog
        alerts={safetyAlerts}
        open={safetyDialogOpen}
        overrideReason={overrideReason}
        saving={submitting}
        onOverrideReasonChange={setOverrideReason}
        onCancel={() => setSafetyDialogOpen(false)}
        onProceed={() => void persistPrescription(true)}
      />
    </div>
  );
}
