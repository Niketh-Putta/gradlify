# KaTeX Debug Mode

## Overview

Safe LaTeX normalization layer with debug capabilities for troubleshooting math rendering.

## Features

✅ **Safe Normalization**: Only fixes obviously broken patterns
✅ **Crash-Proof**: Always falls back to plain text if rendering fails
✅ **Debug Mode**: Shows original, normalized, and transformations applied
✅ **No Database Changes**: All fixes happen at runtime only

## Usage

### Enable Debug Mode

**Option 1: Console**
```javascript
window.toggleKatexDebug()
// Returns: true (enabled) or false (disabled)
```

**Option 2: UI Toggle**
```tsx
import { KatexDebugToggle } from '@/components/KatexDebugToggle';

// Add to any page
<KatexDebugToggle />
```

**Option 3: LocalStorage**
```javascript
localStorage.setItem('katex-debug-mode', 'true')
// Refresh page
```

### Debug Output

When enabled, you'll see:
- **Original**: Raw LaTeX string from database
- **Normalized**: After safe transformations
- **Fixes**: List of corrections applied (if any)

Example:
```
Original: \frac12 + \sqrt5
Normalized: \frac{1}{2} + \sqrt{5}
Fixes: Fixed frac missing braces, Fixed sqrt missing braces
```

## Transformations Applied

### 1. Fractions
- `\frac12` → `\frac{1}{2}`
- `\frac73` → `\frac{7}{3}`
- `\frac7{8}` → `\frac{7}{8}`

### 2. Square Roots
- `\sqrt5` → `\sqrt{5}`
- `\sqrt73` → `\sqrt{73}`

### 3. Degree Symbols
- `31\circ` → `31^{\circ}`
- `45\circ` → `45^{\circ}`

### 4. Trig Functions
- `sin31` → `\sin(31)`
- `\sin31\circ` → `\sin(31^{\circ})`
- `cos45` → `\cos(45)`

### 5. Cleanup
- Remove all `$` signs
- Remove stray backslashes
- Balance unmatched braces
- Normalize Unicode superscripts

## Safety Guarantees

1. **No Database Modifications**: All fixes are runtime-only
2. **Preserves Working Code**: If it renders correctly, it's not touched
3. **Graceful Degradation**: Falls back to plain text on errors
4. **No Crashes**: Triple-layered error handling
5. **Reversible**: Debug mode shows exactly what changed

## Error Handling

### Level 1: Normalization
- Catches malformed patterns
- Applies safe fixes
- Tracks transformations

### Level 2: KaTeX Rendering
- `throwOnError: false`
- `strict: false`
- Try-catch blocks

### Level 3: Fallback
- Renders as escaped plain text
- Shows error in debug mode
- Never crashes the page

## Files

- `src/lib/mathUtils.ts` - Normalization logic
- `src/components/MathRenderer.tsx` - Rendering with debug support
- `src/components/KatexDebugToggle.tsx` - UI toggle component

## Testing

1. Enable debug mode: `window.toggleKatexDebug()`
2. Navigate to pages with math content
3. Check debug boxes for transformations
4. Verify no crashes occur
5. Disable debug mode when done
