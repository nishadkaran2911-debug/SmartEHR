import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  doctorAuthId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorAuth', required: true, unique: true },
  age: { type: Number, required: true, default: 0 },
  qualification: { type: String, required: true, default: '' },
  specialization: { type: String, required: true, default: '' },
  experience: { type: Number, required: true, default: 0 }, // in years
  hospitalName: { type: String, required: true, default: '' },
  contactNumber: { type: String, required: true, default: '' },
  licenseNumber: { type: String, required: true, default: '' },
  npiNumber: { type: String, required: true, trim: true, default: '' },
  isVerified: { type: Boolean, default: false },
  registryName: { type: String, default: '' },
  verificationSource: { type: String, default: '' }
});

doctorSchema.index(
  { npiNumber: 1 },
  { unique: true, partialFilterExpression: { npiNumber: { $type: 'string', $gt: '' } } }
);

doctorSchema.set('toJSON', {
  transform: (_doc, ret) => {
    if (ret.doctorAuthId) {
      ret.userId = ret.doctorAuthId;
      delete ret.doctorAuthId;
    }
    return ret;
  }
});

const Doctor = mongoose.model('Doctor', doctorSchema);
export default Doctor;
