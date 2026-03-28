const fs = require('fs');

let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

// Replace standard indigo/sky bg radial gradients with a generic helper function call or just raw ternaries.
// For example:
// "bg-[radial-gradient(340px_200px_at_80%_0%,rgba(99,102,241,0.25),transparent_60%)]"
// becomes
// `bg-[radial-gradient(340px_200px_at_80%_0%,${isElevenPlus ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'},transparent_60%)]`

// First, find all instances of "bg-[...]rgba(...)...]" and convert them to backticks if they are in quotes.
// Wait, actually `className={` is already using backticks, and the strings inside are expressions.
// For example: `isDark ? "bg-[radial-gradient(...)]" : "bg-[radial-gradient(...)]"`
// We can change that to:
// isDark ? (isElevenPlus ? "bg-[radial-gradient(...,rgba(245,...)]" : "bg-[radial-gradient(...,rgba(99,...)]") : ...

const colorReplacements = [
  { from: 'rgba(99,102,241', to: 'rgba(245,158,11' }, // Indigo-500 -> Amber-500
  { from: 'rgba(129,140,248', to: 'rgba(251,191,36' }, // Indigo-400 -> Amber-400
  { from: 'rgba(79,70,229', to: 'rgba(217,119,6' }, // Indigo-600 -> Amber-600
  { from: 'rgba(14,165,233', to: 'rgba(239,68,68' }, // Sky-500 -> Red-500
  { from: 'rgba(56,189,248', to: 'rgba(248,113,113' }, // Sky-400 -> Red-400
];

// To make it easy, we will use a regex to find all radial gradients in strings and wrap them in isElevenPlus branches.
code = code.replace(/"(bg-\[radial-gradient\([^)]+?\))"/g, (match, p1) => {
    // Check if it contains any of the colors we want to replacing
    let newStr = p1 + '"'; // restore end quote
    newStrInput = '"' + newStr;
    let modified = p1;
    let matched = false;
    for (const {from, to} of colorReplacements) {
        if (modified.includes(from)) {
            modified = modified.replace(from, to);
            matched = true;
        }
    }
    if (matched) {
        return `isElevenPlus ? "${modified}" : ${newStrInput}`;
    }
    return match;
});

// There is one edge case in `guidePromoSurface`:
// const guidePromoSurface = isDark
//     ? "border-white/15 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(129,140,248,0.18),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgba(14,165,233,0.15),transparent_60%)]"
//     : "border-slate-200/80 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.16),transparent_58%),radial-gradient(120%_120%_at_100%_100%,rgba(14,165,233,0.12),transparent_62%)]";
// Our regex "bg-[radial-gradient(...)]" will match it because it has multiple radial gradients.
// Wait, the regex `/"(bg-\[radial-gradient\([^)]+?\))"/g` might miss it if it has nested parentheses or multiple gradients.
// Better regex: /"(bg-\[radial-gradient\([^"\]]+\])"/g
// Or just replace all rgba literal strings manually
code = code.replace(/"([^"]*rgba\((?:99,102,241|129,140,248|79,70,229|14,165,233|56,189,248)[^"]*)"/g, (match, p1) => {
    let modified = p1;
    let matched = false;
    for (const {from, to} of colorReplacements) {
        if (modified.includes(from)) {
            // Replace all occurrences in the string
            modified = modified.split(from).join(to);
            matched = true;
        }
    }
    if (matched) {
        return `(isElevenPlus ? "${modified}" : "${p1}")`;
    }
    return match;
});

// Another edge case: `shadow-[0_30px_80px_-40px_rgba(99,102,241,0.55)]`
code = code.replace(/"([^"]*shadow-\[[^"]*rgba\((?:99,102,241|129,140,248|79,70,229|14,165,233|56,189,248)[^"]*)"/g, (match, p1) => {
    let modified = p1;
    let matched = false;
    for (const {from, to} of colorReplacements) {
        if (modified.includes(from)) {
            modified = modified.split(from).join(to);
            matched = true;
        }
    }
    if (matched) {
        return `(isElevenPlus ? "${modified}" : "${p1}")`;
    }
    return match;
});

// Let's specifically handle spotlight because it's a template literal:
// const spotlight = `radial-gradient(240px circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,${
//    isPointerFine ? 0.08 : 0.03
//  }), transparent)`
// wait, spotlight is fine, it doesn't have blue.
// The boxShadow style has:
// isDark
//    ? "0 18px 52px rgba(79,70,229,0.55), 0 0 35px rgba(99,102,241,0.55)"
//    : "0 16px 40px rgba(79,70,229,0.4), 0 0 28px rgba(99,102,241,0.35)";
code = code.replace(/"(0 18px 52px rgba\(79,70,229,0\.55\), 0 0 35px rgba\(99,102,241,0\.55\))"/g, 
    `(isElevenPlus ? "0 18px 52px rgba(217,119,6,0.55), 0 0 35px rgba(245,158,11,0.55)" : "0 18px 52px rgba(79,70,229,0.55), 0 0 35px rgba(99,102,241,0.55)")`
);
code = code.replace(/"(0 16px 40px rgba\(79,70,229,0\.4\), 0 0 28px rgba\(99,102,241,0\.35\))"/g, 
    `(isElevenPlus ? "0 16px 40px rgba(217,119,6,0.4), 0 0 28px rgba(245,158,11,0.35)" : "0 16px 40px rgba(79,70,229,0.4), 0 0 28px rgba(99,102,241,0.35)")`
);

fs.writeFileSync('src/components/LandingPage.tsx', code);
console.log("Colors replaced successfully.");
