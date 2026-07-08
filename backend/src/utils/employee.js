function normalizePhone(phone) {
  if (phone === undefined || phone === null) return null;
  const trimmed = String(phone).trim();
  if (!trimmed) return null;
  return trimmed;
}

function validatePhone(phone) {
  const normalized = normalizePhone(phone);

  if (normalized === null) {
    return { valid: true, phone: null };
  }

  if (!/^\d+$/.test(normalized)) {
    return { valid: false, error: 'Phone must contain only numbers' };
  }

  if (normalized.length < 10 || normalized.length > 15) {
    return { valid: false, error: 'Phone must be between 10 and 15 digits' };
  }

  return { valid: true, phone: normalized };
}

function validateEmployeeInput(body, { requireCore = false } = {}) {
  const errors = [];

  if (requireCore) {
    if (!body.employeeId || !String(body.employeeId).trim()) {
      errors.push('employeeId is required');
    }
    if (!body.name || !String(body.name).trim()) {
      errors.push('name is required');
    }
  }

  if (body.phone !== undefined) {
    const phoneResult = validatePhone(body.phone);
    if (!phoneResult.valid) {
      errors.push(phoneResult.error);
    }
  }

  return errors;
}

function sanitizeEmployeePayload(body) {
  const phoneResult = validatePhone(body.phone);
  if (!phoneResult.valid) {
    throw new Error(phoneResult.error);
  }

  return {
    employeeId: body.employeeId ? String(body.employeeId).trim() : undefined,
    name: body.name ? String(body.name).trim() : undefined,
    department: body.department ? String(body.department).trim() : null,
    phone: phoneResult.phone,
  };
}

module.exports = {
  normalizePhone,
  validatePhone,
  validateEmployeeInput,
  sanitizeEmployeePayload,
};
