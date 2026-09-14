import { generateMedicalAssistantReply } from '../services/medicalChatService.js';

const SUPPORTED_LANGUAGES = new Set(['english', 'hindi', 'punjabi']);

export const sendMedicalAssistantMessage = async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const requestedLanguage = typeof req.body?.language === 'string' ? req.body.language.toLowerCase() : 'english';
    const language = SUPPORTED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : 'english';

    if (!message) {
      return res.status(400).json({ message: 'Please enter a medical question before sending.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ message: 'Please keep the medical question under 2000 characters.' });
    }

    const reply = await generateMedicalAssistantReply({
      message,
      history,
      workspaceRole: req.user.role,
      language
    });

    res.json({ reply });
  } catch (error) {
    const isConfigError = error.message?.includes('not configured');
    const status = isConfigError ? 503 : 502;

    res.status(status).json({
      message: isConfigError
        ? error.message
        : 'The medical assistant could not answer right now. The data is not available to it at the moment.'
    });
  }
};
