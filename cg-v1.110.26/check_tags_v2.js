const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

// A more robust way to find JSX tags
// 1. Remove comments
let code = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');

// 2. Find tags
const regex = /<(\/?)([A-Z][a-zA-Z0-9]*|div|p|h1|h3|h4|span|label|input|textarea)(\s+[^>]*)?>/g;
let match;
const stack = [];

while ((match = regex.exec(code)) !== null) {
    const fullTag = match[0];
    const isClosing = match[1] === '/';
    const tagName = match[2];
    const isSelfClosing = fullTag.endsWith('/>');

    if (isSelfClosing) {
        continue;
    }

    if (isClosing) {
        if (stack.length === 0) {
            console.log(`Extra closing tag </${tagName}> at index ${match.index}`);
            continue;
        }
        const last = stack.pop();
        if (last.name !== tagName) {
            console.log(`Mismatched close tag: </${tagName}> at index ${match.index} expected </${last.name}> (opened at ${last.index})`);
        }
    } else {
        stack.push({ name: tagName, index: match.index });
    }
}

if (stack.length > 0) {
    console.log(`Unclosed tags:`);
    stack.forEach(s => {
        const line = code.substring(0, s.index).split('\n').length;
        console.log(`- <${s.name}> at line ${line}`);
    });
} else {
    console.log("All tags balanced!");
}
