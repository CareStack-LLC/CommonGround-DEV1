const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

const lines = content.split('\n');
let level = 0;
let inString = null;
let stack = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
        if (char === '{') {
            level++;
            stack.push(i + 1);
        }
        if (char === '}') {
            level--;
            stack.pop();
        }
    }
}

console.log(`Unclosed braces opened at lines: ${stack.join(', ')}`);
