const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

const lines = content.split('\n');
let inDouble = false;
let inSingle = false;
let inBacktick = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let escaped = false;
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            continue;
        }
        if (char === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
        if (char === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
        if (char === '`' && !inDouble && !inSingle) inBacktick = !inBacktick;
    }
    if (inDouble || inSingle || inBacktick) {
        // console.log(`Potential issue at line ${i+1}: D:${inDouble}, S:${inSingle}, B:${inBacktick}`);
        // But strings can span multiple lines. However, JSX attributes usually don't.
    }
}

// More sophisticated: skip template literals with backticks correctly
// Actually, let's just find the first odd quote count on a line that isn't a long string.
lines.forEach((line, i) => {
    let count = 0;
    for (const c of line) if (c === '"') count++;
    if (count % 2 !== 0) {
        console.log(`Line ${i + 1} has odd double quote count (${count}): ${line.trim()}`);
    }
});
