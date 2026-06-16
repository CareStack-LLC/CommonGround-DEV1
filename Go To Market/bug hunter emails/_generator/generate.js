const fs = require('fs');
const path = require('path');

const dir = __dirname;
const outHtml = path.join(dir, '..', 'html');
const outTxt = path.join(dir, '..', 'txt');

// Ensure output dirs exist
fs.mkdirSync(outHtml, { recursive: true });
fs.mkdirSync(outTxt, { recursive: true });

// Load data and templates
const testers = JSON.parse(fs.readFileSync(path.join(dir, 'testers.json'), 'utf8'));
const htmlTemplate = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
const txtTemplate = fs.readFileSync(path.join(dir, 'template.txt'), 'utf8');

const placeholders = [
  'firstName', 'fullName', 'role', 'familyName', 'planType',
  'coparentName', 'coparentEmail', 'children', 'loginEmail', 'password'
];

function render(template, tester) {
  let output = template;
  for (const key of placeholders) {
    output = output.replaceAll(`{{${key}}}`, tester[key]);
  }
  return output;
}

let htmlCount = 0;
let txtCount = 0;

for (const tester of testers) {
  const html = render(htmlTemplate, tester);
  const txt = render(txtTemplate, tester);

  fs.writeFileSync(path.join(outHtml, `${tester.slug}.html`), html, 'utf8');
  htmlCount++;

  fs.writeFileSync(path.join(outTxt, `${tester.slug}.txt`), txt, 'utf8');
  txtCount++;
}

console.log(`Generated ${htmlCount} HTML + ${txtCount} TXT files (${htmlCount + txtCount} total)`);
