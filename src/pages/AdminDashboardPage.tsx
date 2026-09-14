import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Activity, Loader2, Stethoscope, Users } from "lucide-react";

const REFRESH_INTERVAL_MS = 15000;

type DashboardStats = {
  doctorCount: number;
  patientCount: number;
  auditLogCount: number;
  generatedAt: string;
};

type AuditLogEntry = {
  _id: string;
  role: string;
  action: string;
  details?: string;
  timestamp: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
};

export default function AdminDashboardPage() {
  const { session } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.role !== "admin") {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDashboard = async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const [statsData, logsData] = await Promise.all([
          apiFetch("/admin/dashboard-stats"),
          apiFetch("/admin/audit-logs?limit=20")
        ]);

        if (cancelled) {
          return;
        }

        setStats(statsData as DashboardStats);
        setLogs(logsData as AuditLogEntry[]);
        setError(null);
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "Unable to load admin monitoring data.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadDashboard(true);
    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [session]);

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
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Live overview of current doctors, patients, and audit activity</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Monitor platform usage at a glance, then review the detailed access trail below.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Live from database
              {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Refreshes every {Math.floor(REFRESH_INTERVAL_MS / 1000)} seconds
              {stats?.generatedAt ? ` | Last sync ${new Date(stats.generatedAt).toLocaleTimeString()}` : ""}
            </p>
          </div>
        </div>
        {error && (
          <p className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Current Doctors</p>
          <p className="mt-2 text-3xl font-semibold">{(stats?.doctorCount ?? 0).toLocaleString()}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Registered doctor profiles available in the system.</p>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Current Patients</p>
          <p className="mt-2 text-3xl font-semibold">{(stats?.patientCount ?? 0).toLocaleString()}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Patient records actively registered on the platform.</p>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Audit Events</p>
          <p className="mt-2 text-3xl font-semibold">{(stats?.auditLogCount ?? logs.length).toLocaleString()}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Total recorded access and governance actions.</p>
        </div>
      </section>

      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Recent audit activity</h2>
            <p className="text-sm text-muted-foreground">Showing the latest 20 events captured by the system.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Real-time monitor</p>
        </div>
        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/80">
              <tr>
                <th className="px-5 py-4 font-semibold">Who accessed data</th>
                <th className="px-5 py-4 font-semibold">Timestamp</th>
                <th className="px-5 py-4 font-semibold">Action performed</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-4 text-muted-foreground text-center">No audit logs found.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-white/60 bg-white/60 dark:border-white/10 dark:bg-slate-950/20">
                  <td className="px-5 py-4 font-medium">{log.userId?.name || "Unknown User"} ({log.role})</td>
                  <td className="px-5 py-4 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-4 text-muted-foreground">{log.action} {log.details ? `- ${log.details}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
