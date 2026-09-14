import { Activity, CalendarDays, ClipboardList, FileText, LayoutDashboard, Loader2, LogOut, Menu, Moon, QrCode, Shield, Stethoscope, Sun, UserRound, Users } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/site/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { MedicalAssistantWidget } from "@/components/app/MedicalAssistantWidget";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { PwaInstallButton } from "@/components/app/PwaInstallButton";

const roleNavigation = {
  patient: [
    { to: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/patient/appointments", label: "Appointments", icon: CalendarDays },
    { to: "/patient/profile", label: "Profile", icon: UserRound },
    { to: "/patient/history", label: "Medical History", icon: ClipboardList },
    { to: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
    { to: "/patient/graphs", label: "Health Graphs", icon: Activity },
  ],
  doctor: [
    { to: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/doctor/appointments", label: "Appointments", icon: CalendarDays },
    { to: "/doctor/scan", label: "Scan QR", icon: QrCode },
    { to: "/doctor/patient-view", label: "Patient Chart", icon: FileText },
    { to: "/doctor/profile", label: "Profile", icon: UserRound },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: Shield },
    { to: "/admin/doctor-activity", label: "Doctor Activity", icon: Stethoscope },
    { to: "/admin/patient-activity", label: "Patient Activity", icon: Users },
  ],
} as const;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentRequired, setConsentRequired] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(30);
  const [sosSending, setSosSending] = useState(false);
  const [motionPermissionRequired, setMotionPermissionRequired] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [requestingMotionPermission, setRequestingMotionPermission] = useState(false);
  const [motionEventCount, setMotionEventCount] = useState(0);
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const lastShakeTsRef = useRef(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const motionSupportWarnedRef = useRef(false);
  const sosStartedRef = useRef(false);

  if (!session) return null;

  const items = roleNavigation[session.role];
  const showMedicalAssistant = session.role === "patient" || session.role === "doctor";
  const isPatient = session.role === "patient";
  const canRunSos = isPatient && !consentLoading && !consentRequired;
  const canListenMotion = canRunSos && (!motionPermissionRequired || motionEnabled);

  useEffect(() => {
    if (!isPatient) return;

    setConsentLoading(true);
    apiFetch("/patients/consent-status")
      .then((data: any) => {
        setConsentRequired(!data.consentGiven);
      })
      .catch((error: any) => {
        toast.error(error.message || "Unable to load consent status");
      })
      .finally(() => setConsentLoading(false));
  }, [isPatient]);

  const handleConsentAccept = async () => {
    setConsentSubmitting(true);
    try {
      await apiFetch("/patients/consent", { method: "POST" });
      setConsentRequired(false);
      toast.success("Consent saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save consent");
    } finally {
      setConsentSubmitting(false);
    }
  };

  const clearSosCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const stopSosFeedback = () => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }

    if ("vibrate" in navigator) {
      navigator.vibrate(0);
    }
  };

  const playRingBurst = async () => {
    if (typeof window === "undefined") return;

    const AudioContextCtor = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContextCtor();
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      await context.resume().catch(() => null);
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const startAt = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, startAt);
    oscillator.frequency.setValueAtTime(660, startAt + 0.18);
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.18, startAt + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.42);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.45);
  };

  const startSosFeedback = () => {
    stopSosFeedback();

    if ("vibrate" in navigator) {
      navigator.vibrate([300, 120, 300, 400]);
      vibrationIntervalRef.current = setInterval(() => {
        navigator.vibrate([300, 120, 300, 400]);
      }, 1600);
    }

    void playRingBurst();
    ringIntervalRef.current = setInterval(() => {
      void playRingBurst();
    }, 1400);
  };

  const startSosFlow = () => {
    if (!canListenMotion || sosActive || sosSending) return;

    const now = Date.now();
    if (now - lastShakeTsRef.current < 12000) {
      return;
    }
    lastShakeTsRef.current = now;
    sosStartedRef.current = true;
    setSosCountdown(30);
    setSosActive(true);
  };

  const requestMotionPermission = async () => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;
    const motionEventApi = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (!motionEventApi.requestPermission) {
      setMotionEnabled(true);
      setMotionPermissionRequired(false);
      return;
    }

    setRequestingMotionPermission(true);
    try {
      const permission = await motionEventApi.requestPermission();
      if (permission === "granted") {
        setMotionEnabled(true);
        toast.success("Motion detection enabled");
      } else {
        setMotionEnabled(false);
        toast.error("Motion permission denied. SOS shake detection is disabled.");
      }
    } catch {
      setMotionEnabled(false);
      toast.error("Unable to request motion permission.");
    } finally {
      setRequestingMotionPermission(false);
    }
  };

  const cancelSos = () => {
    clearSosCountdown();
    stopSosFeedback();
    setSosActive(false);
    setSosSending(false);
    setSosCountdown(30);
    sosStartedRef.current = false;
    toast("SOS alert cancelled");
  };

  const getCurrentPosition = () =>
    new Promise<{ latitude: number | null; longitude: number | null }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }),
        () => resolve({ latitude: null, longitude: null }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const sendSosAlert = async () => {
    setSosSending(true);
    try {
      const location = await getCurrentPosition();
      const response: any = await apiFetch("/patients/sos/trigger", {
        method: "POST",
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude
        })
      });
      toast.success(`SOS alert sent to ${response.sentCount} contact(s)`);
      if (location.latitude == null || location.longitude == null) {
        toast("Location unavailable. Alert sent without live coordinates.");
      }
    } catch (error: any) {
      const backendMessage = error?.data?.message || error.message || "Failed to send SOS alert";
      const firstContactError = Array.isArray(error?.data?.errors) && error.data.errors.length
        ? error.data.errors[0]?.message
        : null;
      toast.error(firstContactError ? `${backendMessage} - ${firstContactError}` : backendMessage);
    } finally {
      clearSosCountdown();
      stopSosFeedback();
      setSosActive(false);
      setSosSending(false);
      setSosCountdown(30);
      sosStartedRef.current = false;
    }
  };

  useEffect(() => {
    if (!sosActive || sosSending) return;

    clearSosCountdown();
    countdownIntervalRef.current = setInterval(() => {
      setSosCountdown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return clearSosCountdown;
  }, [sosActive, sosSending]);

  useEffect(() => {
    if (!sosActive || sosSending || sosCountdown > 0) return;
    void sendSosAlert();
  }, [sosActive, sosSending, sosCountdown]);

  useEffect(() => {
    if (!sosActive || sosSending) {
      stopSosFeedback();
      return;
    }

    startSosFeedback();
    return stopSosFeedback;
  }, [sosActive, sosSending]);

  useEffect(() => {
    if (!canRunSos) return;

    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      if (!motionSupportWarnedRef.current) {
        motionSupportWarnedRef.current = true;
        toast("Shake detection is not supported on this device/browser.");
      }
      return;
    }

    const motionEventApi = window.DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    const needsPermissionPrompt = typeof motionEventApi.requestPermission === "function";
    setMotionPermissionRequired(needsPermissionPrompt);

    if (needsPermissionPrompt && !motionEnabled) {
      return;
    }

    const threshold = 14;
    const onMotion = (event: DeviceMotionEvent) => {
      if (!canListenMotion || sosStartedRef.current) return;
      setMotionEventCount((prev) => prev + 1);
      const accel = event.accelerationIncludingGravity || event.acceleration;
      if (!accel) return;

      const x = Math.abs(accel.x || 0);
      const y = Math.abs(accel.y || 0);
      const z = Math.abs(accel.z || 0);
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      if (magnitude >= threshold) {
        startSosFlow();
      }
    };

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [canRunSos, canListenMotion, motionEnabled]);

  useEffect(() => {
    return () => {
      clearSosCountdown();
      stopSosFeedback();
      audioContextRef.current?.close().catch(() => null);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside className="soft-surface sticky top-6 hidden h-[calc(100vh-3rem)] w-72 shrink-0 flex-col rounded-[2rem] border border-white/60 bg-white/80 p-5 dark:border-white/12 dark:bg-slate-900/75 lg:flex">
          <Link to={items[0].to} className="flex items-center gap-3 rounded-[1.5rem] px-2 py-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.24em] text-primary/80">SMART EHR</p>
              <p className="text-xs text-muted-foreground capitalize">{session.role} workspace</p>
            </div>
          </Link>

          <nav className="mt-6 space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_10px_30px_hsl(var(--primary)/0.22)]"
                        : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[1.75rem] border border-white/70 bg-background/70 p-4 dark:border-white/10">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Access rule</p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {session.role === "doctor"
                ? "Doctors use the QR scan screen to review the chart and write prescriptions after verification."
                : session.role === "patient"
                  ? "Patients can view history and prescriptions, but cannot add prescriptions."
                  : "Admins can audit system activity but cannot edit patient care data."}
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="soft-surface sticky top-6 z-20 flex items-center justify-between rounded-[2rem] border border-white/60 bg-white/80 px-4 py-4 dark:border-white/12 dark:bg-slate-900/75">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-background/70 lg:hidden dark:border-white/10"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="font-semibold capitalize">{session.name} • {session.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PwaInstallButton className="rounded-2xl border-white/70 bg-background/70 dark:border-white/10" />
              <Button
                variant="outline"
                size="icon"
                className="rounded-2xl border-white/70 bg-background/70 dark:border-white/10"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl border-white/70 bg-background/70 dark:border-white/10"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>

          {mobileOpen && (
            <div className="soft-surface mt-4 rounded-[2rem] border border-white/60 bg-white/80 p-4 dark:border-white/12 dark:bg-slate-900/75 lg:hidden">
              <nav className="space-y-2">
                <PwaInstallButton
                  className="mb-2 w-full rounded-[1.25rem] border-white/70 bg-background/70 dark:border-white/10"
                  mobileMenuClose={() => setMobileOpen(false)}
                />
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-medium transition-all",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}

          <main className="pt-6">{!isPatient || (!consentLoading && !consentRequired) ? <Outlet /> : null}</main>
        </div>
      </div>
      {showMedicalAssistant && <MedicalAssistantWidget role={session.role} />}

      {isPatient && consentLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Checking consent status...</p>
          </div>
        </div>
      )}

      {isPatient && !consentLoading && consentRequired && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-6">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/60 bg-white/95 p-8 shadow-xl dark:border-white/12 dark:bg-slate-900/95">
            <p className="text-xs uppercase tracking-[0.28em] text-primary">Mandatory Consent</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Patient Data Privacy & Consent</h2>

            <div className="mt-6 space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Your medical data will be securely stored in this system.</p>
              <p>Your data will only be shared with doctors when you provide access (QR or appointment).</p>
              <p>Access to your data is temporary and controlled.</p>
              <p>Doctors cannot download or misuse your data.</p>
              <p>Your data is private and protected.</p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={handleConsentAccept} disabled={consentSubmitting} className="rounded-2xl">
                {consentSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "I Agree and Continue"
                )}
              </Button>
              <Button variant="outline" className="rounded-2xl" onClick={logout} disabled={consentSubmitting}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {canRunSos && sosActive && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 p-6">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/95 p-8 text-center shadow-xl dark:border-white/12 dark:bg-slate-900/95">
            <p className="text-xs uppercase tracking-[0.28em] text-destructive">Emergency Detected</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Sending alert in {sosCountdown} seconds...</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Your emergency contacts will receive your live location and nearest hospital details through SMS.
            </p>

            <div className="mt-8">
              <div className="mx-auto h-28 w-28 rounded-full border-4 border-destructive/30 p-2">
                <div className="flex h-full items-center justify-center rounded-full bg-destructive/10 text-3xl font-semibold text-destructive">
                  {sosCountdown}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button
                className="rounded-2xl"
                onClick={() => void sendSosAlert()}
                disabled={sosSending}
              >
                {sosSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Now"}
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl border-destructive text-destructive hover:bg-destructive/10"
                onClick={cancelSos}
                disabled={sosSending}
              >
                {sosSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {canRunSos && !sosActive && (
        <div className="fixed bottom-6 left-6 z-[105] flex max-w-xs flex-col gap-2 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg dark:border-white/12 dark:bg-slate-900/95">
          <p className="text-xs text-muted-foreground">Motion events: {motionEventCount}</p>
          <Button onClick={startSosFlow} className="rounded-xl">
            Test SOS Trigger
          </Button>
        </div>
      )}

      {canRunSos && motionPermissionRequired && !motionEnabled && !sosActive && (
        <div className="fixed bottom-6 right-6 z-[105] max-w-xs rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg dark:border-white/12 dark:bg-slate-900/95">
          <p className="text-sm font-semibold">Enable Motion SOS</p>
          <p className="mt-1 text-xs text-muted-foreground">Allow motion access so shake detection can trigger SOS.</p>
          <Button onClick={requestMotionPermission} disabled={requestingMotionPermission} className="mt-3 w-full rounded-xl">
            {requestingMotionPermission ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable Motion"}
          </Button>
        </div>
      )}
    </div>
  );
}
