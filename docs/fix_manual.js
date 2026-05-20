const fs = require('fs');
const file = 'c:/Users/LUXE/Desktop/OrdiveX_v9/docs/ORDIVEX_MANUEL_INTERNE.html';
let c = fs.readFileSync(file, 'utf8');

// Count before
const countBefore = (c.match(/❌/g) || []).length;
console.log('Found ' + countBefore + ' instances of ❌');

// Replace actual Unicode chars
c = c.replace(/❌/g, 'Non');
c = c.replace(/✅/g, 'Oui');
c = c.replace(/↓/g, '|');
c = c.replace(/→/g, '->');
c = c.replace(/←/g, '<-');
c = c.replace(/ℹ️/g, 'i');
c = c.replace(/⏸/g, 'Pause');
c = c.replace(/💠/g, '+');
c = c.replace(/🧾/g, '');
c = c.replace(/📄/g, '');
c = c.replace(/👤/g, '');
c = c.replace(/⛔/g, '[BLOQUE]');
c = c.replace(/⚠️/g, '[ATTENTION]');
c = c.replace(/🔒/g, '[VERROU]');
c = c.replace(/⏳/g, '');
c = c.replace(/🛡️/g, '');

// Update version
c = c.replace(/v9\.4\.4/g, 'v9.4.5');

// Upgrade print CSS for professional PDF
const oldPrint = /@media print\{body\{background:#fff;color:#222\}\.container\{max-width:100%;padding:20px\}h1,h2,h3\{color:#1a1a2e;-webkit-text-fill-color:#1a1a2e\}pre,code\{background:#f5f5f5;color:#333;border-color:#ddd\}table th\{background:#eee;color:#333\}table td\{color:#333;border-color:#ddd\}\.btn-download-pdf\{display:none!important\}\}/;

if (oldPrint.test(c)) {
  c = c.replace(oldPrint, `@media print{
@page{size:A4;margin:20mm 18mm 20mm 18mm}
body{background:#fff!important;color:#1a1a1a!important;font-size:11pt;line-height:1.5}
.container{max-width:100%;padding:0;margin:0}
h1{font-size:18pt;font-weight:800;color:#1a1a2e!important;-webkit-text-fill-color:#1a1a2e!important;background:none!important;border-bottom:2.5pt solid #1a1a2e;margin:28pt 0 10pt;padding-bottom:6pt;page-break-after:avoid}
h2{font-size:14pt;font-weight:700;color:#2c3e50!important;border-bottom:1pt solid #bbb;margin:22pt 0 8pt;padding-bottom:4pt;page-break-after:avoid}
h3{font-size:12pt;font-weight:600;color:#333!important;margin:16pt 0 6pt;page-break-after:avoid}
p,li{font-size:10.5pt;color:#222!important;orphans:3;widows:3}
p.step{border-left:2.5pt solid #2c3e50;padding-left:12pt;margin:4pt 0}
a{color:#2c3e50!important;text-decoration:none}
strong{color:#000!important}
code{font-size:9pt;background:#f0f0f0!important;color:#333!important;border:0.5pt solid #ccc;padding:1pt 4pt;border-radius:2pt}
pre{background:#f5f5f5!important;color:#222!important;border:1pt solid #ddd;border-radius:4pt;padding:10pt 14pt;font-size:8.5pt;page-break-inside:avoid}
pre code{background:none!important;border:none;padding:0}
blockquote{border-left:3pt solid #e67e22;background:#fef9e7!important;color:#7d6608!important;padding:8pt 12pt;margin:8pt 0;page-break-inside:avoid}
table{width:100%;border-collapse:collapse;font-size:9.5pt;page-break-inside:avoid}
th{background:#2c3e50!important;color:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:600;text-align:left;padding:6pt 10pt;border:0.5pt solid #2c3e50}
td{padding:5pt 10pt;border:0.5pt solid #ddd;color:#222!important}
tr:nth-child(even) td{background:#f8f9fa!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
hr{border:none;border-top:0.5pt solid #ccc;margin:16pt 0}
.btn-download-pdf,.btn-retour-sommaire{display:none!important}
}`);
  console.log('Print CSS upgraded to professional');
} else {
  console.log('Print CSS pattern not found - skipping');
}

// Count after
const countAfter = (c.match(/❌/g) || []).length;
console.log('Remaining ❌ after fix: ' + countAfter);

fs.writeFileSync(file, c, 'utf8');
console.log('Done! Manual cleaned.');
