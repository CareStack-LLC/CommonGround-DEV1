const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

const lines = content.split('\n');
let inDouble = false;

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
        if (char === '"') {
            const wasInDouble = inDouble;
            inDouble = !inDouble;
            // console.log(`Quote at L${i+1}:${j+1} - inDouble became ${inDouble}`);
        }
    }
    // Most JSX double quotes should NOT span lines unless they are within template literals
    // But this file has no template literals according to previous check.
}

console.log(`Final inDouble: ${inDouble}`);

// Binary search to find the quote that flips it to true forever?
// No, let's just find the first quote that stays true across a large block of code that should be JS.
let state = false;
for (let i = 0; i < lines.length; i++) {
    const prev = state;
    for (const c of lines[i]) if (c === '"') state = !state;
    if (state !== prev) {
        // This line toggled the state.
        // If we are deep in the file and it toggles to true and never toggles back...
    }
}

// Simple: just find the first line where the balance is odd and it's NOT a typical JSX attribute.
lines.forEach((line, i) => {
    let count = 0;
    for (const c of line) if (c === '"') count++;
    if (count % 2 !== 0) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
});
