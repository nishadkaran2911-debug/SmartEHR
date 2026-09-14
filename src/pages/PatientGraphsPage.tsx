import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

type PatientProfile = {
  majorIssues?: string[];
  userId?: {
    name?: string;
  };
};

type HistoryItem = {
  _id: string;
  type: "test" | "report" | "appointment";
  date: string;
};

type PrescriptionItem = {
  _id: string;
  date: string;
  medicines: { name: string; dosage: string; duration: string }[];
};

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="soft-surface rounded-[2rem] border border-white/60 bg-white/85 p-6 dark:border-white/12 dark:bg-slate-900/75">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-6 h-80">{children}</div>
    </div>
  );
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

const normalizeIssueLabel = (issue: string) =>
  issue
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function PatientGraphsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<{
    profile: PatientProfile;
    history: HistoryItem[];
    prescriptions: PrescriptionItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.role === "patient") {
      Promise.all([
        apiFetch("/patients/dashboard"),
        apiFetch("/patients/history"),
        apiFetch("/patients/prescriptions"),
      ])
        .then(([profile, history, prescriptions]) =>
          setData({
            profile: profile as PatientProfile,
            history: history as HistoryItem[],
            prescriptions: prescriptions as PrescriptionItem[],
          }),
        )
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  const issueChartData = useMemo(() => {
    const issues = data?.profile.majorIssues?.filter((issue) => issue.trim()) ?? [];

    if (issues.length === 0) {
      return [{ issue: "No major issue", count: 0 }];
    }

    const counts = issues.reduce<Record<string, number>>((accumulator, issue) => {
      const key = normalizeIssueLabel(issue.trim());
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts).map(([issue, count]) => ({
      issue,
      count,
    }));
  }, [data]);

  const careActivityData = useMemo(() => {
    const grouped = new Map<string, { month: string; visits: number; medicines: number }>();

    for (const item of data?.history ?? []) {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          month: `${monthFormatter.format(date)} ${String(date.getFullYear()).slice(-2)}`,
          visits: 0,
          medicines: 0,
        });
      }

      grouped.get(key)!.visits += 1;
    }

    for (const prescription of data?.prescriptions ?? []) {
      const date = new Date(prescription.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          month: `${monthFormatter.format(date)} ${String(date.getFullYear()).slice(-2)}`,
          visits: 0,
          medicines: 0,
        });
      }

      grouped.get(key)!.medicines += prescription.medicines.length;
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value);
  }, [data]);

  if (loading) {
    return (
      <div className="p-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.profile) {
    return <div className="p-10 text-center">Patient not found</div>;
  }

  const patientName = data.profile.userId?.name || "the patient";

  return (
    <div className="space-y-6">
      <section className="soft-surface animate-fade-in rounded-[2rem] border border-white/60 bg-white/85 p-7 dark:border-white/12 dark:bg-slate-900/75">
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Health Graphs</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Live issue and care graphs built from {patientName}&apos;s records</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          These charts now use actual patient data instead of sample sugar and blood pressure trends.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Major Issues"
          description="A bar view of the major health issues currently recorded in the patient profile."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={issueChartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="issue" tickLine={false} angle={issueChartData.length > 3 ? -20 : 0} textAnchor={issueChartData.length > 3 ? "end" : "middle"} height={issueChartData.length > 3 ? 70 : 40} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[14, 14, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Monthly Care Activity"
          description="A dynamic trend of visits and prescribed medicines grouped by month from the patient history and prescription records."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={careActivityData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="visits" name="History entries" stroke="hsl(var(--primary))" strokeWidth={3} />
              <Line type="monotone" dataKey="medicines" name="Medicines prescribed" stroke="#0f766e" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
