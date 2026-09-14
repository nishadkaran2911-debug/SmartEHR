const FAST2SMS_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';

const hasSmsConfig = () => process.env.FAST2SMS_API_KEY;

const digitsOnly = (value = '') => String(value).replace(/\D/g, '');

export const normalizeIndianPhone = (phoneNumber = '') => {
  const digits = digitsOnly(phoneNumber);

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  return digits;
};

export const isValidPhoneNumber = (phoneNumber = '') => /^[6-9]\d{9}$/.test(normalizeIndianPhone(phoneNumber));

const buildHelpfulError = (payload) => {
  const statusCode = Number(payload?.status_code);
  const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;

  if (statusCode === 412 || statusCode === 413) {
    return 'Fast2SMS authentication failed. Check FAST2SMS_API_KEY in backend/.env.local.';
  }

  if (statusCode === 411) {
    return 'The emergency contact phone number is invalid for Fast2SMS. Use a 10-digit Indian mobile number.';
  }

  if (statusCode === 416) {
    return 'Fast2SMS wallet balance is too low to send SMS alerts.';
  }

  if (statusCode === 995) {
    return 'Fast2SMS blocked this SMS as spam because the same number was contacted too frequently. Wait a bit and try again.';
  }

  if (statusCode === 999) {
    return 'Fast2SMS requires wallet activation before sending SMS from the API.';
  }

  if (statusCode === 402) {
    return 'Fast2SMS rejected the SMS body. Check that the emergency message is not empty.';
  }

  if (statusCode === 408) {
    return 'Fast2SMS rejected the selected SMS route.';
  }

  return message || 'SMS delivery failed';
};

const normalizeSmsBody = (body = '') =>
  String(body)
    .replace(/\s*\n+\s*/g, ' | ')
    .replace(/\s{2,}/g, ' ')
    .trim();

export const sendSmsAlert = async ({ to, body }) => {
  if (!hasSmsConfig()) {
    throw new Error('SMS service unavailable. Add FAST2SMS_API_KEY to backend/.env.local.');
  }

  const toNumber = normalizeIndianPhone(to);

  if (!isValidPhoneNumber(toNumber)) {
    throw new Error('Recipient phone number is invalid for SMS. Use a 10-digit Indian mobile number like 9876543210.');
  }

  const payload = new URLSearchParams({
    message: normalizeSmsBody(body),
    language: 'english',
    route: 'q',
    numbers: toNumber,
  });

  const response = await fetch(FAST2SMS_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: process.env.FAST2SMS_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.return === false) {
    throw new Error(buildHelpfulError(data));
  }

  return data;
};
