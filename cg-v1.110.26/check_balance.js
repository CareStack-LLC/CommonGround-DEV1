const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

function count(str, char) {
    let c = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === char) c++;
    }
    return c;
}

const curlies = count(content, '{');
const uncurlies = count(content, '}');
const parens = count(content, '(');
const unparens = count(content, ')');
const openTags = count(content, '<');
const closeTags = count(content, '>');

console.log(`{ : ${curlies}, } : ${uncurlies}`);
console.log(`( : ${parens}, ) : ${unparens}`);
console.log(`< : ${openTags}, > : ${closeTags}`);

// More sophisticated check: find the component function
const componentStart = 'export default function ProfilePage() {';
const componentIndex = content.indexOf(componentStart);
if (componentIndex !== -1) {
    const after = content.substring(componentIndex + componentStart.length);
    let balance = 1;
    for (let i = 0; i < after.length; i++) {
        if (after[i] === '{') balance++;
        else if (after[i] === '}') balance--;
        if (balance === 0) {
            console.log(`Component closes at index ${i + componentIndex + componentStart.length}`);
            console.log(`Remaining text: "${after.substring(i + 1)}"`);
            break;
        }
    }
}
