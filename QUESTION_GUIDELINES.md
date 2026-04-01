# 11+ English Question Generation Guidelines

Follow these rules strictly to maintain a premium, high-fidelity learning experience:

## 1. Explanation Quality (The "Why" Factor)
- **NEVER** just state that an answer is correct or incorrect.
- **Always explain WHY**: 
    - For **Correct Answers**: Provide "Direct Evidence" from the text. Quote or reference specific paragraphs/lines.
    - For **Incorrect Answers**: Provide a "Tutor Note" explaining the specific trap (e.g., "Detail trap", "Misreading", "Fabrication"). Explain why a student might have been tempted by it but why it fails the test.

## 2. Interactive Feedback
- Users must be able to click on **any** option (correct or incorrect) to see its specific justification.
- The UI should clearly differentiate between states:
    - **Green/Emerald**: Correct selection.
    - **Red/Rose**: Incorrect selection.
- Use distinct icons (e.g., `Zap` for correct, `AlertTriangle` for incorrect) to enhance visual clarity.

## 3. Question Ordering & Scroll-Sync
- Questions MUST be ordered according to their **Evidence Line** sequence in the source text.
- This ensures the left-pane focus highlight moves linearly from top to bottom, avoiding disruptive "jumping".
- Active question detection should occur at the **vertical midpoint** of the viewport.

## 4. Aesthetic Standards
- Use a curated, harmonious color palette (Amber/Yellow for English, Blue for Maths).
- Implement smooth transitions (e.g., `duration-700`) for state changes.
- Add subtle micro-animations (e.g., `animate-pulse` or `slide-in`) for feedback elements.
