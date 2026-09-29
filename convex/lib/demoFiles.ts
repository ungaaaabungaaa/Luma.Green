/**
 * Placeholder documents for the demo applications: a one-page PDF and simple
 * SVG pictures, each stamped DEMO so nobody mistakes them for real papers.
 */

function pdfText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("(", String.raw`\(`)
    .replaceAll(")", String.raw`\)`);
}

/** A valid one-page PDF (ASCII only) with a title and a few lines. */
export function demoPdf(title: string, lines: readonly string[]): string {
  const body = lines.map((line) => `0 -22 Td (${pdfText(line)}) Tj`).join(" ");
  const content = `BT /F1 20 Tf 60 770 Td (${pdfText(title)}) Tj /F1 12 Tf ${body} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${String(index + 1)} 0 obj\n${object}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  pdf += offsets
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`;
  return pdf;
}

function svgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** A 4:3 picture: a coloured scene with a caption and a DEMO stamp. */
export function demoPicture(
  caption: string,
  scene: "machine" | "yard" | "id" | "person",
): string {
  const shapes = {
    machine:
      '<rect x="150" y="150" width="340" height="190" rx="14" fill="#3f7d4e"/><rect x="190" y="110" width="120" height="60" rx="8" fill="#5b9b69"/><circle cx="230" cy="350" r="26" fill="#2c5a38"/><circle cx="410" cy="350" r="26" fill="#2c5a38"/><rect x="330" y="190" width="120" height="90" rx="6" fill="#dff0d8"/>',
    yard: '<rect x="90" y="250" width="140" height="110" rx="6" fill="#c8a36b"/><rect x="250" y="220" width="140" height="140" rx="6" fill="#b58d4f"/><rect x="410" y="260" width="140" height="100" rx="6" fill="#c8a36b"/><rect x="90" y="360" width="460" height="10" fill="#8a6a3a"/>',
    id: '<rect x="110" y="110" width="420" height="260" rx="18" fill="#ffffff" stroke="#3f7d4e" stroke-width="4"/><circle cx="210" cy="220" r="52" fill="#dff0d8"/><rect x="290" y="180" width="200" height="16" rx="8" fill="#9bb8a1"/><rect x="290" y="215" width="160" height="16" rx="8" fill="#9bb8a1"/><rect x="290" y="250" width="180" height="16" rx="8" fill="#9bb8a1"/>',
    person:
      '<circle cx="320" cy="190" r="80" fill="#e8c39e"/><rect x="200" y="280" width="240" height="120" rx="60" fill="#3f7d4e"/>',
  }[scene];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f1fae9"/>${shapes}<text x="320" y="440" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#1f3d27">${svgText(caption)}</text><text x="600" y="40" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="end" fill="#c0392b">DEMO</text></svg>`;
}
