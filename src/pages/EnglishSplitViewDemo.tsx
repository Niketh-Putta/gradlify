import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, AlertTriangle, Lock, Search, Highlighter, MapPin, Sparkles, ChevronRight, Flag, Timer, Zap, Trophy, ShieldAlert, Check, Type, SpellCheck, TextCursorInput, ListChecks, Languages, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePremium } from '@/hooks/usePremium';
import { PremiumPaywall } from '@/components/PremiumPaywall';
// --- DATA ARCHITECTURE DEFINITION ---
export interface EnglishOption {
  id: string;
  text: string;
  trap: string | null;
  correct: boolean;
}

export interface EnglishQuestion {
  id: string;
  tag: string;
  tagColor: string;
  text: string;
  evidenceLine: string | 'global';
  options: EnglishOption[];
  explanation?: string;
}

export interface EnglishPassageBlock {
  id: string;
  text: string;
}

export interface EnglishSection {
  sectionId: string;
  subEngine: string;
  title: string;
  icon: any; // Keep Lucide icon generic for now
  desc: string;
  leftTitle: string;
  tier?: string;
  difficulty?: number;
  passageBlocks: EnglishPassageBlock[];
  questions: EnglishQuestion[];
}

const TEST_DATA: EnglishSection[] = [
  {
    sectionId: 'comprehension',
    subEngine: 'comprehension',
    title: 'SECTION A: READING COMPREHENSION',
    icon: BookOpen,
    desc: 'Read the text excerpt carefully and answer the following questions.',
    leftTitle: 'Passage 1: 19th Century Classic',
    passageBlocks: [
      { id: 'p1', text: "The fog was so thick it seemed to swallow the cobbled streets of London whole. Eliza pulled her shawl tighter against the biting chill, her footsteps echoing like lonely heartbeats against the damp stone. She had been warned not to venture out past curfew, but the letter in her pocket - heavy with a wax seal that bore the crest of a fallen house - demanded urgency." },
      { id: 'p2', text: "Above her, the gas lamps flickered weakly, struggling to pierce the miasma. A sudden clatter from a nearby alleyway made her freeze. Naturally, her mind raced. Was it merely a stray cat, or was she being pursued by the very shadows she sought to evade? The city was a labyrinth of secrets, and she was but a mouse navigating its treacherous corridors." },
      { id: 'p3', text: "Clutching the letter, she turned the corner onto Blackwood Avenue. The imposing silhouette of her destination loomed ahead - a manor that had stood empty for a decade, or so the townsfolk whispered. Yet, a single, pale light burned in the highest window." },
      { id: 'p4', text: "Without hesitation, Eliza ascended the crumbling stone steps. The heavy oak door was ajar, as though expecting her. From deep within the belly of the house, a violin played a haunting, frenetic melody that seemed to pull her forward against her better judgment." },
      { id: 'p5', text: "Inside, the air grew incredibly stale, smelling of undisturbed dust, old parchment, and something metallic. The foyer stretched upwards into darkness, an abyss of mahogany and tarnished silver. Every creak of the floorboards felt thunderous." },
      { id: 'p6', text: "She unfolded the letter. The handwriting was erratic, ink sploshed frantically across the vellum. 'They are watching the pendulum,' it read. Nothing more. What pendulum? Eliza scanned the desolate hallway, her eyes landing on the monolithic grandfather clock ticking rhythmically in the corner." },
      { id: 'p7', text: "As she approached the clock, the ticking seemed to magnify, drowning out the erratic violin from the floor above. She reached out, running a tentative finger along the polished glass. Behind it, a heavy brass pendulum swung with hypnotic consistency." },
      { id: 'p8', text: "Suddenly, the ticking stopped. The violin stopped. The very air seemed to hold its breath. A shadow detached itself from the heavy velvet drapes, moving with a terrifying, liquid grace toward her. She was no longer alone." }
    ],
    questions: [
      {
        id: "c_q1", tag: "Retrieval", tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        text: "What item in Eliza's possession 'demanded urgency'?", evidenceLine: "p1",
        options: [
          { id: "A", text: "A heavy wax seal", trap: "Detail trap: the seal is part of the item, not the item itself.", correct: false },
          { id: "B", text: "A letter from a fallen house", trap: "Direct Evidence: The first paragraph mentions 'the letter in her pocket - heavy with a wax seal that bore the crest of a fallen house - demanded urgency.'", correct: true },
          { id: "C", text: "Her woollen shawl", trap: "Detail retrieval trap: While mentioned, it did not 'demand urgency'.", correct: false },
          { id: "D", text: "A map of the labyrinth", trap: "Fabrication: The city is described as a labyrinth, but there is no mention of a physical map.", correct: false }
        ]
      },
      {
        id: "c_q2", tag: "Word Meaning", tagColor: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
        text: "In paragraph 2, the word 'miasma' most likely refers to:", evidenceLine: "p2",
        options: [
          { id: "A", text: "The flickering gas lamps", trap: "Context trap: the lamps are what struggle to pierce the miasma, not the miasma itself.", correct: false },
          { id: "B", text: "The thick, oppressive fog", trap: "Direct Evidence: 'Miasma' in this 19th-century context refers to the thick, polluted air or 'fog' described in the opening line.", correct: true },
          { id: "C", text: "The stray cats", trap: "Irrelevant detail from a different sentence.", correct: false },
          { id: "D", text: "The treacherous corridors", trap: "Literal interpretation trap: these are metaphors for streets, not the miasma.", correct: false }
        ]
      },
      {
        id: "c_q3", tag: "Inference", tagColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        text: "Why did Eliza ignore the warning 'not to venture out past curfew'?", evidenceLine: "p1",
        options: [
          { id: "A", text: "She enjoyed the thrill of the chase.", trap: "Unsupported inference: The text emphasizes her fear and caution, not enjoyment.", correct: false },
          { id: "B", text: "She was compelled by the urgent nature of the crested letter.", trap: "Direct Evidence: The text states the letter 'demanded urgency,' over-riding the warning to stay inside.", correct: true },
          { id: "C", text: "She needed to escape a fallen house.", trap: "Misreading of the text: The letter came FROM a fallen house; she wasn't inside one yet.", correct: false },
          { id: "D", text: "She was running away from shadows.", trap: "Timing error: The encounter with shadows happens at the end of the text, not as the initial motivation.", correct: false }
        ]
      },
      {
        id: "c_q4", tag: "Analysis", tagColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        text: "In paragraph 2, the author states: 'The city was a labyrinth of secrets, and she was but a mouse navigating its treacherous corridors.' What literary device is being used?", evidenceLine: "p2",
        options: [
          { id: "A", text: "Simile", trap: "Metaphor trap: no 'like' or 'as'.", correct: false },
          { id: "B", text: "Personification", trap: "Incorrect technique.", correct: false },
          { id: "C", text: "Metaphor", trap: null, correct: true },
          { id: "D", text: "Hyperbole", trap: "Incorrect technique.", correct: false }
        ]
      },
      {
        id: "c_q5", tag: "Synthesis", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
        text: "What mood is established in paragraph 5 when Eliza enters the manor?", evidenceLine: "p5",
        options: [
          { id: "A", text: "Joyous and welcoming.", trap: "Opposite mood.", correct: false },
          { id: "B", text: "Oppressive and unnerving.", trap: null, correct: true },
          { id: "C", text: "Peaceful and serene.", trap: "Opposite mood.", correct: false },
          { id: "D", text: "Chaotic and frenetic.", trap: "Matches earlier paragraph, not p5.", correct: false }
        ]
      },
      {
        id: "c_q6", tag: "Retrieval", tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        text: "According to the erratic handwriting in the letter, what was being watched?", evidenceLine: "p6",
        options: [
          { id: "A", text: "The grandfather clock", trap: "Close, but specific word needed.", correct: false },
          { id: "B", text: "The pendulum", trap: null, correct: true },
          { id: "C", text: "The desolate hallway", trap: "Detail trap.", correct: false },
          { id: "D", text: "The shadowy figures", trap: "Detail trap.", correct: false }
        ]
      },
      {
        id: "c_q7", tag: "Inference", tagColor: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        text: "The sentence 'The violin stopped. The very air seemed to hold its breath.' suggests that:", evidenceLine: "p8",
        options: [
          { id: "A", text: "An intense moment of suspension and impending danger has arrived.", trap: null, correct: true },
          { id: "B", text: "Eliza is struggling to breathe due to the stale air.", trap: "Literal misinterpretation.", correct: false },
          { id: "C", text: "The musician has finally finished practicing.", trap: "Contextually weak.", correct: false },
          { id: "D", text: "The clock has completely broken down.", trap: "Irrelevant.", correct: false }
        ]
      },
      {
        id: "c_q8", tag: "Word Meaning", tagColor: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20",
        text: "What does 'erratic' mean in the context of paragraph 6?", evidenceLine: "p6",
        options: [
          { id: "A", text: "Neat and meticulous", trap: "Antonym.", correct: false },
          { id: "B", text: "Unpredictable and irregular", trap: null, correct: true },
          { id: "C", text: "Written in a foreign language", trap: "Fabrication.", correct: false },
          { id: "D", text: "Extremely large", trap: "Fabrication.", correct: false }
        ]
      },
      {
        id: "c_q9", tag: "Retrieval", tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        text: "How is the heavy brass pendulum described in paragraph 7?", evidenceLine: "p7",
        options: [
          { id: "A", text: "Swinging sporadically", trap: "Contradicts text.", correct: false },
          { id: "B", text: "Swinging with hypnotic consistency", trap: null, correct: true },
          { id: "C", text: "Ticking thunderously", trap: "Confuses floorboards with pendulum.", correct: false },
          { id: "D", text: "Covered in undisturbed dust", trap: "Confuses foyer with pendulum.", correct: false }
        ]
      },
      {
        id: "c_q10", tag: "Analysis", tagColor: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        text: "In the final paragraph, the shadow is described as moving with 'liquid grace'. What does this imply?", evidenceLine: "p8",
        options: [
          { id: "A", text: "It moved clumsily and loudly.", trap: "Antonym.", correct: false },
          { id: "B", text: "It moved smoothly, fluidly, and stealthily.", trap: null, correct: true },
          { id: "C", text: "It was physically made of water.", trap: "Literal interpretation.", correct: false },
          { id: "D", text: "It was melting into the floor.", trap: "Literal interpretation.", correct: false }
        ]
      }
    ]
  },
  {
    sectionId: 'spelling',
    subEngine: 'spelling',
    title: 'SECTION B: SPELLING EXERCISES',
    icon: SpellCheck,
    desc: 'In these sentences there are some spelling mistakes. Find the group of words with the mistake. If there is no mistake, mark N.',
    leftTitle: 'Spelling Exercises Overview',
    passageBlocks: [
      { id: 's1', text: "20. The immediate / atmosphere around / the laboratory was / completly chaotic." },
      { id: 's2', text: "21. The desperate / climber clung / to the jagged edge / with exaustion." },
      { id: 's3', text: "22. The independant / journalist refused / to compromise / her sources." },
      { id: 's4', text: "23. Despite the / terrible weather, / the exhibition / was successful." },
      { id: 's5', text: "24. The proffesor / confidently delivered / a fascinating / presentation." }
    ],
    questions: [
      {
        id: "s_q1", tag: "Error-Hunt", tagColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
        text: "Line 20: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s1",
        options: [
          { id: "A", text: "The immediate", trap: null, correct: false },
          { id: "B", text: "atmosphere around", trap: null, correct: false },
          { id: "C", text: "the laboratory was", trap: null, correct: false },
          { id: "D", text: "completly chaotic.", trap: "Missing 'e' in completely.", correct: true },
          { id: "N", text: "No Mistake", trap: "Vigilance Trap.", correct: false }
        ]
      },
      {
        id: "s_q2", tag: "Error-Hunt", tagColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
        text: "Line 21: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s2",
        options: [
          { id: "A", text: "The desperate", trap: null, correct: false },
          { id: "B", text: "climber clung", trap: null, correct: false },
          { id: "C", text: "to the jagged edge", trap: null, correct: false },
          { id: "D", text: "with exaustion.", trap: "Missing 'h' in exhaustion.", correct: true },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      },
      {
        id: "s_q3", tag: "Error-Hunt", tagColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
        text: "Line 22: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s3",
        options: [
          { id: "A", text: "The independant", trap: "Ends in 'ent', not 'ant'.", correct: true },
          { id: "B", text: "journalist refused", trap: null, correct: false },
          { id: "C", text: "to compromise", trap: null, correct: false },
          { id: "D", text: "her sources.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      },
      {
        id: "s_q4", tag: "Error-Hunt", tagColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
        text: "Line 23: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s4",
        options: [
          { id: "A", text: "Despite the", trap: null, correct: false },
          { id: "B", text: "terrible weather,", trap: null, correct: false },
          { id: "C", text: "the exhibition", trap: null, correct: false },
          { id: "D", text: "was successful.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: "Accurate! There is no spelling mistake here.", correct: true }
        ]
      },
      {
        id: "s_q5", tag: "Error-Hunt", tagColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
        text: "Line 24: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s5",
        options: [
          { id: "A", text: "The proffesor", trap: "Should be 'professor' (one f, two s's).", correct: true },
          { id: "B", text: "confidently delivered", trap: null, correct: false },
          { id: "C", text: "a fascinating", trap: null, correct: false },
          { id: "D", text: "presentation.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      }
    ]
  },
  {
    sectionId: 'punctuation',
    subEngine: 'punctuation',
    title: 'SECTION C: PUNCTUATION EXERCISES',
    icon: TextCursorInput,
    desc: 'In this passage there are some punctuation mistakes. Find the group of words with the mistake in it. If there is no mistake, mark N.',
    leftTitle: 'Punctuation Exercises Overview',
    passageBlocks: [
      { id: 'h1', text: "25. James packed / his bag with / an apple a sandwich / and some crisps." },
      { id: 'h2', text: "26. \"Stop right there!\" / shouted the officer, / \"You're entering / a restricted zone.\"" },
      { id: 'h3', text: "27. The dogs / bone was buried / deep in the / back garden." },
      { id: 'h4', text: "28. Its completely / understandable / why they chose / to leave early." },
      { id: 'h5', text: "29. Although it / was raining heavily / we decided to continue / the hike." }
    ],
    questions: [
      {
        id: "h_q1", tag: "Punctuation Hunt", tagColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
        text: "Line 25: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h1",
        options: [
          { id: "A", text: "James packed", trap: null, correct: false },
          { id: "B", text: "his bag with", trap: null, correct: false },
          { id: "C", text: "an apple a sandwich", trap: "Missing commas in the list.", correct: true },
          { id: "D", text: "and some crisps.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      },
      {
        id: "h_q2", tag: "Punctuation Hunt", tagColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
        text: "Line 26: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h2",
        options: [
          { id: "A", text: "\"Stop right there!\"", trap: null, correct: false },
          { id: "B", text: "shouted the officer,", trap: "Should end with a full stop since the next quote is a new sentence.", correct: true },
          { id: "C", text: "\"You're entering", trap: null, correct: false },
          { id: "D", text: "a restricted zone.\"", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      },
      {
        id: "h_q3", tag: "Punctuation Hunt", tagColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
        text: "Line 27: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h3",
        options: [
          { id: "A", text: "The dogs", trap: "Missing possessive apostrophe (dog's).", correct: true },
          { id: "B", text: "bone was buried", trap: null, correct: false },
          { id: "C", text: "deep in the", trap: null, correct: false },
          { id: "D", text: "back garden.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      },
      {
        id: "h_q4", tag: "Punctuation Hunt", tagColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
        text: "Line 28: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h4",
        options: [
          { id: "A", text: "Its completely", trap: "Needs contraction apostrophe (It's).", correct: true },
          { id: "B", text: "understandable", trap: null, correct: false },
          { id: "C", text: "why they chose", trap: null, correct: false },
          { id: "D", text: "to leave early.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      },
      {
        id: "h_q5", tag: "Punctuation Hunt", tagColor: "bg-pink-500/10 text-pink-600 border-pink-500/20",
        text: "Line 29: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h5",
        options: [
          { id: "A", text: "Although it", trap: null, correct: false },
          { id: "B", text: "was raining heavily", trap: "Missing comma after a subordinate clause at the start.", correct: true },
          { id: "C", text: "we decided to continue", trap: null, correct: false },
          { id: "D", text: "the hike.", trap: null, correct: false },
          { id: "N", text: "No Mistake", trap: null, correct: false }
        ]
      }
    ]
  },
  {
    sectionId: 'grammar',
    subEngine: 'grammar',
    title: 'SECTION D: GRAMMAR CLOZE',
    icon: Type,
    desc: 'Choose the best word to complete each numbered gap so it makes grammatical sense.',
    leftTitle: 'Passage 3: The Discovery',
    passageBlocks: [
      { id: 'g1', text: "The explorers bravely ventured into the [ 30 ] cavern, unaware of the dangers ahead." },
      { id: 'g2', text: "As they walked, the ground began to [ 31 ] beneath their heavy boots." },
      { id: 'g3', text: "They realized they had entered a chamber [ 32 ] belonged to a long-forgotten civilization." },
      { id: 'g4', text: "Suddenly, a tremendous roar echoed, and a horde of bats [ 33 ] swiftly past them." },
      { id: 'g5', text: "It was undoubtedly the most [ 34 ] experience of their entire expedition." }
    ],
    questions: [
      {
        id: "g_q1", tag: "Adjectives", tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        text: "Gap 30: Select the most appropriate word to fill the gap.", evidenceLine: "g1",
        options: [
          { id: "A", text: "darkly", trap: "Adverb, not adjective.", correct: false },
          { id: "B", text: "mysterious", trap: null, correct: true },
          { id: "C", text: "mystery", trap: "Noun.", correct: false },
          { id: "D", text: "mystify", trap: "Verb.", correct: false }
        ]
      },
      {
        id: "g_q2", tag: "Verbs", tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        text: "Gap 31: Select the most appropriate word to fill the gap.", evidenceLine: "g2",
        options: [
          { id: "A", text: "tremble", trap: null, correct: true },
          { id: "B", text: "trembling", trap: "Incorrect tense after 'to'.", correct: false },
          { id: "C", text: "trembled", trap: "Past tense after infinitive marker 'to'.", correct: false },
          { id: "D", text: "trembles", trap: "Present tense after infinitive marker 'to'.", correct: false }
        ]
      },
      {
        id: "g_q3", tag: "Pronouns", tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        text: "Gap 32: Select the most appropriate word to fill the gap.", evidenceLine: "g3",
        options: [
          { id: "A", text: "who", trap: "Used for people.", correct: false },
          { id: "B", text: "where", trap: "Used for location, doesn't fit grammar.", correct: false },
          { id: "C", text: "which", trap: null, correct: true },
          { id: "D", text: "whose", trap: "Used for possession.", correct: false }
        ]
      },
      {
        id: "g_q4", tag: "Verbs (Tense)", tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        text: "Gap 33: Select the most appropriate word to fill the gap.", evidenceLine: "g4",
        options: [
          { id: "A", text: "flew", trap: null, correct: true },
          { id: "B", text: "flown", trap: "Needs auxiliary verb (had flown).", correct: false },
          { id: "C", text: "flies", trap: "Incorrect tense.", correct: false },
          { id: "D", text: "flying", trap: "Incomplete verb phrase.", correct: false }
        ]
      },
      {
        id: "g_q5", tag: "Adjectives", tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        text: "Gap 34: Select the most appropriate word to fill the gap.", evidenceLine: "g5",
        options: [
          { id: "A", text: "terrify", trap: "Verb.", correct: false },
          { id: "B", text: "terrified", trap: "Describes feelings, not the experience itself.", correct: false },
          { id: "C", text: "terrifying", trap: null, correct: true },
          { id: "D", text: "terror", trap: "Noun.", correct: false }
        ]
      }
    ]
  }
];

// Completely Separate module for Vocab Practice (Never in Mock Exams)
const VOCAB_PRACTICE: EnglishSection = {
  sectionId: 'vocab',
  subEngine: 'vocab',
  title: 'SECTION E: VOCABULARY SYNONYMS',
  icon: Languages,
  desc: 'Vocabulary questions test your raw lexical knowledge and ability to infer meaning.',
  leftTitle: 'Vocabulary Synonyms & Antonyms',
  passageBlocks: [
    { id: 'v1', text: "The ancient manor possessed an incredibly scrupulous and meticulous design, ensuring that every stone was perfectly aligned with the cosmos." },
    { id: 'v2', text: "The wealthy owner was known to be heavily involved in the planning, rejecting any sporadic flashes of inspiration in favor of rigid structure." },
    { id: 'v3', text: "His lethargic successors failed to maintain the facade, allowing ivy to aggressively pillage the grand stonework." },
    { id: 'v4', text: "By sunset, the once-imposing edifice became a sinister silhouette, casting an ominous and deleterious shadow over the surrounding valleys." }
  ],
  questions: [
    {
      id: "v_q1", tag: "Synonym", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      text: "Based on line v1, find the closest synonym to the word 'meticulous'.", evidenceLine: "v1",
      options: [
        { id: "A", text: "Careless", trap: "Antonym.", correct: false },
        { id: "B", text: "Painstaking", trap: null, correct: true },
        { id: "C", text: "Ancient", trap: "Context word, not a synonym.", correct: false },
        { id: "D", text: "Grand", trap: "Unrelated meaning.", correct: false }
      ]
    },
    {
      id: "v_q2", tag: "Antonym", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      text: "Based on line v2, find the closest antonym to the word 'sporadic'.", evidenceLine: "v2",
      options: [
        { id: "A", text: "Occasional", trap: "Synonym, not antonym.", correct: false },
        { id: "B", text: "Sudden", trap: "Similar meaning.", correct: false },
        { id: "C", text: "Constant", trap: null, correct: true },
        { id: "D", text: "Erratic", trap: "Synonym.", correct: false }
      ]
    },
    {
      id: "v_q3", tag: "Synonym", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      text: "Based on line v3, find the closest synonym to the word 'lethargic'.", evidenceLine: "v3",
      options: [
        { id: "A", text: "Energetic", trap: "Antonym.", correct: false },
        { id: "B", text: "Sluggish", trap: null, correct: true },
        { id: "C", text: "Wealthy", trap: "Refers to the predecessor.", correct: false },
        { id: "D", text: "Aggressive", trap: "Context word, not synonym.", correct: false }
      ]
    },
    {
      id: "v_q4", tag: "Synonym", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      text: "Based on line v3, find the closest synonym to the word 'pillage'.", evidenceLine: "v3",
      options: [
        { id: "A", text: "Preserve", trap: "Antonym.", correct: false },
        { id: "B", text: "Decorate", trap: "Incorrect understanding of the ivy's effect.", correct: false },
        { id: "C", text: "Plunder", trap: null, correct: true },
        { id: "D", text: "Climb", trap: "Literal action of ivy, not the meaning of 'pillage'.", correct: false }
      ]
    },
    {
      id: "v_q5", tag: "Antonym", tagColor: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      text: "Based on line v4, find the closest antonym to the word 'deleterious'.", evidenceLine: "v4",
      options: [
        { id: "A", text: "Harmful", trap: "Synonym, not antonym.", correct: false },
        { id: "B", text: "Sinister", trap: "Context word.", correct: false },
        { id: "C", text: "Beneficial", trap: null, correct: true },
        { id: "D", text: "Toxic", trap: "Synonym.", correct: false }
      ]
    }
  ]
};

export function EnglishSplitViewDemo() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isPremium, incrementMockUsage, refreshUsage, canStartMockExam } = usePremium('11plus');
  const mockConsumedRef = useRef(false);
  
  const diffParam = searchParams.get('difficulty');
  
  const [dbSections, setDbSections] = useState<EnglishSection[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(true);

  useEffect(() => {
    const fetchPassages = async () => {
      try {
        let query = supabase.from('english_passages' as any).select('*');
        if (diffParam && diffParam !== 'mixed' && diffParam !== 'all') {
           query = query.eq('difficulty', parseInt(diffParam));
        }

        const diffMinParam = searchParams.get('difficultyMin');
        const diffMaxParam = searchParams.get('difficultyMax');

        if (diffMinParam) {
           query = query.gte('difficulty', parseInt(diffMinParam));
        }
        if (diffMaxParam) {
           query = query.lte('difficulty', parseInt(diffMaxParam));
        }

        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
           const mapped: EnglishSection[] = data.map((row: any) => ({
             sectionId: row.sectionId,
             subEngine: row.subtopic,
             title: row.title || `SECTION: ${row.sectionId.toUpperCase()}`,
             icon: BookOpen,
             desc: row.desc || 'Read the text carefully and answer the following questions.',
             leftTitle: row.title || 'Practice Source',
             tier: row.tier || 'Level Unknown',
             difficulty: row.difficulty,
             passageBlocks: row.passageBlocks || [],
             questions: row.questions || []
           }));
           setDbSections(mapped);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchPassages();
  }, [diffParam]);
  
  const modeParam = searchParams.get('mode') || 'practice';
  // Topics usually arrives comma separated from MockExams, e.g., "Comprehension,SPaG"
  const rawTopics = searchParams.get('topics') || 'Comprehension';
  const selectedTopics = rawTopics.toLowerCase();
  
  const examMode = modeParam === 'mock-exam' ? 'mock' : 'practice';

  const mockConfig: Record<string, boolean> = {
    comprehension: selectedTopics.includes('comprehension'),
    spelling: selectedTopics.includes('spag'),
    punctuation: selectedTopics.includes('spag'),
    grammar: selectedTopics.includes('spag'),
    vocab: selectedTopics.includes('vocabulary')
  };

  const [practiceFocus, setPracticeFocus] = useState<string>(
    selectedTopics.includes('vocabulary') ? 'vocab' : 
    (selectedTopics.includes('spag') ? 'spag' : 'comprehension')
  );

  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [reviewViewedOptions, setReviewViewedOptions] = useState<Record<string, string>>({});

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [showTrap, setShowTrap] = useState<string | null>(null);
  
  // Storage key based on mode and topics
  const highlightsStorageKey = `gradlify_highlights_${examMode}_${selectedTopics}`;
  const [highlights, setHighlights] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(highlightsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(highlightsStorageKey, JSON.stringify(highlights));
  }, [highlights, highlightsStorageKey]);


  
  const [timeLeft, setTimeLeft] = useState(3000); 
  const [isHighlightMode, setIsHighlightMode] = useState<boolean>(false);

  const passageContainerRef = useRef<HTMLDivElement>(null);
  const passageSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const passageLineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastEvidenceRefKey = useRef<string | null>(null);

  // 1. FILTERING LOGIC
  const activeSections = useMemo(() => {
    const sourceData = dbSections.length > 0 ? dbSections : [...TEST_DATA, VOCAB_PRACTICE];
    
    // Intelligent exhaustion system:
    let seenPassages: string[] = [];
    try { seenPassages = JSON.parse(localStorage.getItem('seen_english_passages') || '[]'); } catch(e) {}
    
    // Forcefully randomize everything to prevent deterministic cycles
    const shuffled = [...sourceData].sort(() => Math.random() - 0.5);
    
    // Bubble up entirely unseen passages to the exact top!
    shuffled.sort((a, b) => {
        const aSeen = seenPassages.includes(a.sectionId) ? 1 : 0;
        const bSeen = seenPassages.includes(b.sectionId) ? 1 : 0;
        return aSeen - bSeen;
    });

    // Group passages aggressively by core engine
    const groups: Record<string, EnglishSection[]> = { comprehension: [], spag: [], vocab: [] };
    shuffled.forEach(sec => {
        const id = (sec.sectionId || "").toLowerCase();
        const sub = (sec.subEngine || "").toLowerCase();
        if (id === 'vocabulary' || sub === 'vocabulary' || id === 'vocab') groups.vocab.push(sec);
        else if (['spelling', 'punctuation', 'grammar'].includes(sub) || ['spelling', 'punctuation', 'grammar'].includes(id) || id === 'spag') groups.spag.push(sec);
        else groups.comprehension.push(sec);
    });

    let finalSections: EnglishSection[] = [];

    // Filter down to the user's requested topics. 
    // They want exactly 1 passage per requested block.
    if (selectedTopics.includes('comprehension') && groups.comprehension.length > 0) finalSections.push(groups.comprehension[0]);
    if (selectedTopics.includes('spag') && groups.spag.length > 0) finalSections.push(groups.spag[0]);
    if (selectedTopics.includes('vocabulary') && groups.vocab.length > 0) finalSections.push(groups.vocab[0]);
    
    // Safety fallback
    if (finalSections.length === 0) finalSections = sourceData.slice(0, 1);

    const sorted = finalSections.map(sec => ({
      ...sec,
      questions: [...(sec.questions || [])].sort((a, b) => {
        const aGlobal = a.evidenceLine === 'global' || a.evidenceLine === 'Overall' || a.evidenceLine?.toLowerCase().includes('overall');
        const bGlobal = b.evidenceLine === 'global' || b.evidenceLine === 'Overall' || b.evidenceLine?.toLowerCase().includes('overall');
        if (aGlobal && !bGlobal) return 1;
        if (!aGlobal && bGlobal) return -1;
        const aNum = parseInt(a.evidenceLine.match(/\d+/)?.[0] || '0', 10);
        const bNum = parseInt(b.evidenceLine.match(/\d+/)?.[0] || '0', 10);
        return aNum - bNum;
      })
    }));

    return sorted;
  }, [examMode, selectedTopics, isPremium, dbSections]);

  // Securely update the historic ledger of what texts have been seen
  useEffect(() => {
    if (activeSections.length > 0) {
      try {
        let seen = JSON.parse(localStorage.getItem('seen_english_passages') || '[]');
        const newIds = activeSections.map(s => s.sectionId);
        seen = [...new Set([...seen, ...newIds])];
        
        // If they have naturally exhausted almost the entire bank, reset the loop back to zero (minus current load)
        if (dbSections.length > 10 && seen.length >= dbSections.length - 2) {
            seen = newIds; 
        }
        
        localStorage.setItem('seen_english_passages', JSON.stringify(seen));
      } catch(e) {}
    }
  }, [activeSections, dbSections.length]);

  const timerInitialized = useRef<string>("");

  // Dynamically calibrate Mock Timer based on Passage Loads, Pedagogy, and 11+ Recommended Norms
  useEffect(() => {
    if (examMode !== 'mock' || activeSections.length === 0) return;
    
    // Create a unique fingerprint of the active passages to detect if we generated a NEW mock exam
    const bundleSignature = activeSections.map(s => s.title).join('|');
    if (timerInitialized.current === bundleSignature) return; // Do not hard-reset if it's the same bundle
    
    let totalSeconds = 0;
    activeSections.forEach(sec => {
      const isComp = sec.sectionId.toLowerCase() === 'comprehension' || (sec.subEngine || '').toLowerCase() === 'comprehension';
      
      let secTime = 0;
      if (sec.difficulty === 1) {
        // Level 1: Standard (Fast)
        const reading = isComp ? 150 : 0; // 2.5 mins
        const perQ = isComp ? 45 : 30;
        secTime = reading + (sec.questions.length * perQ);
      } else if (sec.difficulty === 2) {
        // Level 2: Intermediate
        const reading = isComp ? 180 : 0; // 3.0 mins
        const perQ = isComp ? 55 : 40;
        secTime = reading + (sec.questions.length * perQ);
      } else {
        // Level 3: Elite / Advanced (Heavy)
        const reading = isComp ? 240 : 0; // 4.0 mins
        const perQ = isComp ? 75 : 55;
        secTime = reading + (sec.questions.length * perQ);
      }
      
      totalSeconds += secTime;
    });
    
    if (totalSeconds > 0) {
      setTimeLeft(totalSeconds);
      timerInitialized.current = bundleSignature;
    }
  }, [activeSections, examMode]);

  // Timer logic for Mock Mode
  useEffect(() => {
    if (examMode === 'mock' && !isFinished && !isReviewMode && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [examMode, isFinished, isReviewMode, timeLeft]);

  // Handle Highlighting
  const handleHighlight = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    if (text.length > 2) { 
      setHighlights(prev => [...prev, text]);
      selection.removeAllRanges();
    }
  };

  const renderHighlightedText = (text: string) => {
    if (highlights.length === 0) return text;
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(${highlights.map(escapeRegExp).join('|')})`, 'gi');
    return text.split(pattern).map((part, i) => {
      if (highlights.some(h => h.toLowerCase() === part.toLowerCase())) {
        return <mark key={i} className="bg-teal-200 dark:bg-teal-500/40 text-teal-950 dark:text-teal-50 rounded-sm px-0.5">{part}</mark>;
      }
      return part;
    });
  };

  const handleSelectAnswer = (qId: string, optId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [qId]: optId }));
    if (examMode === 'practice') {
      setShowTrap(qId);
    }
  };

  const toggleFlag = (qId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFlaggedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  // MACRO SCROLL INTELLIGENCE: 
  // Track which question is dominant in the right pane
  useEffect(() => {
    if (isFinished) return;
    const observer = new IntersectionObserver((entries) => {
      // Find the question that is currently crossing or occupying the vertical midpoint
      const visibleEntries = entries.filter(e => e.isIntersecting);
      if (visibleEntries.length > 0) {
        // Sort by how close they are to the top of the right pane to find the logically "current" one
        const sorted = visibleEntries.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const topQ = sorted[0].target.getAttribute('data-qid');
        if (topQ) setActiveQuestionId(topQ);
      }
    }, {
      root: rightPaneRef.current,
      rootMargin: "-50% 0px -50% 0px", // Precisely detect when the top of the box touches the vertical midpoint
      threshold: 0
    });

    Object.values(questionRefs.current).forEach(node => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [activeSections, isFinished, examMode]);

  // SYNCHRONIZED LEFT PASSAGE SCROLLING
  // When active question changes, firmly snap the left pane to the correct Passage Section!
  useEffect(() => {
    if (!activeQuestionId) return;
    
    // Respect user autonomy: removed to fix delay bug

    let targetSectionId = null;
    let targetEvidenceLine = null;
    
    // Find who owns this question
    for (const sec of activeSections) {
      const q = sec.questions.find(x => `${sec.sectionId}_${x.id}` === activeQuestionId);
      if (q) {
        targetSectionId = sec.sectionId;
        targetEvidenceLine = q.evidenceLine;
        break;
      }
    }

    const isGlobal = targetEvidenceLine === 'global' || targetEvidenceLine?.toLowerCase().includes('overall');
    if (isGlobal) {
      if (targetSectionId && passageSectionRefs.current[targetSectionId]) {
        passageSectionRefs.current[targetSectionId]?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
      return; 
    }

    if (targetSectionId && targetEvidenceLine) {
      const uniqueRefKey = `${targetSectionId}_${targetEvidenceLine}`;
      lastEvidenceRefKey.current = uniqueRefKey;

      const targetElement = passageLineRefs.current[uniqueRefKey];
      
      if (targetElement) {
        // Re-enabled scrollIntoView natively. We use CSS scroll-margin-top on the block
        // so it won't hide the section title or get stuck under the sticky header.
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    
    // Fallback scroll if exact paragraph missing
    if (targetSectionId && passageSectionRefs.current[targetSectionId]) {
      passageSectionRefs.current[targetSectionId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeQuestionId, activeSections]);

  // Keep active dot visible in the floating pill
  useEffect(() => {
    if (!activeQuestionId) return;
    const dotElement = document.getElementById(`pill-dot-${activeQuestionId}`);
    if (dotElement) {
      dotElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeQuestionId]);

  // Compute actual results upon finishing
  const results = useMemo(() => {
    if (!isFinished) return null;
    
    let compTotal = 0;
    let compCorrect = 0;
    let spagTotal = 0;
    let spagCorrect = 0;

    activeSections.forEach(sec => {
      const isComp = sec.sectionId === 'comprehension' || sec.sectionId === 'vocab';
      const visibleQuestions = !isPremium ? sec.questions.slice(0, 3) : sec.questions;
      
      visibleQuestions.forEach(q => {
        if (isComp) compTotal++;
        else spagTotal++;
        
        const ans = selectedAnswers[`${sec.sectionId}_${q.id}`];
        const correctOpt = q.options.find(o => o.correct);
        if (ans && correctOpt && ans === correctOpt.id) {
          if (isComp) compCorrect++;
          else spagCorrect++;
        }
      });
    });

    const compPerc = compTotal > 0 ? Math.round((compCorrect / compTotal) * 100) : 0;
    const spagPerc = spagTotal > 0 ? Math.round((spagCorrect / spagTotal) * 100) : 0;
    
    const overallTotal = compTotal + spagTotal;
    const overallCorrect = compCorrect + spagCorrect;
    const overallPerc = overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : 0;
    
    // Standardised Age Score (SAS) logic based on rough 11+ equivalency (70 - 141 scale)
    const sas = overallTotal === 0 ? 0 : Math.min(141, Math.max(70, Math.round(overallPerc * 0.71) + 70));
    
    let sasColor = "text-emerald-500";
    if (sas < 105) sasColor = "text-rose-500";
    else if (sas < 120) sasColor = "text-amber-500";
    
    return { compTotal, compPerc, spagTotal, spagPerc, overallTotal, overallCorrect, overallPerc, displaySAS: sas, sasColor };
  }, [isFinished, activeSections, selectedAnswers]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-background p-6" style={{ '--primary': '43 96% 56%', '--primary-glow': '43 96% 66%' } as React.CSSProperties}>
        <div className="max-w-2xl w-full bg-card border border-border/80 shadow-xl rounded-[2rem] p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-amber-600" />
          
          <Trophy className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold tracking-tight mb-2">Session Complete</h2>
          
          {isPremium && results ? (
            <div className="space-y-6 mt-8">
              <div className="p-8 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-left">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-2xl flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-amber-500" /> Elite Analytics Dashboard
                  </h3>
                  <div className="px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-sm tracking-wide border border-amber-500/20">
                    Target: QE Boys
                  </div>
                </div>
                
                <p className="text-foreground leading-relaxed mb-6 bg-background rounded-2xl p-5 border border-border/40 font-medium">
                  {results.overallTotal > 0 ? (
                    <>Excellent work! Based on standard 11+ normalisation limits, you achieved a highly competitive <strong>Standardised Exam Score</strong> of <strong className={cn("text-xl font-black", results.sasColor)}>{results.overallPerc}%</strong> across this rigorous configuration.</>
                  ) : (
                    <>You did not answer any questions in this session.</>
                  )}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {results.compTotal > 0 && (
                    <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Comprehension</div>
                      <div className={cn("text-4xl font-black", results.compPerc >= 80 ? 'text-amber-500' : results.compPerc >= 60 ? 'text-amber-400' : 'text-rose-400')}>{results.compPerc}%</div>
                    </div>
                  )}
                  {results.spagTotal > 0 && (
                    <div className={cn("bg-card border border-border/60 p-5 rounded-2xl shadow-sm", results.compTotal === 0 ? "col-span-2" : "")}>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">SPaG Precision</div>
                      <div className={cn("text-4xl font-black", results.spagPerc >= 80 ? 'text-emerald-500' : results.spagPerc >= 60 ? 'text-amber-400' : 'text-rose-400')}>{results.spagPerc}%</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <Button onClick={() => { setIsFinished(false); setIsReviewMode(true); }} variant="outline" className="w-full h-12 rounded-xl font-bold">
                  Review Paper Details & Tutor Notes
                </Button>
                <Link to={examMode === 'mock' ? "/mocks/english" : "/practice/english"}>
                  <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:bg-muted font-semibold">
                    Return to {examMode === 'mock' ? 'Mock' : 'Practice'} Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-8 w-full max-w-lg mx-auto">
              <div className="p-8 rounded-[2rem] bg-gradient-to-b from-card to-muted/20 border border-border/80 shadow-xl shadow-black/5 text-center relative overflow-hidden group">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <h3 className="text-2xl font-black tracking-tight mb-1 text-foreground">You scored <span className="text-amber-600 dark:text-amber-500">{results?.overallPerc || 0}%</span></h3>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">({results?.overallCorrect || 0} out of {results?.overallTotal || 0} correct)</p>
                
                <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 mb-8 text-sm text-amber-900 dark:text-amber-100/90 leading-relaxed relative isolate">
                  <div className="absolute -inset-px ring-1 ring-amber-500/10 rounded-2xl -z-10" />
                  You are missing <strong className="font-bold text-amber-600 dark:text-amber-400">over 1300+ English questions</strong> encompassing isolated SPaG passages, Cloze structures, and rigorous full-length exams.
                </div>
                
                <Button onClick={() => setShowPaywall(true)} className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-amber-950 font-bold shadow-xl shadow-amber-500/25 py-6 rounded-xl text-lg transition-all duration-300 hover:scale-[1.02] border border-amber-400/50">
                  <Lock className="w-5 h-5 mr-3" />
                  Unlock Full Access
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button onClick={() => { setIsFinished(false); setIsReviewMode(true); }} variant="outline" className="w-full h-14 rounded-[1rem] font-bold text-foreground bg-card border-border/80 shadow-sm hover:bg-accent transition-all">
                  Review Answers
                </Button>
                <Link to="/mocks/english" className="block w-full">
                  <Button variant="ghost" className="w-full h-14 rounded-[1rem] text-muted-foreground hover:text-foreground font-semibold hover:bg-muted/80 transition-all group/back">
                    <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover/back:-translate-x-1" />
                    Return to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-background font-sans" style={{ '--primary': '43 96% 56%', '--primary-glow': '43 96% 66%' } as React.CSSProperties}>
      
      {/* Production UI start (Demo controls removed) */}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative">
        
        {/* ---------------- LEFT PANE: DYNAMIC PASSAGES ---------------- */}
        <div className="w-full lg:w-[45%] lg:border-r border-b lg:border-b-0 border-border/80 flex flex-col bg-card/50 relative overflow-hidden transition-all duration-300 h-[45vh] lg:h-auto shrink-0 z-10">
          
          <div className="px-5 lg:px-6 py-3 lg:py-4 border-b border-border flex items-center justify-between bg-card shrink-0 z-10 sticky top-0 shadow-sm">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(examMode === 'mock' ? '/mocks/english' : '/practice/english')}
                className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground group"
                title="Back to Selection"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              </button>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="font-serif font-bold tracking-tight text-foreground line-clamp-1">
                  {examMode === 'mock' ? 'Full Mock Examination Paper' : `Practice Source: ${activeSections[0]?.leftTitle}`}
                </span>
              </div>
            </div>
            
            {/* Highlight Toggle Button */}
            <Button
              variant={isHighlightMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsHighlightMode(!isHighlightMode)}
              className={cn(
                "h-8 text-xs font-semibold rounded-full transition-all duration-300",
                isHighlightMode ? "bg-amber-500 hover:bg-amber-600 text-amber-950 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "border-border/60 hover:bg-muted"
              )}
            >
              <Highlighter className={cn("w-3.5 h-3.5 mr-1.5", isHighlightMode ? "text-amber-950" : "text-amber-500")} />
              {isHighlightMode ? "Highlighter On" : "Highlight Off"}
            </Button>
          </div>

          <div 
            ref={passageContainerRef} 
            onMouseUp={isHighlightMode ? handleHighlight : undefined}
            onTouchEnd={isHighlightMode ? handleHighlight : undefined}
            className="flex-1 overflow-y-auto p-5 sm:p-8 md:px-10 md:py-12 text-sm sm:text-base md:text-[17px] leading-loose text-foreground/90 font-serif relative pb-48"
          >
            <div className="absolute top-6 left-6 sm:left-8 text-[11px] font-black tracking-[0.2em] uppercase text-muted-foreground/30 select-none">Passage</div>

            <div className="space-y-16 relative mt-8">
              {(() => {
                const seenTitles = new Set<string>();
                return activeSections.map((section, secIdx) => {
                  const isDuplicatePassage = seenTitles.has(section.leftTitle);
                  seenTitles.add(section.leftTitle);
                  if (isDuplicatePassage) return null;

                  const sType = (section.sectionId + " " + (section.subEngine || "")).toLowerCase();
                let topicLabel = 'Comprehension';
                if (sType.includes('vocab')) topicLabel = 'Vocabulary';
                else if (sType.includes('spag') || sType.includes('spell') || sType.includes('punct') || sType.includes('gramm')) topicLabel = 'SPaG';
                
                const typeNoun = topicLabel === 'Comprehension' ? 'Passage' : 'Questions';
                const displayTitle = topicLabel === 'Comprehension' ? section.leftTitle : `${topicLabel} ${typeNoun}`;
                const cleanDisplayTitle = topicLabel === 'Comprehension' ? `${topicLabel} ${typeNoun} - ${displayTitle}` : displayTitle;

                const PAYWALL_THRESHOLD = 3;
                let lastAllowedEvidenceIndex = -1;
                let isEntireSectionPaywalled = false;
                
                if (!isPremium) {
                  const allowedEvidenceLines = section.questions
                    .slice(0, PAYWALL_THRESHOLD)
                    .map(q => q.evidenceLine);
                  
                  // If there are free questions, explicitly ensure at least the very first block is readable
                  if (allowedEvidenceLines.length > 0) {
                    lastAllowedEvidenceIndex = 0;
                  }

                  section.passageBlocks.forEach((pb, idx) => {
                    if (allowedEvidenceLines.includes(pb.id)) {
                      lastAllowedEvidenceIndex = Math.max(lastAllowedEvidenceIndex, idx);
                    }
                  });
                }

                return (
                 <div 
                  key={section.sectionId} 
                  ref={(el) => { passageSectionRefs.current[section.sectionId] = el; }}
                  className="scroll-m-8 border-b border-border/40 pb-12 last:border-0"
                 >
                  <div className="mb-6 font-sans font-bold text-lg text-foreground/80 tracking-tight flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-sm border border-amber-500/20 shrink-0">
                        {secIdx + 1}
                      </div>
                      {cleanDisplayTitle}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(() => {
                      const getIsPaywalledBlock = (i: number) => {
                        if (isPremium) return false;
                        if (isEntireSectionPaywalled) return true;
                        return lastAllowedEvidenceIndex !== -1 && i > lastAllowedEvidenceIndex;
                      };
                      
                      const renderPassageBlock = (p: EnglishPassageBlock, originalIndex: number, isPaywalledBlock: boolean) => {
                        let isTargetEvidence = false;
                        const activeQIndex = section.questions.findIndex(q => `${section.sectionId}_${q.id}` === activeQuestionId);
                        const activeQInfo = activeQIndex !== -1 ? section.questions[activeQIndex] : undefined;
                        
                        if (activeQInfo) {
                          const isQuestionPaywalled = !isPremium && activeQIndex >= PAYWALL_THRESHOLD;
                          if (!isQuestionPaywalled) {
                            const isGlobal = activeQInfo.evidenceLine === 'global' || activeQInfo.evidenceLine === 'Overall' || activeQInfo.evidenceLine?.toLowerCase().includes('overall');
                            if (activeQInfo.evidenceLine === p.id || isGlobal) {
                              isTargetEvidence = true;
                            }
                          }
                        }

                        const showScaffold = isTargetEvidence && !isPaywalledBlock;
                        const uniqueRefKey = `${section.sectionId}_${p.id}`;

                        return (
                          <div key={p.id} className="relative group scroll-m-[160px]" ref={(el) => { passageLineRefs.current[uniqueRefKey] = el; }}>
                            {p.text.match(/^\d+/) && (
                              <div className="absolute -left-10 top-1.5 text-xs text-amber-500/80 font-black select-none pointer-events-none w-8 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                ♦
                              </div>
                            )}
                            <p 
                              className={cn(
                                "transition-all duration-200 ease-out p-4 -mx-4 rounded-xl relative border-l-[3px]",
                                showScaffold 
                                  ? "bg-amber-50/90 dark:bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/30 text-foreground z-10 scale-[1.02]" 
                                  : "border-transparent opacity-75 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5",
                                isPaywalledBlock && "blur-[3px] opacity-40 select-none pointer-events-none scale-[0.98]"
                              )}
                            >
                              {showScaffold && (
                                <div className="absolute -left-1.5 flex items-center justify-center h-full top-0">
                                  <div className="h-2/3 w-[5px] bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                </div>
                              )}
                              {renderHighlightedText(p.text)}
                            </p>
                          </div>
                        );
                      };

                      const freeBlocks = section.passageBlocks.filter((_, i) => !getIsPaywalledBlock(i));
                      const paywalledBlocks = section.passageBlocks.filter((_, i) => getIsPaywalledBlock(i));

                      return (
                        <>
                          {freeBlocks.map(p => renderPassageBlock(p, section.passageBlocks.indexOf(p), false))}
                          
                          {paywalledBlocks.length > 0 && (
                            <div className="relative space-y-6 mt-6">
                              <div className="absolute inset-x-0 inset-y-0 z-30 pointer-events-none" style={{ paddingTop: '2rem' }}>
                                <div className="sticky top-[30%] pointer-events-auto mx-auto w-[calc(100%-2rem)] max-w-[320px] bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-3xl p-6 md:p-8 ring-1 ring-amber-500/20 text-center transition-all hover:scale-[1.02]">
                                  <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 border border-amber-500/20 shadow-inner">
                                    <Lock className="w-5 h-5 md:w-6 md:h-6" />
                                  </div>
                                  <h3 className="text-base md:text-lg font-bold tracking-tight mb-2 text-foreground">Free plan limit reached</h3>
                                  <p className="text-xs font-medium text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                                    To see the full passage and to access all questions, upgrade to Premium.
                                  </p>
                                  <Button onClick={() => setShowPaywall(true)} className="w-full h-12 md:h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition-all">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Unlock Full Version
                                  </Button>
                                </div>
                              </div>
                              {paywalledBlocks.map(p => renderPassageBlock(p, section.passageBlocks.indexOf(p), true))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            });
          })()}
            </div>
            
          </div>
        </div>

        {/* Mobile Split Divider */}
        <div className="h-4 lg:hidden w-full bg-muted/40 shrink-0 border-y border-border shadow-inner relative flex justify-center items-center z-20">
          <div className="w-12 h-1 bg-border rounded-full" />
        </div>

        {/* ---------------- RIGHT PANE: QUESTIONS ---------------- */}
        <div className="flex-1 overflow-y-auto bg-background lg:bg-background/50 flex flex-col relative snap-y snap-proximity shadow-[0_-10px_30px_rgba(0,0,0,0.05)] lg:shadow-none" ref={rightPaneRef}>
          
          {examMode === 'mock' && (
            <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border/60 px-6 py-3 flex items-center justify-between shadow-sm">
              {!isReviewMode ? (
                <>
                  <div className="flex items-center gap-2 text-rose-600 font-bold font-mono">
                    <Timer className="w-4 h-4" />
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4" /> Exam Conditions Active
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-emerald-600 font-bold font-mono">
                    <CheckCircle className="w-4 h-4" />
                    Review Mode
                  </div>
                  <div className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider flex items-center gap-2">
                    Evaluation Complete
                  </div>
                </>
              )}
            </div>
          )}

          <div className="max-w-xl mx-auto w-full p-4 sm:p-6 md:p-8 pb-48">
            <div className="mb-8 md:mb-10 flex items-start justify-between gap-4 snap-start scroll-m-24">
              <div>
                <h1 className="text-2xl font-bold tracking-tight mb-2">
                  {examMode === 'mock' ? 'Mock Exam' : (activeSections.length > 1 ? 'MIXED TOPIC DRILLS' : `${practiceFocus.toUpperCase()} DRILLS`)}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {examMode === 'mock' ? 'You have configured a custom Mock Exam mixing multiple passages.' : 'Answer the questions based on the source texts strictly.'}
                </p>
              </div>
            </div>

            {/* Render all the loaded sections linearly */}
            {activeSections.length === 0 && (
              <div className="text-center p-12 border border-border border-dashed rounded-3xl text-muted-foreground font-medium">
                No sections selected or configured.
              </div>
            )}            {activeSections.map((section, secIndex) => {
              const PAYWALL_THRESHOLD = 3;
                const sType = (section.sectionId + " " + (section.subEngine || "")).toLowerCase();
                let parentTopic = 'Comprehension';
                let subTopic = '';

                if (sType.includes('vocab')) {
                   parentTopic = 'Vocabulary';
                } else if (sType.includes('spag') || sType.includes('spell') || sType.includes('punct') || sType.includes('gramm')) {
                   parentTopic = 'SPaG';
                   if (sType.includes('spell')) subTopic = 'Spelling';
                   else if (sType.includes('punct')) subTopic = 'Punctuation';
                   else if (sType.includes('gramm')) subTopic = 'Grammar';
                } else {
                   if (sType.includes('non-fiction') || sType.includes('nonfiction')) subTopic = 'Non-Fiction';
                   else if (sType.includes('fiction')) subTopic = 'Fiction';
                   else if (sType.includes('poetry') || sType.includes('poem')) subTopic = 'Poetry';
                }
                
                const typeNoun = parentTopic === 'Comprehension' ? 'Passage' : 'Questions';
                const badgeLabel = subTopic ? `${parentTopic} ${typeNoun} (${subTopic})` : `${parentTopic} ${typeNoun}`;
                const displayTitle = parentTopic === 'Comprehension' 
                  ? section.leftTitle 
                  : (subTopic ? `${subTopic} ${typeNoun}` : `${parentTopic} ${typeNoun}`);

                return (
                  <div key={section.sectionId} className={cn("mb-16", secIndex === 0 && examMode === 'practice' ? "mt-4" : "")}>
                    <div className={cn("relative flex flex-col md:flex-row justify-between items-start md:items-end gap-6 w-full border-b border-border/60 pb-5 mb-10", secIndex === 0 ? "mt-4" : "mt-14")}>
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-[0.15em] uppercase bg-foreground/10 text-foreground/60">{badgeLabel}</span>
                        <span className="text-xl font-bold tracking-tight text-foreground/90">{displayTitle}</span>
                      </div>

                      {section.tier && (
                        <span className="mb-1 relative bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 cursor-default shrink-0 transition-transform hover:scale-105">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span className="text-[10px] font-black tracking-widest text-amber-600 uppercase pt-0.5">
                            {section.difficulty ? `LEVEL ${section.difficulty}` : (section.tier.match(/(Level\s*\d+)/i)?.[1] || section.tier.split(/[\(\:\-]/)[0].trim())}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-12">
                      {(() => {
                        const PAYWALL_THRESHOLD = 3;
                        const getIsPaywalledQuestion = (qIndex: number) => {
                          if (isPremium) return false;
                          if (examMode === 'mock') return false; // Mock limits are enforced upfront via usePremium
                          return qIndex >= PAYWALL_THRESHOLD;
                        };

                        const renderQuestion = (q: EnglishQuestion, originalIndex: number, isPaywalledQuestion: boolean) => {
                          const qKey = `${section.sectionId}_${q.id}`;
                          const isSelected = activeQuestionId === qKey;
                          const isFlagged = flaggedQuestions[qKey];
                          
                          return (
                            <div 
                              key={qKey}
                              data-qid={qKey}
                              ref={(el) => { questionRefs.current[qKey] = el; }}
                              onClick={() => { if (isPaywalledQuestion) setShowPaywall(true); }}
                              className={cn(
                                "p-4 sm:p-6 rounded-2xl border transition-all duration-150 ease-out cursor-default scroll-m-24 relative snap-center",
                                isSelected 
                                  ? (examMode === 'mock' ? "border-amber-500/30 dark:border-amber-500/40 bg-card shadow-lg ring-1 ring-amber-500/10 scale-[1.02]" : "border-amber-500/50 bg-card shadow-xl ring-4 ring-amber-500/10 scale-[1.02]")
                                  : "border-border/60 dark:border-amber-500/20 bg-card/40 hover:bg-card/80 hover:border-amber-500/30 opacity-60 hover:opacity-100",
                                isPaywalledQuestion && "blur-[2px] opacity-40 select-none pointer-events-none scale-[0.98]"
                              )}
                            >
                            {examMode === 'mock' && (
                              <button 
                                onClick={(e) => toggleFlag(qKey, e)}
                                className={cn("absolute -top-3 -right-3 p-2 rounded-full border shadow-sm bg-card transition-colors z-10 hover:bg-muted", isFlagged ? "text-rose-500 border-rose-500/50" : "text-muted-foreground border-border")}
                              >
                                <Flag className={cn("w-4 h-4", isFlagged && "fill-rose-500 text-rose-500")} />
                              </button>
                            )}

                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xs font-black tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                                {examMode === 'mock' ? `Q${originalIndex + 1}` : `Question ${originalIndex + 1}`}
                              </span>
                              <div className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border", 
                                q.tagColor || "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                              )}>
                                {q.tag}
                              </div>
                            </div>
                            
                            <h3 className="text-sm sm:text-[15px] font-semibold leading-relaxed mb-4 sm:mb-6">
                              {q.text}
                            </h3>

                            <div className="space-y-3">
                              {q.options.map((opt) => {
                                const selected = selectedAnswers[qKey] === opt.id;
                                const isViewedInReview = isReviewMode && reviewViewedOptions[qKey] === opt.id;
                                
                                const showDistractor = (examMode === 'practice' && showTrap === qKey && selected && !opt.correct) || 
                                                       (isReviewMode && selected && !opt.correct) ||
                                                       (isViewedInReview && !opt.correct);
                                                       
                                const evaluateCorrectness = (examMode === 'practice' && selected) || (isReviewMode && opt.correct) || (isReviewMode && selected);

                                return (
                                  <div key={opt.id}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isReviewMode) {
                                          setReviewViewedOptions(prev => ({ ...prev, [qKey]: opt.id }));
                                          return;
                                        }
                                        handleSelectAnswer(qKey, opt.id);
                                      }}
                                      className={cn(
                                        "w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 flex items-center gap-3 sm:gap-4 group",
                                        selected 
                                          ? ((examMode === 'mock' && !isReviewMode)
                                              ? "border-amber-500 bg-amber-500/5 text-amber-900 dark:text-amber-100 ring-2 ring-amber-500/20" 
                                              : (opt.correct 
                                                ? "border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20" 
                                                : "border-rose-500 bg-rose-500/5 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20"))
                                          : (isReviewMode && opt.correct
                                              ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20"
                                              : "border-border/60 bg-background hover:border-foreground/30 hover:bg-muted/50")
                                      )}
                                    >
                                      <span className={cn(
                                        "w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold transition-colors shadow-sm",
                                        selected
                                          ? ((examMode === 'mock' && !isReviewMode) ? "bg-amber-500 text-white shadow-md shadow-amber-500/30" : (opt.correct ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-rose-500 text-white shadow-md shadow-rose-500/20"))
                                          : (isReviewMode && opt.correct
                                              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                              : "bg-card border border-border/80 text-muted-foreground group-hover:text-foreground")
                                      )}>
                                        {opt.id}
                                      </span>
                                      <span className="flex-1 text-sm sm:text-[15px] font-medium leading-normal">
                                        {opt.text}
                                      </span>
                                      {selected && examMode === 'mock' && <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-500 font-bold" />}
                                    </button>

                                    {showDistractor && opt.correct === false && (
                                      <div className="mt-3 ml-12 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-in slide-in-from-top-2 fade-in">
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5 p-1 rounded-full bg-rose-500/20 text-rose-600">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1 flex items-center gap-2">
                                              Evidence Check
                                              <ChevronRight className="w-3 h-3 text-rose-500/50" />
                                              Tutor Note
                                            </div>
                                            <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                                              {opt.trap || q.explanation || "Review the passage carefully to see why this option is unsupported."}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {evaluateCorrectness && opt.correct === true && (
                                      <div className="mt-3 ml-12 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-in slide-in-from-top-2 fade-in flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-emerald-600" />
                                        <div className="flex-1">
                                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                            {selected 
                                              ? (q.explanation || opt.trap || "Excellent! You isolated the correct rule.") 
                                              : (q.explanation || "This is the correct answer.")
                                            }
                                          </p>
                                          {isReviewMode && !selected && opt.trap && (
                                             <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                                               Note: {opt.trap}
                                             </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          );
                        };

                        const freeQuestions = section.questions.filter((_, i) => !getIsPaywalledQuestion(i));
                        const paywalledQuestions = section.questions.filter((_, i) => getIsPaywalledQuestion(i));

                        return (
                          <>
                            {freeQuestions.map(q => renderQuestion(q, section.questions.indexOf(q), false))}
                            
                            {paywalledQuestions.length > 0 && (
                              <div className="relative space-y-12 mt-12">
                              <div className="absolute inset-x-0 inset-y-0 z-30 pointer-events-none" style={{ paddingTop: '2rem' }}>
                                <div className="sticky top-[30%] pointer-events-auto mx-auto w-[calc(100%-2rem)] max-w-[320px] bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-3xl p-6 md:p-8 ring-1 ring-amber-500/20 text-center transition-all hover:scale-[1.02]">
                                  <div className="w-12 h-12 md:w-14 md:h-14 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 md:mb-6 border border-amber-500/20 shadow-inner">
                                    <Lock className="w-5 h-5 md:w-6 md:h-6" />
                                  </div>
                                  <h3 className="text-base md:text-lg font-bold tracking-tight mb-2 text-foreground">Free plan limit reached</h3>
                                  <p className="text-xs font-medium text-muted-foreground mb-6 md:mb-8 leading-relaxed">
                                    To see the full passage and to access all questions, upgrade to Premium.
                                  </p>
                                  <Button onClick={() => setShowPaywall(true)} className="w-full h-12 md:h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 transition-all">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Unlock Full Version
                                  </Button>
                                </div>
                              </div>
                                {paywalledQuestions.map(q => renderQuestion(q, section.questions.indexOf(q), true))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}

            {activeSections.length > 0 && (
              <div className="pt-10 border-t border-border/40 mt-12 mb-12 flex justify-end snap-end scroll-m-8">
                <Button 
                  onClick={() => {
                    if (isReviewMode) setIsFinished(true); // Return to Results
                    else if (examMode === 'practice') navigate('/mocks/english'); 
                    else setIsFinished(true);
                  }} 
                  className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold px-8 h-12 rounded-xl text-md shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  {isReviewMode ? 'Return to Results' : (examMode === 'practice' ? 'Finish' : 'Submit Mock Exam')}
                </Button>
              </div>
            )}
          </div>
        </div>
        {/* Paywall Modal */}
        <PremiumPaywall 
          open={showPaywall} 
          onOpenChange={setShowPaywall}
          title="Unlock Full Exam"
          description="Gain access to all questions, full rationales, and advanced scoring." 
        />
      </div>
    </div>
  );
}

export default EnglishSplitViewDemo;
