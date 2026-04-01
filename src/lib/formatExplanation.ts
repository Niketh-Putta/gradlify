export const formatExplanation = (explanation?: string | null): string => {
  if (!explanation) return "";
  let clean = String(explanation);

  // Remove any metadata square bracket content like [VISUAL: Unit Pricing] or [Ratios]
  // We match brackets that contain a colon (e.g. [VISUAL: ...]) OR contain only letters/spaces.
  clean = clean.replace(/\[([A-Z\s]+:[^\]]+|[A-Za-z\s]+)\]\s*/g, "");

  // Format Step numbers cleanly by ensuring they are separated by double newlines.
  clean = clean.replace(/\s*(Step\s*\d+\s*[:).\-]?)\s*/gi, (match, stepName) => `\n\n${stepName.trim()} `);
  
  // Format "answer: £4" or "Answer: 4" or "Final Answer: " into its own line
  clean = clean.replace(/\s*((?:Final\s*)?answer\s*[:).\-]?)\s*(.*)/ig, (match, ansPrefix, ans) => `\n\n${ansPrefix.trim()} ${ans}`);
  
  // Cleanup any extra newlines created by replacements
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();
  return clean;
};
