const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

let inDouble = false;
let inSingle = false;
let inBacktick = false;
let escaped = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
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

console.log(`Double: ${inDouble}, Single: ${inSingle}, Backtick: ${inBacktick}`);
