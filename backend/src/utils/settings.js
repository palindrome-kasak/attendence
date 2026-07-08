const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

function validateSettingsInput(body) {
  const errors = [];

  if (body.factoryName !== undefined) {
    const name = String(body.factoryName).trim();
    if (!name) errors.push('factoryName cannot be empty');
  }

  ['shiftStart', 'shiftEnd', 'lateAfter'].forEach((field) => {
    if (body[field] !== undefined && !isValidTime(body[field])) {
      errors.push(`${field} must be in HH:MM format`);
    }
  });

  if (
    body.shiftStart &&
    body.shiftEnd &&
    isValidTime(body.shiftStart) &&
    isValidTime(body.shiftEnd) &&
    body.shiftStart >= body.shiftEnd
  ) {
    errors.push('shiftEnd must be after shiftStart');
  }

  if (
    body.shiftStart &&
    body.lateAfter &&
    isValidTime(body.shiftStart) &&
    isValidTime(body.lateAfter) &&
    body.lateAfter < body.shiftStart
  ) {
    errors.push('lateAfter should not be before shiftStart');
  }

  if (body.minFaceConfidence !== undefined) {
    const value = Number(body.minFaceConfidence);
    if (!Number.isInteger(value) || value < 50 || value > 95) {
      errors.push('minFaceConfidence must be an integer between 50 and 95');
    }
  }

  return errors;
}

function formatTimeLabel(time) {
  if (!isValidTime(time)) return time;
  const [hour, minute] = time.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

module.exports = {
  isValidTime,
  validateSettingsInput,
  formatTimeLabel,
};
