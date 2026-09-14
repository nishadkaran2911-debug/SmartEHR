import Patient from '../models/Patient.js';
import EmergencyContact from '../models/EmergencyContact.js';
import { findNearestHospital } from '../services/nearestHospitalService.js';
import { isValidPhoneNumber, sendSmsAlert } from '../services/smsService.js';

const activeSosPatients = new Set();

const buildDefaultPatientProfile = (patientAuthId) => ({
  patientAuthId,
  age: 0,
  gender: 'other',
  bloodGroup: 'Unknown',
  contactNumber: '',
  address: '',
  majorIssues: [],
  qrCode: `PAT-${patientAuthId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  consentGiven: false,
  consentTimestamp: null
});

const ensurePatientProfile = async (patientAuthId, populateUser = false) => {
  let query = Patient.findOneAndUpdate(
    { patientAuthId },
    { $setOnInsert: buildDefaultPatientProfile(patientAuthId) },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  if (populateUser) {
    query = query.populate('patientAuthId', 'name email');
  }

  return query;
};

export const getEmergencyContacts = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);
    const contacts = await EmergencyContact.find({ patientId: patient._id }).sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addEmergencyContact = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: 'Contact name is required' });
    }
    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const patient = await ensurePatientProfile(req.user._id);
    const contact = await EmergencyContact.create({
      patientId: patient._id,
      name: name.trim(),
      phoneNumber: String(phoneNumber).trim()
    });

    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEmergencyContact = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);
    const contact = await EmergencyContact.findOneAndDelete({
      _id: req.params.contactId,
      patientId: patient._id
    });

    if (!contact) {
      return res.status(404).json({ message: 'Emergency contact not found' });
    }

    res.json({ message: 'Emergency contact removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const triggerSosAlert = async (req, res) => {
  let patientKey = null;
  try {
    const { latitude, longitude } = req.body || {};
    const patient = await ensurePatientProfile(req.user._id, true);
    patientKey = String(patient._id);
    if (activeSosPatients.has(patientKey)) {
      return res.status(429).json({ message: 'SOS alert is already being processed' });
    }
    activeSosPatients.add(patientKey);
    const contacts = await EmergencyContact.find({ patientId: patient._id });

    if (!contacts.length) {
      return res.status(400).json({ message: 'No emergency contacts found. Please add at least one contact.' });
    }

    const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
    const lat = hasCoordinates ? Number(latitude) : null;
    const lng = hasCoordinates ? Number(longitude) : null;
    const locationLink = hasCoordinates ? `https://maps.google.com/?q=${lat},${lng}` : 'Location unavailable';
    const nearestHospital = findNearestHospital({ latitude: lat, longitude: lng });

    const patientName = patient.patientAuthId?.name || req.user.name || 'Patient';
    const message = [
      'Emergency Alert',
      `${patientName} may be in danger.`,
      `Location: ${locationLink}`,
      `Nearest Hospital: ${nearestHospital.name}, ${nearestHospital.address}`
    ].join('\n');

    let sentCount = 0;
    const errors = [];

    for (const contact of contacts) {
      try {
        await sendSmsAlert({ to: contact.phoneNumber, body: message });
        sentCount += 1;
      } catch (contactError) {
        errors.push({ contactId: contact._id, message: contactError.message });
      }
    }

    if (!sentCount) {
      return res.status(503).json({
        message: 'Failed to send SOS SMS alert',
        errors
      });
    }

    res.json({
      message: 'SOS alert dispatched successfully',
      sentCount,
      failedCount: contacts.length - sentCount,
      nearestHospital,
      locationLink,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (patientKey) {
      activeSosPatients.delete(patientKey);
    }
  }
};
