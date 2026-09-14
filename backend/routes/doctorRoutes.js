import express from 'express';
import { 
  getDashboard, 
  verifyPatient, 
  getPatientProfile, 
  getPatientHistory, 
  getPatientPrescriptions,
  getPatientSummary,
  addMedicalHistory, 
  checkPrescriptionSafety,
  addPrescription,
  requestTest
} from '../controllers/doctorController.js';
import {
  approveAppointment,
  getDoctorAppointments,
  rejectAppointment
} from '../controllers/appointmentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { logAction } from '../middleware/auditMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('doctor'));

router.get('/dashboard', logAction('VIEWED_DOCTOR_DASHBOARD'), getDashboard);
router.post('/verify-patient', logAction('VERIFIED_PATIENT_QR'), verifyPatient); // req.body.qrCode

// Patient Data Access Routes
router.get('/patient/:patientId/profile', logAction('VIEWED_PATIENT_PROFILE'), getPatientProfile);
router.get('/patient/:patientId/history', logAction('VIEWED_PATIENT_HISTORY'), getPatientHistory);
router.get('/patient/:patientId/prescriptions', logAction('VIEWED_PATIENT_PRESCRIPTIONS'), getPatientPrescriptions);
router.get('/patient/:patientId/summary', logAction('VIEWED_PATIENT_AI_SUMMARY'), getPatientSummary);

router.post('/patient/:patientId/history', logAction('ADDED_MEDICAL_HISTORY'), addMedicalHistory);
router.post('/patient/:patientId/prescription-safety-check', logAction('CHECKED_PRESCRIPTION_SAFETY'), checkPrescriptionSafety);
router.post('/patient/:patientId/prescription', logAction('ADDED_PRESCRIPTION'), addPrescription);
router.post('/patient/:patientId/request-test', logAction('REQUESTED_TEST'), requestTest);
router.get('/appointments', logAction('VIEWED_DOCTOR_APPOINTMENTS'), getDoctorAppointments);
router.patch('/appointments/:appointmentId/approve', logAction('APPROVED_APPOINTMENT'), approveAppointment);
router.patch('/appointments/:appointmentId/reject', logAction('REJECTED_APPOINTMENT'), rejectAppointment);

export default router;
