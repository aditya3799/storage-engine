const fs = require('fs');
const html = fs.readFileSync('./index.html', 'utf8');
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

if (scriptMatch) {
  const code = scriptMatch[1];
  console.log('Script length:', code.length);
  try {
    // Replace export/import statements for Function constructor check
    const checkableCode = code.replace(/export\s+{[^}]*};?/g, '').replace(/import\s+[^;]+;/g, '');
    new Function(checkableCode);
    console.log('JS syntax is completely VALID!');
  } catch (e) {
    console.error('JS Syntax Error:', e.message);
  }
} else {
  console.log('No script tag found!');
}
