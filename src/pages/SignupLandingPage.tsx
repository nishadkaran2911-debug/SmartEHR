import { Link } from "react-router-dom";
import { ArrowRight, Stethoscope, UserRound } from "lucide-react";
import { SignupShell } from "@/components/site/SignupShell";

const signupOptions = [
  {
    to: "/signup/patient",
    title: "Patient signup",
    icon: UserRound,
    description: "Add your profile, contact details, and active health concerns so your record is ready for care.",
  },
  {
    to: "/signup/doctor",
    title: "Doctor signup",
    icon: Stethoscope,
    description: "Register your licence, qualification, specialization, and professional contact details.",
  },
];

export default function SignupLandingPage() {
  return (
    <SignupShell
      eyebrow="Create Account"
      title="Choose the account type you want to register"
      description="Each role gets a dedicated signup experience so the form fields match the data that role needs in the platform."
      highlights={[
        "Patients register profile details needed for medical records and dashboards",
        "Doctors register their licence and professional credentials",
      ]}
    >
      <div className="space-y-4">
        {signupOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Link
              key={option.to}
              to={option.to}
              className="group block rounded-[1.75rem] border border-white/70 bg-background/70 p-5 transition-all hover:border-primary/30 hover:bg-primary/5 dark:border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg font-semibold">{option.title}</h2>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </SignupShell>
  );
}
