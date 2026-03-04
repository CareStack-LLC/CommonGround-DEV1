const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

const lines = content.split('\n');
let level = 0;
let inString = null; // '"', "'", or '`'

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
        if (char === '{') level++;
        if (char === '}') level--;
    }
    if (level < 0) {
        console.log(`Negative nesting level at line ${i + 1}: ${level}`);
    }
}
console.log(`Final nesting level: ${level}`);
if (level !== 0) {
    // Binary search for where it becomes unbalanced? 
    // Let's just log every line's ending level.
    level = 0;
    for (let i = 0; i < lines.length; i++) {
        for (const c of lines[i]) {
            if (c === '{') level++;
            if (c === '}') level--;
        }
        // console.log(`${i+1}: ${level}`);
    }
}
