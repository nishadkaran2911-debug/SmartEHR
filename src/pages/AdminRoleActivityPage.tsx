import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Activity, Loader2, Stethoscope, Users } from "lucide-react";

const REFRESH_INTERVAL_MS = 15000;
const FEED_LIMIT = 30;

type RoleActivity = "doctor" | "patient";

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

type AdminRoleActivityPageProps = {
  roleFilter: RoleActivity;
};

const activityConfig: Record<
  RoleActivity,
  {
    eyebrow: string;
    title: string;
    description: string;
    emptyText: string;
    icon: typeof Stethoscope;
  }
> = {
  doctor: {
    eyebrow: "Doctor Activity",
    title: "Monitor doctor-side chart access and care actions",
    description: "Track clinician verification, patient chart review, prescriptions, and requested tests in one live feed.",
    emptyText: "No doctor activity has been recorded yet.",
    icon: Stethoscope,
  },
  patient: {
    eyebrow: "Patient Activity",
    title: "Monitor patient-side record usage and self-service actions",
    description: "Track when patients review their history, prescriptions, metrics, and upload reports from their own workspace.",
    emptyText: "No patient activity has been recorded yet.",
    icon: Users,
  },
};

const getActionBadgeClass = (action: string) => {
  if (action.startsWith("ADDED_") || action.startsWith("UPLOADED_")) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (action.startsWith("VIEWED_")) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  if (action.startsWith("VERIFIED_") || action.startsWith("REQUESTED_")) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-white/40 bg-background/70 text-foreground";
};

export default function AdminRoleActivityPage({ roleFilter }: AdminRoleActivityPageProps) {
  const config = activityConfig[roleFilter];
  const RoleIcon = config.icon;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const data = await apiFetch(`/admin/audit-logs?role=${roleFilter}&limit=${FEED_LIMIT}`);

        if (cancelled) {
          return;
        }

        setLogs(data as AuditLogEntry[]);
        setLastSync(new Date().toISOString());
        setError(null);
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : `Unable to load ${roleFilter} activity.`;
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void loadActivity(true);
    const intervalId = window.setInterval(() => {
      void loadActivity();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [roleFilter]);

  const latestActivity = logs[0]?.timestamp;
  const uniqueActions = new Set(logs.map((log) => log.action)).size;

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
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{config.eyebrow}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{config.title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{config.description}</p>
          </div>
          <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Live filtered feed
              {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Refreshes every {Math.floor(REFRESH_INTERVAL_MS / 1000)} seconds
              {lastSync ? ` | Last sync ${new Date(lastSync).toLocaleTimeString()}` : ""}
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
            <RoleIcon className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Recent {roleFilter} events</p>
          <p className="mt-2 text-3xl font-semibold">{logs.length.toLocaleString()}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Showing the latest {FEED_LIMIT} audit entries for this role.</p>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Latest activity</p>
          <p className="mt-2 text-2xl font-semibold">{latestActivity ? new Date(latestActivity).toLocaleTimeString() : "--"}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {latestActivity ? new Date(latestActivity).toLocaleDateString() : "Waiting for audit events to arrive."}
          </p>
        </div>

        <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Unique actions</p>
          <p className="mt-2 text-3xl font-semibold">{uniqueActions.toLocaleString()}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Distinct event types currently visible in this activity stream.</p>
        </div>
      </section>

      <section className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{config.eyebrow} Feed</h2>
            <p className="text-sm text-muted-foreground">Review role-filtered audit events in reverse chronological order.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{roleFilter} only</p>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/80">
              <tr>
                <th className="px-5 py-4 font-semibold">Actor</th>
                <th className="px-5 py-4 font-semibold">When</th>
                <th className="px-5 py-4 font-semibold">Activity</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-4 text-center text-muted-foreground">
                    {config.emptyText}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-white/60 bg-white/60 dark:border-white/10 dark:bg-slate-950/20">
                  <td className="px-5 py-4">
                    <p className="font-medium">{log.userId?.name || "Unknown User"}</p>
                    <p className="text-xs text-muted-foreground">{log.userId?.email || "No email recorded"}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getActionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                    {log.details && <p className="mt-2 text-sm text-muted-foreground">{log.details}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
