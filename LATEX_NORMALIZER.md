# LaTeX Normalizer - Render-Time Safety Layer

## Overview

A TypeScript utility that converts broken LaTeX patterns into valid KaTeX syntax **at render time only**.

**Zero database modifications** - all normalization happens in memory before rendering.

## Location

📁 `src/lib/latexNormalizer.ts`

## Function Signature

```typescript
function normalizeMath(input: string): string
```

## What It Fixes

### 1. Fractions
```typescript
// Input  → Output
\frac12   → \frac{1}{2}    // Missing both braces
\frac{7}3 → \frac{7}{3}    // Missing denominator brace
\frac7{3} → \frac{7}{3}    // Missing numerator brace
```

### 2. Square Roots
```typescript
// Input   → Output
sqrt9     → \sqrt{9}       // Plain text
\sqrt9    → \sqrt{9}       // LaTeX without braces
\sqrt x   → \sqrt{x}       // Variable without braces
```

### 3. Degree Symbols
```typescript
// Input      → Output
31\circ      → 31^{\circ}    // Missing superscript
45°          → 45^{\circ}    // Plain degree symbol
```

### 4. Trigonometric Functions
```typescript
// Input            → Output
sin30              → \sin(30)           // Plain text
\sin30             → \sin(30)           // Missing parentheses
\sin30^\circ       → \sin(30^{\circ})   // Degree without parens
sin(30^\circ)      → \sin(30^{\circ})   // Add backslash
```

### 5. Dollar Signs
```typescript
// Input   → Output
$x^2$     → x^2     // Remove all $ signs
$$y$$     → y       // Remove display mode $
```

### 6. Stray Backslashes
```typescript
// Input   → Output
\7        → 7       // Backslash before digit
\9        → 9       // Invalid escape
```

### 7. Unmatched Braces
```typescript
// Input           → Output
\frac{1}{2        → \frac{1}{2}    // Add missing close
\frac{1}2}        → \frac{1}{2}    // Remove extra close
```

### 8. Nested Patterns
```typescript
// Input                  → Output
\frac\sqrt{7}{11}        → \frac{\sqrt{7}}{11}
\frac{\sqrt{73}}{2}      → \frac{\sqrt{73}}{2}  // Already valid
```

## Safety Features

### ✅ Never Crashes
- Wrapped in try-catch
- Returns original input on error
- Logs warning to console

### ✅ Never Modifies Database
- Only processes strings in memory
- No SQL queries
- No Supabase calls

### ✅ Preserves Valid LaTeX
- Only fixes obviously broken patterns
- Doesn't touch well-formed expressions
- No over-normalization

## Usage

### In Components

```typescript
import { normalizeMath } from '@/lib/latexNormalizer';

// Before rendering
const cleanLatex = normalizeMath(rawLatex);

// Then pass to KaTeX
katex.render(cleanLatex, element);
```

### In MathRenderer.tsx

Already integrated:

```typescript
export function MathRenderer({ content }: MathRendererProps) {
  const normalized = normalizeMath(content);
  // ... render with KaTeX
}
```

## Testing

### Run Test Suite

```typescript
import { runTests } from '@/lib/latexNormalizer';

// In browser console:
runTests();
```

### Test Cases Included

- ✅ Fraction normalization (3 cases)
- ✅ Square root fixes (3 cases)
- ✅ Degree symbol conversions (2 cases)
- ✅ Trig function fixes (3 cases)
- ✅ Dollar sign removal (1 case)
- ✅ Brace balancing (2 cases)

### Add Custom Tests

```typescript
import { normalizeMath, TEST_CASES } from '@/lib/latexNormalizer';

// Test your own cases
const result = normalizeMath('\\frac\sqrt{7}{11}');
console.log(result); // \frac{\sqrt{7}}{11}
```

## Performance

- **Fast**: Regex-based transformations
- **Efficient**: No external API calls
- **Lightweight**: Pure JavaScript, no dependencies
- **Cached**: Runs once per render cycle

## Error Handling

### Graceful Degradation

```typescript
try {
  const clean = normalizeMath(broken);
  katex.render(clean, element);
} catch (error) {
  // Falls back to plain text
  element.textContent = broken;
}
```

### Logging

All errors logged to console:
```
⚠️ LaTeX normalization failed: [error details]
```

## Integration Points

### Files That Use This

1. ✅ `src/components/MathRenderer.tsx` - Main renderer
2. ✅ `src/lib/mathUtils.ts` - Legacy support (uses new normalizer)
3. ✅ `src/components/MathText.tsx` - If used

### No Changes Needed In

- ❌ Database migrations
- ❌ Supabase functions
- ❌ API endpoints
- ❌ SQL queries

## Maintenance

### Adding New Patterns

```typescript
// In normalizeMath() function:

// STEP X: Fix new pattern
// Common error: description
result = result.replace(/pattern/g, 'replacement');
```

### Updating Tests

```typescript
// In TEST_CASES array:
{
  input: 'broken pattern',
  expected: 'fixed pattern',
  description: 'What this fixes'
}
```

## Example Output

### Before Normalization
```
\frac12 + \sqrt9 = sin30\circ
```

### After Normalization
```
\frac{1}{2} + \sqrt{9} = \sin(30^{\circ})
```

### Rendered Result
½ + √9 = sin(30°)

## Best Practices

1. ✅ **Always normalize before rendering**
2. ✅ **Never modify database content**
3. ✅ **Log errors, don't throw**
4. ✅ **Test new patterns thoroughly**
5. ✅ **Preserve valid LaTeX**

## Support

For issues or questions about the normalizer:

1. Check test cases in `latexNormalizer.ts`
2. Run `runTests()` in console
3. Review normalization steps (inline comments)
4. Check console for warnings
