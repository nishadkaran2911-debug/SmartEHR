import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientAuthId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientAuth', required: true, unique: true },
  age: { type: Number, required: true, default: 0 },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true, default: 'other' },
  bloodGroup: { type: String, required: true, default: 'Unknown' },
  contactNumber: { type: String, required: true, default: '' },
  address: { type: String, required: true, default: '' },
  majorIssues: [{ type: String }],
  allergies: [{ type: String, trim: true }],
  currentMedications: [
    {
      name: { type: String, required: true, trim: true },
      dosage: { type: String, default: '', trim: true },
      frequency: { type: String, default: 'As directed', trim: true },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date, default: null }
    }
  ],
  qrCode: { type: String, unique: true, required: true },
  consentGiven: { type: Boolean, default: false },
  consentTimestamp: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

patientSchema.set('toJSON', {
  transform: (_doc, ret) => {
    if (ret.patientAuthId) {
      ret.userId = ret.patientAuthId;
      delete ret.patientAuthId;
    }
    return ret;
  }
});

const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
