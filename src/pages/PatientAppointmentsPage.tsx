import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, Loader2, Stethoscope } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";

type DoctorCard = {
  _id: string;
  name: string;
  specialization: string;
  qualification: string;
  hospitalName: string;
};

type PatientAppointment = {
  _id: string;
  date: string;
  time?: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  doctor: {
    _id: string;
    name: string;
    specialization: string;
    qualification: string;
    hospitalName: string;
  };
};

const statusClass: Record<PatientAppointment["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export default function PatientAppointmentsPage() {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorCard[]>([]);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorCard | null>(null);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const previousStatusRef = useRef<Record<string, string>>({});

  const loadPageData = async () => {
    const [doctorData, appointmentData] = await Promise.all([
      apiFetch("/patients/doctors"),
      apiFetch("/patients/appointments")
    ]);

    const typedDoctors = doctorData as DoctorCard[];
    const typedAppointments = appointmentData as PatientAppointment[];

    setDoctors(typedDoctors);
    setAppointments(typedAppointments);

    typedAppointments.forEach((item) => {
      const previous = previousStatusRef.current[item._id];
      if (previous && previous !== "approved" && item.status === "approved") {
        toast.success(`Appointment approved by ${item.doctor.name}`);
      }
      previousStatusRef.current[item._id] = item.status;
    });
  };

  useEffect(() => {
    loadPageData()
      .catch((error: any) => toast.error(error.message || "Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPageData().catch(() => {
        // Keep silent for background polling.
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const pendingCount = useMemo(
    () => appointments.filter((item) => item.status === "pending").length,
    [appointments]
  );

  const handleReset = () => {
    setDate("");
    setReason("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedDoctor) return;
    if (!date) {
      toast.error("Please choose appointment date");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter reason");
      return;
    }
    if (reason.trim().length < 5) {
      toast.error("Reason should be at least 5 characters");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/patients/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctorId: selectedDoctor._id,
          date,
          reason: reason.trim()
        })
      });
      toast.success("Appointment request sent");
      handleReset();
      setSelectedDoctor(null);
      await loadPageData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit appointment request");
    } finally {
      setSubmitting(false);
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
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Doctor Discovery</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Find doctors and request appointments</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Requests are sent with pending status. Doctors approve and assign the final consultation time.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((doctor) => (
          <article
            key={doctor._id}
            className="soft-surface rounded-[1.75rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{doctor.name}</h2>
                <p className="text-xs text-muted-foreground">{doctor.specialization || "General Practice"}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p>Qualification: {doctor.qualification || "Not provided"}</p>
              <p>Hospital: {doctor.hospitalName || "Not provided"}</p>
            </div>
            <Button className="mt-6 w-full rounded-2xl" onClick={() => setSelectedDoctor(doctor)}>
              Request Appointment
            </Button>
          </article>
        ))}
      </section>

      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">My Appointments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pending: {pendingCount} | Total: {appointments.length}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {appointments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No appointments requested yet.
            </div>
          )}
          {appointments.map((appointment) => (
            <article
              key={appointment._id}
              className="rounded-2xl border border-white/70 bg-background/75 p-5 dark:border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{appointment.doctor.name}</p>
                  <p className="text-sm text-muted-foreground">{appointment.doctor.hospitalName}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass[appointment.status]}`}>
                  {appointment.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> {new Date(appointment.date).toLocaleDateString()}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Clock3 className="h-4 w-4" /> {appointment.time || "Awaiting doctor approval"}
                </p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Reason: {appointment.reason}</p>
            </article>
          ))}
        </div>
      </section>

      <Dialog open={Boolean(selectedDoctor)} onOpenChange={(open) => !open && setSelectedDoctor(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Request Appointment</DialogTitle>
            <DialogDescription>
              {selectedDoctor ? `Send request to ${selectedDoctor.name}` : "Fill appointment details"}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="appointment-date">Date</Label>
              <Input
                id="appointment-date"
                type="date"
                min={getTodayDate()}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-reason">Reason</Label>
              <Textarea
                id="appointment-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder="Enter reason for consultation"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={submitting} className="rounded-2xl">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} className="rounded-2xl">
                Reset
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
