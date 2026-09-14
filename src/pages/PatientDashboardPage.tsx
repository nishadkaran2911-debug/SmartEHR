import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

export default function PatientDashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<{ profile: any, history: any[], prescriptions: any[], appointments: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const profile = await apiFetch("/patients/dashboard");
        if (cancelled) return;

        setData((prev) => ({
          profile,
          history: prev?.history || [],
          prescriptions: prev?.prescriptions || [],
          appointments: prev?.appointments || []
        }));

        const [historyResult, prescriptionsResult, appointmentsResult] = await Promise.allSettled([
          apiFetch("/patients/history"),
          apiFetch("/patients/prescriptions"),
          apiFetch("/patients/appointments")
        ]);

        if (cancelled) return;

        const history = historyResult.status === "fulfilled" ? (historyResult.value as any[]) : [];
        const prescriptions = prescriptionsResult.status === "fulfilled" ? (prescriptionsResult.value as any[]) : [];
        const appointments = appointmentsResult.status === "fulfilled" ? (appointmentsResult.value as any[]) : [];

        setData({ profile, history, prescriptions, appointments });

        if (historyResult.status === "rejected" || prescriptionsResult.status === "rejected" || appointmentsResult.status === "rejected") {
          toast.error("Some patient modules failed to load, but profile data is available.");
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || "Failed to load patient dashboard");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (session?.role === 'patient') {
      loadDashboard();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!data?.profile) return <div className="p-10 text-center">Patient not found</div>;

  const patient = data.profile;
  const medsCount = data.prescriptions.reduce((acc: number, p: any) => acc + p.medicines.length, 0);
  const pendingAppointments = data.appointments.filter((item: any) => item.status === "pending").length;
  const statusClass: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Patient Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">A clear overview of ongoing care, appointments, and current health status</h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6 md:grid-cols-2">
            <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
              <p className="text-sm text-muted-foreground">Active Prescriptions</p>
              <p className="mt-4 text-3xl font-semibold">{medsCount}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Total medicines prescribed</p>
            </div>
            <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
              <p className="text-sm text-muted-foreground">Recent Visits</p>
              <p className="mt-4 text-3xl font-semibold">{data.history.length}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Medical history records</p>
            </div>
            <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
              <p className="text-sm text-muted-foreground">Major Health Issues</p>
              <p className="mt-4 text-3xl font-semibold">{patient.majorIssues?.length || 0}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Recorded conditions</p>
            </div>
            <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
              <p className="text-sm text-muted-foreground">Appointment Requests</p>
              <p className="mt-4 text-3xl font-semibold">{data.appointments.length}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Pending approvals: {pendingAppointments}</p>
              <Link to="/patient/appointments" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
                Open appointments
              </Link>
            </div>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Patient QR Access</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Unique QR for doctor authorization</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This QR proves identity for {patient.userId?.name}. Doctors use it to unlock your encrypted medical history and securely write prescriptions.
          </p>
          <div className="mt-6 flex flex-col items-center rounded-[2rem] border border-white/70 bg-background/75 p-6 dark:border-white/10">
            <QRCodeSVG value={patient.qrCode} size={180} bgColor="transparent" fgColor="currentColor" className="text-slate-900 dark:text-white" />
            <p className="mt-5 text-center text-xs uppercase tracking-[0.22em] text-muted-foreground">SECURE TOKEN ID</p>
            <p className="mt-2 break-all text-center text-sm font-medium text-foreground">{patient.qrCode}</p>
          </div>
        </div>
      </section>

      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Appointments</p>
            <h2 className="mt-2 text-xl font-semibold">Latest appointment updates</h2>
          </div>
          <Link to="/patient/appointments" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {data.appointments.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No appointments found.
            </p>
          )}
          {data.appointments.slice(0, 3).map((appointment: any) => (
            <div key={appointment._id} className="rounded-2xl border border-white/70 bg-background/75 p-4 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">{appointment.doctor?.name || "Unknown Doctor"}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusClass[appointment.status] || statusClass.pending}`}>
                  {appointment.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(appointment.date).toLocaleDateString()} {appointment.time ? `| ${appointment.time}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Reason: {appointment.reason}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
