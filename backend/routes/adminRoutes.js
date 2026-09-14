import express from 'express';
import { getAdminDashboardStats, getAuditLogs } from '../controllers/adminController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

router.get('/dashboard-stats', getAdminDashboardStats);
router.get('/audit-logs', getAuditLogs);

export default router;
