import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  medicines: [
    {
      name: { type: String, required: true },
      dosage: { type: String, required: true },
      duration: { type: String, required: true },
      frequency: { type: String, default: 'As directed' },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date, default: null }
    }
  ],
  notes: { type: String },
  safetyReview: {
    override: { type: Boolean, default: false },
    reason: { type: String, default: '' },
    checkedAt: { type: Date, default: Date.now },
    alerts: [
      {
        severity: { type: String, enum: ['high', 'warning'] },
        category: { type: String, enum: ['allergy', 'interaction'] },
        newDrug: { type: String },
        conflictingDrug: { type: String },
        title: { type: String },
        message: { type: String },
        explanation: { type: String }
      }
    ]
  },
  date: { type: Date, default: Date.now }
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
