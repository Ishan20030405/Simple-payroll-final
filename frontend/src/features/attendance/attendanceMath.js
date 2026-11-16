export function calculateAttendance(inTime, outTime, date, settings = {}) {
  if (!inTime || !outTime) return { working_hours: 0, overtime: 0, status: 'Present' };
  const minutes = value => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
  const start = minutes(inTime), end = minutes(outTime);
  const duration = end >= start ? end - start : end + 1440 - start;
  const sunday = new Date(`${String(date).slice(0, 10)}T12:00:00Z`).getUTCDay() === 0;
  return {
    working_hours: sunday ? 0 : Number((duration / 60).toFixed(2)),
    overtime: Number(((sunday ? duration : Math.max(0, duration - Math.round(Number(settings.working_hours ?? 8) * 60))) / 60).toFixed(2)),
    status: start > minutes(settings.check_in_time || '09:00') ? 'Late' : 'Present'
  };
}
