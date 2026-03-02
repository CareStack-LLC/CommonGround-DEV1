const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

const lines = content.split('\n');
let level = 0;
let inString = null;

for (let i = 821; i < 1055; i++) {
    const line = lines[i];
    const prevLevel = level;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (inString) {
            if (char === inString && line[j - 1] !== '\\') inString = null;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            inString = char;
            continue;
        }
        if (char === '{') level++;
        if (char === '}') level--;
    }
    if (level !== prevLevel) {
        console.log(`${i + 1}: ${level} | ${line.trim()}`);
    }
}
