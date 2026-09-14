import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Stethoscope, UserRound, UserRoundCog, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role, getDefaultRoute } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { PwaInstallButton } from "@/components/app/PwaInstallButton";

const roleCards = [
  { role: "patient" as const, title: "Patient", icon: UserRound, detail: "Access your dashboard, profile, history, and prescriptions." },
  { role: "doctor" as const, title: "Doctor", icon: Stethoscope, detail: "Review patient charts, scan QR access, and add prescriptions." },
  { role: "admin" as const, title: "Admin", icon: UserRoundCog, detail: "Review audit activity and governance logs." },
];

const signupLinks = [
  { to: "/signup/patient", title: "Patient signup", icon: UserRound, detail: "Register your medical profile and health details." },
  { to: "/signup/doctor", title: "Doctor signup", icon: Stethoscope, detail: "Add your licence and clinical credentials." },
];

export default function AuthPage() {
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    
    setSubmitting(true);
    try {
      await login(email, password, role);
      // Wait for session to set so we know the role
      // Actually AuthContext saves role inside session, we can derive it or assume it's correct
      // But login itself throws if failed. If succeeded, we assume the user role matches the API response.
      // So let's redirect.
      // We need to wait for context to update. Wait, login does not return role. 
      // But we can just go to / (or we can modify getDefaultRoute to depend on `session?.role`).
      // For now let's just go to `/patient/dashboard` and let PrivateRoutes handle it if wrong, or just redirect based on selected role.
      navigate(getDefaultRoute(role));
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="soft-surface rounded-[2.5rem] border border-white/60 bg-white/80 p-8 dark:border-white/12 dark:bg-slate-900/75">
          <div className="inline-flex rounded-full border border-primary/15 bg-primary/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Smart EHR Platform
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Role-based access for patient care, clinical review, and audits</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            This simulates a secure hospital-grade Smart EHR connected to a live API.
            Doctors must scan a patient QR before chart access, patients cannot add prescriptions, and admins only review logs.
          </p>

          <PwaInstallButton className="mt-6 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" />

          <div className="mt-8 space-y-4">
            {[
              "A secure, patient-controlled platform for managing and sharing medical records",
              "Connect with doctors, book appointments, and access your health data anytime",
              "Get intelligent insights with AI-powered summaries and health trends",
              "Stay protected with privacy-first design and instant emergency support",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/70 bg-background/75 px-4 py-3 text-sm text-foreground dark:border-white/10">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="soft-surface rounded-[2.5rem] border border-white/60 bg-white/85 p-8 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex rounded-full border border-white/70 bg-background/70 p-1 dark:border-white/10">
            <button
              type="button"
              className={cn("flex-1 rounded-full px-4 py-3 text-sm font-medium bg-primary text-primary-foreground")}
            >
              Sign In
            </button>
            <Link
              to="/signup"
              className="flex-1 rounded-full px-4 py-3 text-center text-sm font-medium text-muted-foreground"
            >
              Sign Up
            </Link>
          </div>

          <form className="mt-8" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              {roleCards.map((item) => {
                const Icon = item.icon;
                const active = role === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setRole(item.role)}
                    className={cn(
                      "rounded-[1.75rem] border p-5 text-left transition-all",
                      active
                        ? "border-primary bg-primary/8 shadow-[0_12px_32px_hsl(var(--primary)/0.12)]"
                        : "border-white/70 bg-background/70 dark:border-white/10",
                    )}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 font-semibold">{item.title}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@hospital.org" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="h-12 rounded-2xl border-white/70 bg-background/70 dark:border-white/10" />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold border border-destructive/20">
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="mt-8 h-12 w-full rounded-2xl text-sm font-semibold">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in securely"}
            </Button>
          </form>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {signupLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-[1.75rem] border border-white/70 bg-background/70 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-white/10"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
