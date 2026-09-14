import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import { sendAppointmentApprovedEmail } from '../services/appointmentEmailService.js';

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

const ensurePatientProfile = async (patientAuthId) =>
  Patient.findOneAndUpdate(
    { patientAuthId },
    { $setOnInsert: buildDefaultPatientProfile(patientAuthId) },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

export const getDoctorsForDiscovery = async (_req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate('doctorAuthId', 'name email')
      .sort({ createdAt: -1 });

    res.json(
      doctors.map((doctor) => ({
        _id: doctor._id,
        name: doctor.doctorAuthId?.name || 'Unknown Doctor',
        specialization: doctor.specialization,
        qualification: doctor.qualification,
        hospitalName: doctor.hospitalName
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAppointmentRequest = async (req, res) => {
  try {
    const { doctorId, date, reason } = req.body;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor is required' });
    }
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const appointmentDate = new Date(date);
    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ message: 'Invalid appointment date' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const patient = await ensurePatientProfile(req.user._id);
    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      date: appointmentDate,
      reason: reason.trim(),
      status: 'pending'
    });

    res.status(201).json({
      message: 'Appointment request sent',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPatientAppointments = async (req, res) => {
  try {
    const patient = await ensurePatientProfile(req.user._id);
    const appointments = await Appointment.find({ patientId: patient._id })
      .populate({
        path: 'doctorId',
        select: 'specialization qualification hospitalName',
        populate: {
          path: 'doctorAuthId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    res.json(
      appointments.map((appointment) => ({
        _id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        reason: appointment.reason,
        status: appointment.status,
        createdAt: appointment.createdAt,
        doctor: {
          _id: appointment.doctorId?._id,
          name: appointment.doctorId?.doctorAuthId?.name || 'Unknown Doctor',
          specialization: appointment.doctorId?.specialization || '',
          qualification: appointment.doctorId?.qualification || '',
          hospitalName: appointment.doctorId?.hospitalName || ''
        }
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getDoctorAppointments = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const appointments = await Appointment.find({ doctorId: doctor._id })
      .populate({
        path: 'patientId',
        select: 'age gender bloodGroup',
        populate: {
          path: 'patientAuthId',
          select: 'name email'
        }
      })
      .sort({ createdAt: -1 });

    res.json(
      appointments.map((appointment) => ({
        _id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        reason: appointment.reason,
        status: appointment.status,
        createdAt: appointment.createdAt,
        patient: {
          _id: appointment.patientId?._id,
          name: appointment.patientId?.patientAuthId?.name || 'Unknown Patient',
          email: appointment.patientId?.patientAuthId?.email || '',
          age: appointment.patientId?.age ?? null,
          gender: appointment.patientId?.gender || ''
        }
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { time } = req.body;

    if (!time || !String(time).trim()) {
      return res.status(400).json({ message: 'Appointment time is required' });
    }

    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id })
      .populate('doctorAuthId', 'name email');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctorId: doctor._id
    }).populate({
      path: 'patientId',
      populate: { path: 'patientAuthId', select: 'name email' }
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = 'approved';
    appointment.time = String(time).trim();
    await appointment.save();

    await sendAppointmentApprovedEmail({
      patientName: appointment.patientId?.patientAuthId?.name || 'Patient',
      patientEmail: appointment.patientId?.patientAuthId?.email,
      doctorName: doctor.doctorAuthId?.name || req.user.name,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      hospitalName: doctor.hospitalName
    });

    res.json({
      message: 'Appointment approved successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctor = await Doctor.findOne({ doctorAuthId: req.user._id });
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const appointment = await Appointment.findOneAndUpdate(
      { _id: appointmentId, doctorId: doctor._id },
      { status: 'rejected', time: null },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment rejected successfully',
      appointment
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
