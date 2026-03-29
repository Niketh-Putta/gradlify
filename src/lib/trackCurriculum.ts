import { TOPIC_SUBTOPICS } from "@/lib/topicConstants";
import { UserTrack } from "@/lib/track";

export type TrackSection = {
  key: string;
  id: string;
  label: string;
  color: string;
  subtopics: Array<{ key: string; name: string }>;
};

const GCSE_SECTIONS: TrackSection[] = [
  { key: "number", id: "Number", label: "Number", color: "#3b82f6", subtopics: TOPIC_SUBTOPICS.number.subtopics },
  { key: "algebra", id: "Algebra", label: "Algebra", color: "#8b5cf6", subtopics: TOPIC_SUBTOPICS.algebra.subtopics },
  { key: "ratio", id: "Ratio & Proportion", label: "Ratio & Proportion", color: "#10b981", subtopics: TOPIC_SUBTOPICS.ratio.subtopics },
  { key: "geometry", id: "Geometry & Measures", label: "Geometry & Measures", color: "#f59e0b", subtopics: TOPIC_SUBTOPICS.geometry.subtopics },
  { key: "probability", id: "Probability", label: "Probability", color: "#ef4444", subtopics: TOPIC_SUBTOPICS.probability.subtopics },
  { key: "statistics", id: "Statistics", label: "Statistics", color: "#06b6d4", subtopics: TOPIC_SUBTOPICS.statistics.subtopics },
];

const ELEVEN_PLUS_SECTIONS: TrackSection[] = [
  {
    key: "number_arithmetic",
    id: "Number & Arithmetic",
    label: "Number & Arithmetic",
    color: "#2563eb",
    subtopics: [
      { key: "place_value_rounding", name: "Place Value & Rounding" },
      { key: "four_operations", name: "The Four Operations (Addition, Subtraction, Multiplication, Division)" },
      { key: "number_properties", name: "Number Properties (Factors, Multiples, Primes, Squares/Cubes)" },
      { key: "fractions", name: "Fractions" },
      { key: "decimals_percentages", name: "Decimals & Percentages" },
    ],
  },
  {
    key: "algebra_ratio",
    id: "Algebra & Ratio",
    label: "Algebra & Ratio",
    color: "#db2777",
    subtopics: [
      { key: "ratio_proportion", name: "Ratio & Proportion" },
      { key: "algebra_basics", name: "Algebra Basics (Expressions & Substitution)" },
      { key: "solving_equations", name: "Solving Equations" },
      { key: "sequences", name: "Sequences" },
    ],
  },
  {
    key: "geometry_measures",
    id: "Geometry & Measures",
    label: "Geometry & Measures",
    color: "#d97706",
    subtopics: [
      { key: "shape_properties_2d_3d", name: "Properties of Shapes (2D & 3D)" },
      { key: "angles", name: "Angles" },
      { key: "perimeter_area_volume", name: "Perimeter, Area & Volume" },
      { key: "measures_time", name: "Measures & Time" },
      { key: "coordinates_transformations", name: "Coordinates & Transformations" },
    ],
  },
  {
    key: "statistics_data",
    id: "Statistics & Data",
    label: "Statistics & Data",
    color: "#0f766e",
    subtopics: [
      { key: "data_handling", name: "Data Handling (Averages & Charts)" },
      { key: "probability", name: "Probability" },
    ],
  },
  {
    key: "exam_prep",
    id: "Exam Preparation",
    label: "Exam Preparation",
    color: "#0ea5e9",
    subtopics: [
      { key: "general_skills", name: "General Skills & Strategies" },
    ],
  },
];

const ELEVEN_PLUS_READINESS_MAP: Record<string, string[]> = {
  "Number & Arithmetic": ["Number"],
  "Algebra & Ratio": ["Algebra", "Ratio", "Ratio & Proportion"],
  "Geometry & Measures": ["Geometry", "Geometry & Measures"],
  "Statistics & Data": ["Statistics", "Probability"],
};

export const ELEVEN_PLUS_ENGLISH_SECTIONS: TrackSection[] = [
  {
    key: "comprehension",
    id: "Comprehension",
    label: "Comprehension",
    color: "#059669",
    subtopics: [
      { key: "speed_retrieval", name: "Reading Speed & Precision" },
      { key: "factual_retrieval", name: "High-Speed Factual Retrieval" },
      { key: "vocabulary_context", name: "Vocabulary in Context" },
      { key: "inference", name: "Inference & Deduction" },
      { key: "figurative_language", name: "Decoding Figurative Language" },
      { key: "text_structure", name: "Text Structure & Purpose" },
      { key: "character_analysis", name: "Character Traits & Motivation" },
      { key: "poetry_decoding", name: "Decoding GL Poetry" },
      { key: "authorial_voice", name: "Authorial Voice & Perspective" },
      { key: "distractor_traps", name: "Disarming Distractor Traps" },
    ],
  },
  {
    key: "spag",
    id: "SPaG",
    label: "SPaG",
    color: "#d97706",
    subtopics: [
      { key: "word_classes", name: "Word Classes (Nouns, Verbs, etc.)" },
      { key: "punctuation_marks", name: "Punctuation Mastery" },
      { key: "sentence_structure", name: "Complex Sentence Structure" },
      { key: "spelling_rules", name: "Core Spelling Rules" },
      { key: "active_passive", name: "Active vs Passive Voice" },
    ],
  },
  {
    key: "vocabulary",
    id: "Vocabulary",
    label: "Vocabulary",
    color: "#db2777",
    subtopics: [
      { key: "synonyms", name: "Mastering Synonyms" },
      { key: "antonyms", name: "Mastering Antonyms" },
      { key: "homophones", name: "Tricky Homophones" },
      { key: "prefixes", name: "Prefix Power" },
      { key: "suffixes", name: "Suffix Secrets" },
      { key: "root-words", name: "Root Word Detectives" },
      { key: "odd-one-out", name: "Spotting the Odd One Out" },
      { key: "cloze", name: "Cloze Passage Tactics" },
      { key: "emotion", name: "Words of Emotion & Tone" },
      { key: "adjectives", name: "Supercharged Adjectives" },
    ],
  },
  {
    key: "writing",
    id: "Writing",
    label: "Writing",
    color: "#7c3aed",
    subtopics: [
      { key: "planning", name: "Planning Your Story" },
      { key: "openings", name: "Powerful Openings & Endings" },
      { key: "description", name: "Descriptive Writing Techniques" },
      { key: "vocabulary", name: "Vocabulary & Word Power" },
      { key: "figurative", name: "Figurative Language in Writing" },
      { key: "sentences", name: "Sentence Variety & Rhythm" },
      { key: "voice", name: "Narrative Voice & Perspective" },
      { key: "character", name: "Character & Dialogue" },
    ],
  }
];

