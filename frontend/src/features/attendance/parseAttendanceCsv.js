// Validate the entire file before sending any records to the server.
export function parseAttendanceCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false, closed = false;
  const finishField = () => { row.push(field.trim()); field = ''; closed = false; };
  const finishRow = () => { finishField(); if (row.some(Boolean)) rows.push(row); row = []; };
  const source = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',') finishField();
    else if (c === '\n') finishRow();
    else if (c === '"' && !field.trim() && !closed) { field = ''; quoted = true; }
    else if (c === '"' || (closed && c.trim())) throw new Error('Invalid CSV quoting. Check the file before importing.');
    else field += c;
  }
  if (quoted) throw new Error('An opening quote has no closing quote.');
  finishRow();
  if (rows.length < 2) throw new Error('The CSV must contain a header and at least one attendance record.');
  const headers = rows.shift().map(h => h.toLowerCase());
  if (new Set(headers).size !== headers.length) throw new Error('CSV column names must be unique.');
  for (const name of ['employee_id', 'date']) if (!headers.includes(name)) throw new Error(`Missing required column: ${name}.`);
  if (rows.length > 2000) throw new Error('Import at most 2000 records at a time.');
  const seen = new Set();
  const time = (value, number) => {
    if (!value) return null;
    const match = value.match(/^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$/i);
    if (!match) throw new Error(`Row ${number}: invalid time ${value}.`);
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0), second = Number(match[3] || 0), period = match[4]?.toUpperCase();
    if (minute > 59 || second > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) throw new Error(`Row ${number}: invalid time ${value}.`);
    if (period) hour = hour % 12 + (period === 'PM' ? 12 : 0);
    return [hour, minute, second].map(n => String(n).padStart(2, '0')).join(':');
  };
  return rows.map((values, index) => {
    const number = index + 2;
    if (values.length !== headers.length) throw new Error(`Row ${number}: column count does not match the header.`);
    const data = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    if (!data.employee_id) throw new Error(`Row ${number}: employee_id is required.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) throw new Error(`Row ${number}: use a valid date in YYYY-MM-DD format.`);
    const key = `${data.employee_id}|${data.date}`;
    if (seen.has(key)) throw new Error(`Row ${number}: duplicate employee and date.`);
    seen.add(key);
    const check_in = time(data.check_in, number), check_out = time(data.check_out, number);
    if (Boolean(check_in) !== Boolean(check_out)) throw new Error(`Row ${number}: provide both check_in and check_out.`);
    return {employee_id:data.employee_id, date:data.date, check_in, check_out, status:data.status || (check_in ? 'Present' : 'Absent')};
  });
}
