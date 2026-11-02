const fs = require('fs');
const path = require('path');

function createSimpleTextPdf(outputPath, lines) {
  // Build a minimal, 100% compliant PDF 1.4 file
  const streamLines = ['BT', '/F1 12 Tf', '14 TL', '50 750 Td'];
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamLines.push(`(${escaped}) Tj`);
    streamLines.push('T*');
  }
  streamLines.push('ET');
  const streamContent = streamLines.join('\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(content) {
    offsets.push(pdf.length);
    pdf += `${offsets.length} 0 obj\n${content}\nendobj\n`;
  }

  // 1: Catalog
  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  // 2: Pages
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  // 3: Page
  addObj('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  // 4: Stream
  addObj(`<< /Length ${Buffer.byteLength(streamContent)} >>\nstream\n${streamContent}\nendstream`);
  // 5: Font
  addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const startxref = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${offsets.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdf, 'utf-8');
  return Buffer.from(pdf, 'utf-8');
}

function createEmptyScanPdf(outputPath) {
  // A PDF with an empty page (or just an image placeholder with no text)
  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(content) {
    offsets.push(pdf.length);
    pdf += `${offsets.length} 0 obj\n${content}\nendobj\n`;
  }

  addObj('<< /Type /Catalog /Pages 2 0 R >>');
  addObj('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObj('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>');
  addObj('<< /Length 0 >>\nstream\n\nendstream');

  const startxref = pdf.length;
  pdf += 'xref\n';
  pdf += `0 ${offsets.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pdf, 'utf-8');
  return Buffer.from(pdf, 'utf-8');
}

module.exports = { createSimpleTextPdf, createEmptyScanPdf };