export const ELEVEN_PLUS_ENGLISH_READINESS_MAP: Record<string, string[]> = {
  "Comprehension": ["Comprehension"],
  "SPaG": ["Grammar", "Spelling", "SPaG", "SPaG (Technical Accuracy)"],
  "Vocabulary": ["Vocabulary", "Vocabulary & Verbal"],
};

export function getReadinessSourceTopics(track: UserTrack, topic: string): string[] {
  const normalized = topic.trim().toLowerCase();

  if (track !== "11plus") {
    if (normalized === "geometry" || normalized === "geometry & measures" || normalized === "geometry and measures") {
      return ["Geometry", "Geometry & Measures"];
    }
    if (normalized === "ratio" || normalized === "ratio & proportion" || normalized === "ratio and proportion") {
      return ["Ratio", "Ratio & Proportion"];
    }
    return [topic];
  }

  const mapped = ELEVEN_PLUS_READINESS_MAP[topic] ?? ELEVEN_PLUS_ENGLISH_READINESS_MAP[topic] ?? [topic];
  const aliases = new Set<string>(mapped);
  if (normalized === "number & arithmetic") aliases.add("Number & Arithmetic");
  if (normalized === "algebra & ratio") aliases.add("Algebra & Ratio");
  if (normalized === "geometry & measures") aliases.add("Geometry & Measures");
  if (normalized === "statistics & data") aliases.add("Statistics & Data");
  if (normalized === "spag" || normalized === "spag (technical accuracy)") {
    aliases.add("Grammar");
    aliases.add("Spelling");
    aliases.add("SPaG");
  }
  if (normalized === "vocabulary & verbal") aliases.add("Vocabulary");
  return Array.from(aliases);
}

export function getTrackSections(track: UserTrack, subject: 'maths' | 'english' = 'maths'): TrackSection[] {
  if (track === "11plus") {
    return subject === 'english' ? ELEVEN_PLUS_ENGLISH_SECTIONS : ELEVEN_PLUS_SECTIONS;
  }
  return GCSE_SECTIONS;
}

export function getTrackReadinessSections(track: UserTrack, subject: 'maths' | 'english' = 'maths'): TrackSection[] {
  if (track !== "11plus") return GCSE_SECTIONS;
  if (subject === 'english') {
    return ELEVEN_PLUS_ENGLISH_SECTIONS.filter(s => s.key !== "writing" && s.key !== "exam_prep");
  }
  // "Exam Preparation" should not be assessed as a readiness section.
  return ELEVEN_PLUS_SECTIONS.filter((section) => section.key !== "exam_prep");
}

export function getTrackLabel(track: UserTrack, subject: 'maths' | 'english' = 'maths'): string {
  if (track === "11plus") {
    return subject === 'english' ? "11+ English" : "11+ Maths";
  }
  return "GCSE Maths";
}

export function getTrackReadinessSummaryLabel(track: UserTrack, subject: 'maths' | 'english' = 'maths'): string {
  if (track === "11plus") {
    return subject === 'english' 
      ? "Your confidence across all 3 11+ English sections" 
      : "Your confidence across all 4 11+ Mathematics sections";
  }
  return "Your readiness across all 6 GCSE Mathematics topics";
}

export function buildTrackReadinessRows(
  track: UserTrack,
  readinessTopics: Array<{ topic: string; readiness: number }>,
  subject: 'maths' | 'english' = 'maths'
): Array<{ topic: string; readiness: number }> {
  if (track !== "11plus") return readinessTopics;

  const byTopic = new Map<string, number>();
  readinessTopics.forEach((item) => byTopic.set(item.topic, Number(item.readiness) || 0));

  const mapToUse = subject === 'english' ? ELEVEN_PLUS_ENGLISH_READINESS_MAP : ELEVEN_PLUS_READINESS_MAP;

  return Object.entries(mapToUse).map(([section, sourceTopics]) => {
    const values = sourceTopics.map((source) => byTopic.get(source) ?? 0);
    const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { topic: section, readiness: Math.round(avg) };
  });
}
