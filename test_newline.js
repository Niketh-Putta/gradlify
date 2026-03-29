let text = "Step 1: Set up bus stop method 225 ÷ 9. Step 2 : 225 ÷ 9 = 25. Final Answer: 25";

// formatExplanation.ts equivalent
text = text.replace(/\s*(Step\s*\d+\s*[:).–-]?)\s*/gi, (match, stepName) => `\n\n${stepName.trim()} `);
text = text.replace(/\s*((?:Final\s*)?answer\s*[:).–-]?)\s*(.*)/ig, (match, ansPrefix, ans) => `\n\n${ansPrefix.trim()} ${ans}`);
text = text.replace(/\n{3,}/g, "\n\n").trim();

// normalizeNewlines equivalent inside RichQuestionContent
text = text
    .replace(/(\S)\s*(Step\s*\d+\s*[:).–-]?)/gi, "$1\n\n$2")
    .replace(/(\S)\s*(Final answer\s*[:).–-]?)/gi, "$1\n\n$2")
    .replace(/(?<!Final\s*)(\S)\s*(Answer\s*[:).–-]?)/gi, "$1\n\n$2")
    .replace(/\s*(Step\s*\d+\s*[:).–-]?)\s*/gi, "\n\n$1 ")
    .replace(/\s*(Final answer)\s*[:).–-]?\s*/gi, "\n\n$1: ")
    .replace(/(?<!Final\s*)\s*(Answer)\s*[:).–-]?\s*/gi, "\n\n$1: ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

text = text
    .replace(/\n(?=\s*[.,:;!?])/g, " ")
    .replace(/(\S)\n(\S)/g, "$1 $2");

console.log(JSON.stringify(text));
