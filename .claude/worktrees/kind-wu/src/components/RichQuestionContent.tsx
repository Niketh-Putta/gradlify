import MathText from "@/components/MathText";
import { cn } from "@/lib/utils";

type RichContentBlock =
  | { type: "text"; lines: string[] }
  | { type: "table"; header: string[]; rows: string[][] };

function isLikelyTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const withoutPipes = trimmed.replace(/\|/g, "").trim();
  return /^[\s:-]+$/.test(withoutPipes) && withoutPipes.includes("-");
}

function splitPipeRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

export function normalizeNewlines(text: string): string {
  const raw = text ?? "";
  let normalized = raw;

  // Remove markdown-style bold/italic markers to prevent stray asterisks from leaking into the UI.
  normalized = normalized.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");

  // Treat HTML line breaks and the `/n` shorthand as explicit new lines for imported explanations.
  normalized = normalized.replace(/<br\s*\/?>/gi, "\n").replace(/\/n/g, "\n");

  // Insert line breaks after sentences when the full stop is not part of a decimal.
  normalized = normalized
    .replace(/(?<!\d)\.\s+/g, ".\n")
    .replace(/(?<=\d)\.(?!\d)/g, ".\n");

  // Ensure units stay separated from digits when they are glued to letters (e.g. "a3m" -> "a 3m").
  normalized = normalized.replace(/([a-zA-Z])(\d+(?:\.\d+)?m\b)/g, "$1 $2");

  const hasAlignedEnv = /\\{1,2}begin\{align\*?\}|\\{1,2}end\{align\*?\}|\\{1,2}begin\{aligned\}|\\{1,2}end\{aligned\}/.test(
    normalized,
  );
  if (hasAlignedEnv) {
    normalized = normalized
      .replace(
        /\\{1,2}begin\{align\*?\}|\\{1,2}end\{align\*?\}|\\{1,2}begin\{aligned\}|\\{1,2}end\{aligned\}/g,
        "",
      )
      .replace(/\\\\/g, "\n")
      .replace(/&/g, "");
  }

  // Split multiple "= 0" factor steps onto separate lines
  // e.g. "(x-2)=0 or (x-3)=0" -> separate lines for clarity.
  if (/(=\s*0).*(=\s*0)/.test(normalized)) {
    normalized = normalized.replace(/(=\s*0)\s*(?:,|;|or|and)\s*/gi, "$1\n");
  }
  // Split chained root statements after "gives" so each bracket-to-zero is on its own line.
  // Example: "... gives x = 5 x + 4 = 0 gives x = -4" -> line break before "x + 4 = 0".
  normalized = normalized.replace(/(gives\s+x\s*=\s*[^\\n]+?)\s+(x\s*[+-])/gi, "$1\n$2");

  // Ensure step-by-step explanations appear on their own lines for readability.
  // Example: "Step 1: ... Step 2: ... Final answer: ..."
  normalized = normalized
    .replace(/(\S)\s*(Step\s*\d+\s*[:).–—-])/gi, "$1\n$2")
    .replace(/(\S)\s*(Final answer\s*[:).–—-])/gi, "$1\n$2")
    .replace(/(\S)\s*(Answer\s*[:).–—-])/gi, "$1\n$2")
    // Force step labels onto their own line, with the step content on the next line.
    .replace(/\s*(Step\s*\d+\s*[:).–—-])\s*/gi, "\n$1\n")
    // Force final answer labels onto their own line.
    .replace(/\s*(Final answer)\s*[:).–—-]\s*/gi, "\n$1:\n")
    .replace(/\s*(Answer)\s*[:).–—-]\s*/gi, "\n$1:\n")
    // Collapse excessive blank lines introduced by splitting.
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Some content sources store newlines as escaped sequences ("\\n"), double-escaped
  // sequences ("\\\\n"), or slash shorthand ("/n").
  // Be careful not to break LaTeX commands like "\\neq" by only converting
  // "\\n" when it's not immediately followed by a lowercase letter.
  return normalized
    .replace(/\\\\r\\\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\\\r/g, "\n")
    .replace(/\/n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n(?=[^a-z]|$)/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

function parseRichContent(text: string): RichContentBlock[] {
  const normalized = normalizeNewlines(text);
  const lines = normalized.split("\n");
  let stepCounter = 1;
  const renumberedLines = lines.map((line) => {
    if (isStepLabel(line)) {
      const label = `Step ${stepCounter}:`;
      stepCounter += 1;
      return label;
    }
    return line;
  });

  const blocks: RichContentBlock[] = [];
  let pendingText: string[] = [];

  const flushText = () => {
    if (pendingText.length === 0) return;
    blocks.push({ type: "text", lines: pendingText });
    pendingText = [];
  };

  for (let i = 0; i < renumberedLines.length; i++) {
    const line = renumberedLines[i] ?? "";
    const nextLine = renumberedLines[i + 1];

    const looksLikeHeader = line.includes("|");
    const looksLikeSeparator = typeof nextLine === "string" && isLikelyTableSeparatorLine(nextLine);

    if (looksLikeHeader && looksLikeSeparator) {
      flushText();

      const header = splitPipeRow(line);
      const rows: string[][] = [];

      let j = i + 2;
      while (j < lines.length) {
        const rowLine = (lines[j] ?? "").trim();
        if (!rowLine) break;
        if (!rowLine.includes("|")) break;

        const row = splitPipeRow(rowLine);

        if (row.length < header.length) {
          rows.push([...row, ...new Array(header.length - row.length).fill("")]);
        } else if (row.length > header.length) {
          rows.push(row.slice(0, header.length));
        } else {
          rows.push(row);
        }
        j++;
      }

      blocks.push({ type: "table", header, rows });
      i = j - 1;
      continue;
    }

    pendingText.push(line);
  }

  flushText();
  return blocks;
}

function isLikelyStandaloneMath(line: string): boolean {
  const trimmed = (line ?? "").trim();
  if (!trimmed) return false;

  // If it includes any LaTeX commands and doesn't look like a narrative sentence,
  // treat it as display math for better readability.
  const hasLatex = /\\[a-zA-Z]+/.test(trimmed) || /\^\{|_\{|×|√/.test(trimmed);
  if (!hasLatex) return false;

  // Heuristic: if it has a colon or starts with "Step", it's likely explanatory text.
  if (/^step\s*\d+/i.test(trimmed) || trimmed.includes(":")) return false;

  // Heuristic: if it contains normal words (letters separated by spaces), treat as text.
  // Keep math like a_n, x^2, \frac{...}{...} as standalone.
  const looksLikeWords = /\b[A-Za-z]{3,}\b/.test(trimmed.replace(/\\[a-zA-Z]+/g, ""));
  return !looksLikeWords;
}

function isCenteredMathLine(line: string): boolean {
  const trimmed = (line ?? "").trim();
  if (!trimmed) return false;
  if (isLikelyStandaloneMath(trimmed)) return true;
  const withoutCommands = trimmed.replace(/\\[a-zA-Z]+/g, "");
  if (/\b[A-Za-z]{3,}\b/.test(withoutCommands)) return false;
  return /^[0-9A-Za-z\\s+\-*/=<>≤≥≠≈^_().,]+$/.test(trimmed);
}

function isStepLabel(line: string): boolean {
  return /^Step\s*\d+\s*[:).–—-]?\s*$/i.test((line ?? "").trim());
}

function isFinalAnswerLabel(line: string): boolean {
  return /^(Final answer|Answer)\s*:?\s*$/i.test((line ?? "").trim());
}

function convertTupleToColumnVector(line: string): string {
  return line.replace(/\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*\)/g, "\\begin{pmatrix}$1\\\\$2\\end{pmatrix}");
}

export default function RichQuestionContent({ text, className }: { text: string; className?: string }) {
  const blocks = parseRichContent(text);

  return (
    <div className={className || "space-y-3"}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "table") {
          return (
            <div key={`table-${blockIndex}`} className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th
                        key={`th-${blockIndex}-${cellIndex}`}
                        className="border border-border px-3 py-2 text-left font-medium align-top"
                      >
                        <MathText text={cell} display={false} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={`tr-${blockIndex}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`td-${blockIndex}-${rowIndex}-${cellIndex}`}
                          className="border border-border px-3 py-2 align-top"
                        >
                          <MathText text={cell} display={false} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div key={`text-${blockIndex}`} className="text-base leading-relaxed space-y-2">
            {block.lines.map((line, lineIndex) => {
              line = convertTupleToColumnVector(line);
              if (!line || !line.trim()) {
                return <div key={`line-${blockIndex}-${lineIndex}`} className="h-2" />;
              }

              const centerLine = isCenteredMathLine(line);
              const stepLabel = isStepLabel(line);
              const displayMath = centerLine || isLikelyStandaloneMath(line);

              return (
                <div
                  key={`line-${blockIndex}-${lineIndex}`}
                  className={cn(
                    centerLine ? "text-center" : "text-left",
                    stepLabel && "font-medium text-foreground"
                  )}
                >
                  <MathText text={line} display={displayMath} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
