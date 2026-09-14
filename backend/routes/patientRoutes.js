import express from 'express';
import { getDashboard, getHistory, getPrescriptions, getMetricsAnalytics, addMetric, uploadReport } from '../controllers/patientController.js';
import {
  createAppointmentRequest,
  getDoctorsForDiscovery,
  getPatientAppointments
} from '../controllers/appointmentController.js';
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
  triggerSosAlert
} from '../controllers/emergencyController.js';
import { acceptConsent, getConsentStatus } from '../controllers/patientConsentController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { requirePatientConsent } from '../middleware/patientConsentMiddleware.js';
import { logAction } from '../middleware/auditMiddleware.js';

const router = express.Router();

// All routes require patient role
router.use(protect);
router.use(authorizeRoles('patient'));

router.get('/consent-status', logAction('VIEWED_PATIENT_CONSENT_STATUS'), getConsentStatus);
router.post('/consent', logAction('ACCEPTED_PATIENT_CONSENT'), acceptConsent);

router.use(requirePatientConsent);

router.get('/dashboard', logAction('VIEWED_OWN_PROFILE'), getDashboard);
router.get('/history', logAction('VIEWED_OWN_HISTORY'), getHistory);
router.get('/prescriptions', logAction('VIEWED_OWN_PRESCRIPTIONS'), getPrescriptions);
router.get('/metrics', logAction('VIEWED_OWN_METRICS'), getMetricsAnalytics);
router.post('/metrics', logAction('ADDED_OWN_METRIC'), addMetric);
router.post('/reports', logAction('UPLOADED_OWN_REPORT'), uploadReport);
router.get('/doctors', logAction('VIEWED_DOCTOR_DISCOVERY'), getDoctorsForDiscovery);
router.post('/appointments', logAction('REQUESTED_APPOINTMENT'), createAppointmentRequest);
router.get('/appointments', logAction('VIEWED_OWN_APPOINTMENTS'), getPatientAppointments);
router.get('/emergency-contacts', logAction('VIEWED_EMERGENCY_CONTACTS'), getEmergencyContacts);
router.post('/emergency-contacts', logAction('ADDED_EMERGENCY_CONTACT'), addEmergencyContact);
router.delete('/emergency-contacts/:contactId', logAction('REMOVED_EMERGENCY_CONTACT'), deleteEmergencyContact);
router.post('/sos/trigger', logAction('TRIGGERED_SOS_ALERT'), triggerSosAlert);

export default router;
