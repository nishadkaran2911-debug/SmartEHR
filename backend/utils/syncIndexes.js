import Admin from '../models/Admin.js';
import AdminAuth from '../models/AdminAuth.js';
import Appointment from '../models/Appointment.js';
import AuditLog from '../models/AuditLog.js';
import Doctor from '../models/Doctor.js';
import DoctorAuth from '../models/DoctorAuth.js';
import EmergencyContact from '../models/EmergencyContact.js';
import Patient from '../models/Patient.js';
import PatientAuth from '../models/PatientAuth.js';
import PatientReport from '../models/PatientReport.js';

const modelsToSync = [
  PatientAuth,
  DoctorAuth,
  AdminAuth,
  Patient,
  Doctor,
  Admin,
  Appointment,
  EmergencyContact,
  PatientReport,
  AuditLog
];

export const syncAppIndexes = async () => {
  for (const model of modelsToSync) {
    await model.syncIndexes();
  }
};
