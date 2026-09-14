const NPI_API_BASE_URL = process.env.NPI_API_BASE_URL || 'https://npiregistry.cms.hhs.gov/api/';

const sanitizeName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildRegistryName = (result = {}) => {
  const basic = result.basic || {};
  const personName = [basic.first_name, basic.middle_name, basic.last_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    personName ||
    String(basic.organization_name || basic.authorized_official_organization_name || '').trim() ||
    String(result.name || '').trim()
  );
};

const namesMatch = (enteredName, registryName) => {
  const entered = sanitizeName(enteredName);
  const registry = sanitizeName(registryName);
  if (!entered || !registry) return false;

  if (entered === registry || entered.includes(registry) || registry.includes(entered)) {
    return true;
  }

  const enteredTokens = new Set(entered.split(' ').filter((token) => token.length >= 2));
  const registryTokens = new Set(registry.split(' ').filter((token) => token.length >= 2));

  if (enteredTokens.size === 0 || registryTokens.size === 0) return false;

  let overlap = 0;
  enteredTokens.forEach((token) => {
    if (registryTokens.has(token)) overlap += 1;
  });

  return overlap >= Math.min(2, enteredTokens.size);
};

export class NpiVerificationError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export const verifyDoctorNpi = async ({ npiNumber, enteredName }) => {
  const normalizedNpi = String(npiNumber || '').trim();
  if (!/^\d{10}$/.test(normalizedNpi)) {
    throw new NpiVerificationError('Invalid NPI number', 'INVALID_NPI');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const endpoint = new URL(NPI_API_BASE_URL);
    endpoint.searchParams.set('number', normalizedNpi);
    endpoint.searchParams.set('version', '2.1');

    const response = await fetch(endpoint.toString(), { signal: controller.signal });
    if (!response.ok) {
      throw new NpiVerificationError('Verification service unavailable, try again later', 'SERVICE_UNAVAILABLE');
    }

    const payload = await response.json();
    const count = Number(payload?.result_count || 0);
    const result = Array.isArray(payload?.results) ? payload.results[0] : null;

    if (!count || !result) {
      throw new NpiVerificationError('Invalid NPI number', 'INVALID_NPI');
    }

    const basic = result.basic || {};
    const status = String(basic.status || '').toUpperCase();
    if (status !== 'A' && status !== 'ACTIVE') {
      throw new NpiVerificationError('Invalid NPI number', 'INVALID_NPI');
    }

    const registryName = buildRegistryName(result);
    if (!namesMatch(enteredName, registryName)) {
      throw new NpiVerificationError('Doctor details do not match registry', 'NAME_MISMATCH');
    }

    const enumerationType = String(result.enumeration_type || basic.enumeration_type || '').trim();

    return {
      npiNumber: normalizedNpi,
      isVerified: true,
      registryName,
      verificationSource: 'NPI Registry',
      enumerationType,
      status: 'ACTIVE'
    };
  } catch (error) {
    if (error instanceof NpiVerificationError) {
      throw error;
    }
    throw new NpiVerificationError('Verification service unavailable, try again later', 'SERVICE_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
};
