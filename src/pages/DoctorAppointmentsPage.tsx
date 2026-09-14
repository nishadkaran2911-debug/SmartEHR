import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Loader2, UserRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

type DoctorAppointment = {
  _id: string;
  date: string;
  time?: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  patient: {
    _id: string;
    name: string;
    email: string;
    age?: number | null;
    gender?: string;
  };
};

const statusClass: Record<DoctorAppointment["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
};

export default function DoctorAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [timeByAppointment, setTimeByAppointment] = useState<Record<string, string>>({});

  const loadAppointments = async () => {
    const data = await apiFetch("/doctors/appointments");
    setAppointments(data as DoctorAppointment[]);
  };

  useEffect(() => {
    loadAppointments()
      .catch((error: any) => toast.error(error.message || "Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAppointments().catch(() => {
        // Silent poll failure.
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (appointmentId: string) => {
    const time = (timeByAppointment[appointmentId] || "").trim();
    if (!time) {
      toast.error("Please select appointment time");
      return;
    }

    setSubmittingId(appointmentId);
    try {
      await apiFetch(`/doctors/appointments/${appointmentId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ time })
      });
      toast.success("Appointment approved");
      setTimeByAppointment((prev) => ({ ...prev, [appointmentId]: "" }));
      await loadAppointments();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve appointment");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (appointmentId: string) => {
    setSubmittingId(appointmentId);
    try {
      await apiFetch(`/doctors/appointments/${appointmentId}/reject`, {
        method: "PATCH"
      });
      toast.success("Appointment rejected");
      await loadAppointments();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject appointment");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Doctor Appointments</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review and approve patient requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve pending requests by assigning consultation time. Patients receive dashboard updates and email confirmation.
        </p>
      </section>

      <section className="space-y-4">
        {appointments.length === 0 && (
          <div className="soft-surface rounded-[1.75rem] border border-white/60 bg-white/85 p-6 text-sm text-muted-foreground dark:border-white/12 dark:bg-slate-900/75">
            No appointment requests available.
          </div>
        )}

        {appointments.map((appointment) => {
          const isPending = appointment.status === "pending";
          const busy = submittingId === appointment._id;

          return (
            <article
              key={appointment._id}
              className="soft-surface rounded-[1.75rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    <UserRound className="h-4 w-4 text-primary" /> {appointment.patient.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{appointment.patient.email}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass[appointment.status]}`}>
                  {appointment.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> Requested Date: {new Date(appointment.date).toLocaleDateString()}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" /> Time: {appointment.time || "Not assigned"}
                </p>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">Reason: {appointment.reason}</p>

              {isPending && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Input
                    type="time"
                    className="w-44 rounded-xl"
                    value={timeByAppointment[appointment._id] || ""}
                    onChange={(event) =>
                      setTimeByAppointment((prev) => ({ ...prev, [appointment._id]: event.target.value }))
                    }
                  />
                  <Button onClick={() => handleApprove(appointment._id)} disabled={busy} className="rounded-xl">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => handleReject(appointment._id)}
                    disabled={busy}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
