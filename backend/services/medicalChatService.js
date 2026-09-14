const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_INSTRUCTION = `
You are Smart EHR's medical assistant for patients and doctors.
You are only allowed to help with medical, healthcare, wellness, medication, symptoms, clinical workflow, and health-record understanding questions.
If a request is unrelated to medicine or healthcare, politely explain that you can only help with medical topics.
If the answer depends on patient-specific data, hospital records, lab results, or information you have not been given, politely say that the data is not available to you.
Do not pretend you can see charts, prescriptions, reports, scans, or databases unless the user explicitly provided the content in the current conversation.
Do not provide definitive diagnoses. Keep answers educational, careful, and concise.
If the user describes emergency symptoms, advise them to seek urgent in-person medical care immediately.
`;

const LANGUAGE_INSTRUCTIONS = {
  english: 'Respond in English.',
  hindi: 'Respond in Hindi using clear and natural wording.',
  punjabi: 'Respond in Punjabi using clear and natural wording.'
};

const normalizeHistory = (history = []) =>
  history
    .filter((item) => item && typeof item.content === 'string' && item.content.trim())
    .slice(-10)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content.trim() }]
    }));

const extractReplyText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return '';
  }

  return parts
    .map((part) => part?.text || '')
    .join('')
    .trim();
};

export const generateMedicalAssistantReply = async ({ message, history, workspaceRole, language = 'english' }) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('Medical assistant is not configured. Add GEMINI_API_KEY to backend/.env.local.');
  }

  const conversation = normalizeHistory(history);
  conversation.push({
    role: 'user',
    parts: [
      {
        text: `Workspace role: ${workspaceRole}\nPreferred reply language: ${language}\n\nUser question: ${message.trim()}`
      }
    ]
  });

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: `${SYSTEM_INSTRUCTION.trim()}\n${LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.english}` }]
      },
      contents: conversation,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400
      }
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || 'Medical assistant request failed.';
    throw new Error(message);
  }

  const reply = extractReplyText(data);

  return reply || 'I do not have enough medical information to answer that safely right now. The data is not available to me.';
};
