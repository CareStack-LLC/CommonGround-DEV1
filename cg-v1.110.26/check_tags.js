const fs = require('fs');
const content = fs.readFileSync('/Users/tj/Desktop/CommonGround/cg-v1.110.26/frontend/app/professional/profile/page.tsx', 'utf8');

// Simplified JSX tag parser
const tags = [];
const regex = /<(\/?)([A-Z][a-zA-Z0-9]*|div|p|h1|h3|h4|span|label|input|textarea|Badge|Button|Card|CardHeader|CardTitle|CardContent|Select|SelectTrigger|SelectValue|SelectContent|SelectItem|MediaUpload|SocialLinksEditor|ListEditor|ComplexListEditor|MobileDirectoryCard|AlertTriangle|ShieldCheck|Save|CheckCircle2|X|Edit|User|Briefcase|Building2|DollarSign|Globe|Video|BookOpen|Phone|Mail|Clock|Award|CreditCard|Badge|Tabs|TabsList|TabsTrigger|TabsContent|Separator)(\s+[^>]*)?(\/?)>/g;

let match;
const stack = [];

while ((match = regex.exec(content)) !== null) {
    const isClosing = match[1] === '/';
    const tag = match[2];
    const isSelfClosing = match[4] === '/';

    if (isSelfClosing) {
        // console.log(`Self-closing tag: <${tag}/>`);
    } else if (isClosing) {
        const last = stack.pop();
        if (last !== tag) {
            console.log(`Mismatched close tag: </${tag}> expected </${last}>`);
        }
    } else {
        stack.push(tag);
    }
}

if (stack.length > 0) {
    console.log(`Unclosed tags: ${stack.join(', ')}`);
} else {
    console.log("All tags balanced!");
}
