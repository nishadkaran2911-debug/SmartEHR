import express from 'express';
import { sendMedicalAssistantMessage } from '../controllers/chatController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('patient', 'doctor'));

router.post('/medical-assistant', sendMedicalAssistantMessage);

export default router;
