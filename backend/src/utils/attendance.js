function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function parseTimeOnDate(timeStr, dateStr) {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function determineStatus(checkIn, settings) {
  const dateStr = getTodayDateString();
  const lateThreshold = parseTimeOnDate(settings.lateAfter, dateStr);
  return checkIn > lateThreshold ? 'late' : 'present';
}

module.exports = { getTodayDateString, determineStatus };
