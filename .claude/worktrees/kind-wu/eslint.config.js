import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "src/components/ui/**/*.tsx",
      "src/components/DemoQuestion.tsx",
      "src/components/MathRenderer.tsx",
      "src/components/revision-diagrams/InteractiveDiagrams.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: [
      "src/components/exam/MockExamSessionNew.tsx",
      "src/components/exam/PracticeSessionNew.tsx",
      "src/pages/MockExamPage.tsx",
      "src/pages/MockExams.tsx",
      "src/pages/MockExamsImproved.tsx",
      "src/pages/Readiness.tsx",
      "src/pages/RevisionNotes.tsx",
      "src/pages/RevisionNotesSection.tsx",
      "src/pages/RevisionNotesTopic.tsx",
      "supabase/functions/generate-questions/index.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
