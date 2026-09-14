import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/components/site/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/app/ProtectedRoute";
import { AppShell } from "@/components/app/AppShell";
import { SiteLayout } from "@/components/site/SiteLayout";
import AuthPage from "@/pages/AuthPage";
import SignupLandingPage from "@/pages/SignupLandingPage";
import SignupPatientPage from "@/pages/SignupPatientPage";
import SignupDoctorPage from "@/pages/SignupDoctorPage";
import SignupAdminPage from "@/pages/SignupAdminPage";
import HomePage from "@/pages/HomePage";
import FeaturesPage from "@/pages/FeaturesPage";
import DoctorsPage from "@/pages/DoctorsPage";
import PatientsPage from "@/pages/PatientsPage";
import PatientDashboardPage from "@/pages/PatientDashboardPage";
import PatientAppointmentsPage from "@/pages/PatientAppointmentsPage";
import PatientProfilePage from "@/pages/PatientProfilePage";
import PatientHistoryPage from "@/pages/PatientHistoryPage";
import PatientPrescriptionsPage from "@/pages/PatientPrescriptionsPage";
import PatientGraphsPage from "@/pages/PatientGraphsPage";
import DoctorDashboardPage from "@/pages/DoctorDashboardPage";
import DoctorAppointmentsPage from "@/pages/DoctorAppointmentsPage";
import DoctorScanPage from "@/pages/DoctorScanPage";
import DoctorPatientViewPage from "@/pages/DoctorPatientViewPage";
import DoctorAddPrescriptionPage from "@/pages/DoctorAddPrescriptionPage";
import DoctorProfilePage from "@/pages/DoctorProfilePage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminRoleActivityPage from "@/pages/AdminRoleActivityPage";
import NotFound from "@/pages/NotFound";
import { Toaster } from "@/components/ui/sonner";

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/doctors" element={<DoctorsPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<Navigate to="/auth" replace />} />
              <Route path="/signup" element={<SignupLandingPage />} />
              <Route path="/signup/patient" element={<SignupPatientPage />} />
              <Route path="/signup/doctor" element={<SignupDoctorPage />} />
              <Route path="/signup/admin" element={<SignupAdminPage />} />
            </Route>

            <Route
              path="/patient"
              element={
                <ProtectedRoute role="patient">
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PatientDashboardPage />} />
              <Route path="profile" element={<PatientProfilePage />} />
              <Route path="history" element={<PatientHistoryPage />} />
              <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
              <Route path="appointments" element={<PatientAppointmentsPage />} />
              <Route path="graphs" element={<PatientGraphsPage />} />
            </Route>

            <Route
              path="/doctor"
              element={
                <ProtectedRoute role="doctor">
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DoctorDashboardPage />} />
              <Route path="appointments" element={<DoctorAppointmentsPage />} />
              <Route path="scan" element={<DoctorScanPage />} />
              <Route
                path="patient-view"
                element={
                  <ProtectedRoute role="doctor" requireDoctorAccess>
                    <DoctorPatientViewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="add-prescription"
                element={
                  <ProtectedRoute role="doctor" requireDoctorAccess>
                    <DoctorAddPrescriptionPage />
                  </ProtectedRoute>
                }
              />
              <Route path="profile" element={<DoctorProfilePage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="doctor-activity" element={<AdminRoleActivityPage roleFilter="doctor" />} />
              <Route path="patient-activity" element={<AdminRoleActivityPage roleFilter="patient" />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
