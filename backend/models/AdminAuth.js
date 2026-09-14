import mongoose from 'mongoose';
import { createAccountSchema } from './accountSchemaFactory.js';

const adminAuthSchema = createAccountSchema('admin');

const AdminAuth = mongoose.model('AdminAuth', adminAuthSchema, 'admin_auths');
export default AdminAuth;