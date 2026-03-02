const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

let code = content;
// Standardize self-closing tags to make parsing easier (temporarily)
code = code.replace(/<(Input|MediaUpload|SocialLinksEditor|ListEditor|ComplexListEditor|MobileDirectoryCard|AlertTriangle|ShieldCheck|Save|CheckCircle2|X|Edit|User|Briefcase|Building2|DollarSign|Globe|Video|BookOpen|Phone|Mail|Clock|Award|CreditCard|Badge|Separator)\s+([^>]*?)\/>/g, '<$1 $2></$1>');

// Simple tag stack balancer
const tags = [];
const regex = /<(\/?)([A-Z][a-zA-Z0-9]*|div|p|h1|h3|h4|span|label|input|textarea|Badge|Button|Card|Tabs|Select[a-zA-Z]*)/g;
let match;
while ((match = regex.exec(code)) !== null) {
    const isClosing = match[1] === '/';
    const tag = match[2];
    if (isClosing) {
        if (tags.length > 0 && tags[tags.length - 1] === tag) {
            tags.pop();
        } else {
            // Unexpected closing tag, maybe ignore it or handle it
        }
    } else {
        // Many React components are self-closing in JS logic, but my regex might not catch all self-closing tags
        // Let's just focus on DIVs as they are the most likely culprit
        if (tag === 'div' || tag === 'p' || tag === 'span' || tag === 'Button' || tag === 'Card' || tag === 'Select' || tag === 'SelectItem') {
            tags.push(tag);
        }
    }
}

// This is too complex for a script. Let's do a manual reconstruction of the final blocks.
// I WILL MANUALLY DEFINE THE FINAL 200 LINES.
