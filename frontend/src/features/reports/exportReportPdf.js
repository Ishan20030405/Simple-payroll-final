import { jsPDF } from 'jspdf';
import { sum, isTotalColumn } from './reportDefinitions';

export default function exportReportPdf(report, rows, context) {
  const pdf = new jsPDF({ orientation: report.individual ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const margin = 12;
  // Standard PDF fonts support ASCII; normalize punctuation used for missing values.
  const text = value => String(value).replace(/—|–/g, '-');
  let y;
  const heading = () => {
    pdf.setTextColor(15, 31, 61); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
    pdf.text(report.title, margin, 18);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(90);
    const lines = pdf.splitTextToSize(text(`${context}${report.hoursOnly?' | Attendance and hours':' | Amounts in Rs'}`), width - margin * 2);
    pdf.text(lines, margin, 25); y = 28 + lines.length * 4;
  };
  const cellWidth = (width - margin * 2) / report.columns.length;
  const header = () => {
    pdf.setFillColor(233, 240, 247); pdf.rect(margin, y, width - margin * 2, 15, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(15, 31, 61);
    report.columns.forEach((column, index) => pdf.text(pdf.splitTextToSize(column.label, cellWidth - 3), margin + index * cellWidth + 1.5, y + 5));
    y += 16;
  };
  heading();
  if (report.individual) {
    rows.forEach((row, index) => {
      if (index) { pdf.addPage(); heading(); }
      pdf.setFontSize(11); pdf.setTextColor(15, 31, 61); pdf.setFont('helvetica', 'bold');
      const lines = pdf.splitTextToSize(text(`${row.employee_code} - ${row.employee_name}`), width - margin * 2);
      pdf.text(lines, margin, y + 5); y += 9 + lines.length * 5;
      report.columns.slice(2).forEach(column => {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(50);
        const value = pdf.splitTextToSize(text(column.format(row[column.key] ?? null)), 90);
        if (y + value.length * 5 + 4 > height - 18) { pdf.addPage(); heading(); pdf.setFontSize(10); }
        pdf.text(column.label, margin, y); pdf.text(value, width - margin, y, { align: 'right' });
        y += Math.max(9, value.length * 5 + 4);
      });
      pdf.setFontSize(8);
      pdf.text(pdf.splitTextToSize('Payroll deductions include employee EPF, APIT and other deductions. Late and no-pay adjustments are reflected in salary for EPF.', width - margin * 2), margin, y + 3);
    });
  } else {
    header();
    const totals = Object.fromEntries(report.columns.filter(isTotalColumn).map(column => [column.key, sum(rows, column.key)]));
    const totalRow = { ...totals, employee_code: 'TOTAL', employee_name: `${rows.length} records`, department_name: '' };
    [...rows, totalRow].forEach((row, index) => {
      pdf.setFontSize(7);
      const cells = report.columns.map(column => pdf.splitTextToSize(text(index===rows.length && !isTotalColumn(column) && !['employee_code','employee_name'].includes(column.key) ? '' : row[column.key] === '' ? '' : column.format(row[column.key] ?? null)), cellWidth - 3));
      const rowHeight = Math.max(9, ...cells.map(lines => lines.length * 3.5 + 4));
      if (y + rowHeight > height - 16) { pdf.addPage(); heading(); header(); }
      pdf.setFont('helvetica', index === rows.length ? 'bold' : 'normal'); pdf.setTextColor(40);
      if (index % 2 === 0) { pdf.setFillColor(247, 249, 250); pdf.rect(margin, y, width - margin * 2, rowHeight, 'F'); }
      cells.forEach((lines, cell) => pdf.text(lines, margin + cell * cellWidth + 1.5, y + 4));
      y += rowHeight;
    });
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(100);
    pdf.text(`Page ${page} of ${pages} | Missing values shown as -; totals include recorded values only.`, margin, height - 7);
  }
  pdf.save(`${report.id}-report-${context.slice(0, report.daily?10:7)}.pdf`);
}
