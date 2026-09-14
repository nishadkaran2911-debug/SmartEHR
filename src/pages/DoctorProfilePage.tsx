import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { BadgeCheck, Loader2, ShieldAlert } from "lucide-react";

export default function DoctorProfilePage() {
  const { session } = useAuth();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.role === 'doctor') {
      apiFetch('/doctors/dashboard')
        .then(data => setDoctor(data))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (loading) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!doctor) return <div className="p-10 text-center">Doctor profile not found</div>;

  return (
    <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75 animate-fade-in">
      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Doctor Profile</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{doctor.userId?.name}</h1>
      <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${doctor.isVerified
        ? "border-green-200 bg-green-100 text-green-800"
        : "border-red-200 bg-red-100 text-red-800"
        }`}>
        {doctor.isVerified ? <BadgeCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        {doctor.isVerified ? "Verified Doctor" : "Verification Pending"}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Age", String(doctor.age)],
          ["Qualification", doctor.qualification],
          ["Specialization", doctor.specialization],
          ["Experience", `${doctor.experience} years`],
          ["NPI Number", doctor.npiNumber || "Not available"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[1.5rem] border border-white/70 bg-background/75 p-5 dark:border-white/10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-foreground">{value}</p>
          </div>
        ))}
      </div>
      {doctor.isVerified && (
        <p className="mt-5 text-sm text-muted-foreground">
          Verified via {doctor.verificationSource || "NPI Registry"} as <span className="font-semibold text-foreground">{doctor.registryName}</span>.
        </p>
      )}
    </div>
  );
}
