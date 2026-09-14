import AuditLog from '../models/AuditLog.js';
import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';

export const getAdminDashboardStats = async (_req, res) => {
  try {
    const [doctorCount, patientCount, auditLogCount] = await Promise.all([
      Doctor.countDocuments(),
      Patient.countDocuments(),
      AuditLog.countDocuments()
    ]);

    res.json({
      doctorCount,
      patientCount,
      auditLogCount,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const filters = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.action) filters.action = req.query.action;
    const parsedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isNaN(parsedLimit) ? 25 : Math.min(Math.max(parsedLimit, 1), 100);

    const logs = await AuditLog.find(filters).sort({ timestamp: -1 }).limit(limit);
      
    res.json(logs.map((log) => {
      const item = log.toJSON();
      return {
        ...item,
        userId: {
          _id: item.actorAuthId,
          name: item.actorName,
          email: item.actorEmail
        }
      };
    }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
