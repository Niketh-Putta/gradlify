export const formatExplanation = (explanation?: string | null): string => {
  if (!explanation) return "";
  let clean = String(explanation);

  // No em/en dashes in explanations (prefer commas)
  clean = clean.replace(/\u2014/g, ", ").replace(/\u2013/g, ", ").replace(/-/g, ", ");
  clean = clean.replace(/,\s{2,}/g, ", ");

  // Remove any metadata square bracket content like [VISUAL: Unit Pricing] or [Ratios]
  // We match brackets that contain a colon (e.g. [VISUAL: ...]) OR contain only letters/spaces.
  clean = clean.replace(/\[([A-Z\s]+:[^\]]+|[A-Za-z\s]+)\]\s*/g, "");

  // Remove "💡 Key Insight:" or "Key Insight:" anywhere in the text
  clean = clean.replace(/(?:💡\s*)?(?:Key\s+Insight\s*[:.-]?)\s*/gi, "");

  // Format Step numbers cleanly by ensuring they are separated by double newlines.
  clean = clean.replace(/\s*(Step\s*\d+\s*[:).-]?)\s*/gi, (match, stepName) => `\n\n${stepName.trim()} `);
  
  // Format "Answer: 4" or "Final Answer: " into its own line when sentence-initial.
  // Case-sensitive "Answer" so "wrong answer" is never split.
  clean = clean.replace(/(^|[.\n])\s*((?:Final\s+)?Answer\s*[:).-]?)\s*/gm, (match, before, ansPrefix) => `${before}\n\n${ansPrefix.trim()} `);
  
  // Cleanup any extra newlines created by replacements
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();
  return clean;
};
