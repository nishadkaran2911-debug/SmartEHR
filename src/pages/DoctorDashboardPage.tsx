import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Loader2, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function DoctorDashboardPage() {
  const { session } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    const [doctorData, appointmentData] = await Promise.all([
      apiFetch("/doctors/dashboard"),
      apiFetch("/doctors/appointments")
    ]);
    setDoctor(doctorData);
    setAppointments(appointmentData as any[]);
  };

  useEffect(() => {
    if (session?.role === 'doctor') {
      loadDashboard()
        .catch(() => {
          // Initial load errors are handled by fallback UI.
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.role !== "doctor") return;
    const interval = setInterval(() => {
      loadDashboard().catch(() => {
        // Keep polling silent.
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [session]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!doctor) return <div className="p-10 text-center">Doctor not found</div>;

  const pendingAppointments = appointments.filter((item) => item.status === "pending");
  const statusClass: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-100 text-green-800 border-green-200",
    rejected: "bg-red-100 text-red-800 border-red-200"
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Doctor Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {doctor.userId?.name}</h1>
        <p className="mt-2 text-muted-foreground">{doctor.specialization} at {doctor.hospitalName}</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <h2 className="text-xl font-semibold">Patient Access</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Scan a patient's Secure QR code to verify their identity and unlock their encrypted medical records.</p>
          <div className="mt-6 flex justify-start">
            <Link to="/doctor/scan" className="rounded-2xl bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90">
              Open QR Scanner
            </Link>
          </div>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
          <h2 className="text-xl font-semibold flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Schedule</h2>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Pending Requests: {pendingAppointments.length}</p>
            {appointments.length === 0 && (
              <p className="text-muted-foreground text-sm">No appointment requests yet.</p>
            )}
            {appointments.slice(0, 3).map((appointment) => (
              <div key={appointment._id} className="rounded-2xl border border-white/70 bg-background/75 p-4 dark:border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{appointment.patient?.name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${statusClass[appointment.status] || statusClass.pending}`}>
                    {appointment.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(appointment.date).toLocaleDateString()} {appointment.time ? `| ${appointment.time}` : ""}</p>
              </div>
            ))}
            <div className="pt-2">
              <Link to="/doctor/appointments" className="text-sm font-semibold text-primary hover:underline">
                Manage all appointments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
