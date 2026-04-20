const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env', 'utf8');
const getVal = (key) => {
  const match = envText.match(new RegExp(key + '="?([^"\n]+)"?'));
  return match ? match[1] : null;
};

const url = getVal('VITE_SUPABASE_URL');
const serviceKey = getVal('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(url, serviceKey);

const PROPER_SPAG = [
  {
    id: 'spelling-proper-1',
    track: '11plus',
    sectionId: 'spag',
    subtopic: 'spelling',
    title: 'SECTION B: SPELLING EXERCISES',
    desc: 'In these sentences there are some spelling mistakes. Find the group of words with the mistake. If there is no mistake, mark N.',
    tier: '11+ Standard',
    difficulty: 2,
    passageBlocks: [
      { id: 's1', text: "20. The immediate / atmosphere around / the laboratory was / completly chaotic." },
      { id: 's2', text: "21. The desperate / climber clung / to the jagged edge / with exaustion." },
      { id: 's3', text: "22. The independant / journalist refused / to compromise / her sources." },
      { id: 's4', text: "23. Despite the / terrible weather, / the exhibition / was successful." },
      { id: 's5', text: "24. The proffesor / confidently delivered / a fascinating / presentation." }
    ],
    questions: [
      {
        id: "s_q1", tag: "Error-Hunt",
        text: "Line 20: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s1",
        options: [
          { id: "A", text: "The immediate", correct: false },
          { id: "B", text: "atmosphere around", correct: false },
          { id: "C", text: "the laboratory was", correct: false },
          { id: "D", text: "completly chaotic.", correct: true },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Missing 'e' in completely."
      },
      {
        id: "s_q2", tag: "Error-Hunt",
        text: "Line 21: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s2",
        options: [
          { id: "A", text: "The desperate", correct: false },
          { id: "B", text: "climber clung", correct: false },
          { id: "C", text: "to the jagged edge", correct: false },
          { id: "D", text: "with exaustion.", correct: true },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Missing 'h' in exhaustion."
      },
      {
        id: "s_q3", tag: "Error-Hunt",
        text: "Line 22: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s3",
        options: [
          { id: "A", text: "The independant", correct: true },
          { id: "B", text: "journalist refused", correct: false },
          { id: "C", text: "to compromise", correct: false },
          { id: "D", text: "her sources.", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Ends in 'ent', not 'ant'."
      },
      {
        id: "s_q4", tag: "Error-Hunt",
        text: "Line 23: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s4",
        options: [
          { id: "A", text: "Despite the", correct: false },
          { id: "B", text: "terrible weather,", correct: false },
          { id: "C", text: "the exhibition", correct: false },
          { id: "D", text: "was successful.", correct: false },
          { id: "N", text: "No Mistake", correct: true }
        ],
        explanation: "Accurate! There is no spelling mistake here."
      },
      {
        id: "s_q5", tag: "Error-Hunt",
        text: "Line 24: Identify the segment with the spelling error, or select 'N'.", evidenceLine: "s5",
        options: [
          { id: "A", text: "The proffesor", correct: true },
          { id: "B", text: "confidently delivered", correct: false },
          { id: "C", text: "a fascinating", correct: false },
          { id: "D", text: "presentation.", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Should be 'professor' (one f, two s's)."
      }
    ]
  },
  {
    id: 'punctuation-proper-1',
    track: '11plus',
    sectionId: 'spag',
    subtopic: 'punctuation',
    title: 'SECTION C: PUNCTUATION EXERCISES',
    desc: 'In this passage there are some punctuation mistakes. Find the group of words with the mistake in it. If there is no mistake, mark N.',
    tier: '11+ Standard',
    difficulty: 2,
    passageBlocks: [
      { id: 'h1', text: "25. James packed / his bag with / an apple a sandwich / and some crisps." },
      { id: 'h2', text: "26. \"Stop right there!\" / shouted the officer, / \"You're entering / a restricted zone.\"" },
      { id: 'h3', text: "27. The dogs / bone was buried / deep in the / back garden." },
      { id: 'h4', text: "28. Its completely / understandable / why they chose / to leave early." },
      { id: 'h5', text: "29. Although it / was raining heavily / we decided to continue / the hike." }
    ],
    questions: [
      {
        id: "h_q1", tag: "Punctuation Hunt",
        text: "Line 25: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h1",
        options: [
          { id: "A", text: "James packed", correct: false },
          { id: "B", text: "his bag with", correct: false },
          { id: "C", text: "an apple a sandwich", correct: true },
          { id: "D", text: "and some crisps.", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Missing commas in the list."
      },
      {
        id: "h_q2", tag: "Punctuation Hunt",
        text: "Line 26: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h2",
        options: [
          { id: "A", text: "\"Stop right there!\"", correct: false },
          { id: "B", text: "shouted the officer,", correct: true },
          { id: "C", text: "\"You're entering", correct: false },
          { id: "D", text: "a restricted zone.\"", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Should end with a full stop since the next quote is a new sentence."
      },
      {
        id: "h_q3", tag: "Punctuation Hunt",
        text: "Line 27: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h3",
        options: [
          { id: "A", text: "The dogs", correct: true },
          { id: "B", text: "bone was buried", correct: false },
          { id: "C", text: "deep in the", correct: false },
          { id: "D", text: "back garden.", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Missing possessive apostrophe (dog's)."
      },
      {
        id: "h_q4", tag: "Punctuation Hunt",
        text: "Line 28: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h4",
        options: [
          { id: "A", text: "Its completely", correct: true },
          { id: "B", text: "understandable", correct: false },
          { id: "C", text: "why they chose", correct: false },
          { id: "D", text: "to leave early.", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Needs contraction apostrophe (It's)."
      },
      {
        id: "h_q5", tag: "Punctuation Hunt",
        text: "Line 29: Identify the segment with the punctuation error, or select 'N'.", evidenceLine: "h5",
        options: [
          { id: "A", text: "Although it", correct: false },
          { id: "B", text: "was raining heavily", correct: true },
          { id: "C", text: "we decided to continue", correct: false },
          { id: "D", text: "the hike.", correct: false },
          { id: "N", text: "No Mistake", correct: false }
        ],
        explanation: "Missing comma after a subordinate clause at the start."
      }
    ]
  },
  {
    id: 'grammar-proper-1',
    track: '11plus',
    sectionId: 'spag',
    subtopic: 'grammar',
    title: 'SECTION D: GRAMMAR CLOZE',
    desc: 'Choose the best word to complete each numbered gap so it makes grammatical sense.',
    tier: '11+ Standard',
    difficulty: 2,
    passageBlocks: [
      { id: 'g1', text: "The explorers bravely ventured into the [ 30 ] cavern, unaware of the dangers ahead." },
      { id: 'g2', text: "As they walked, the ground began to [ 31 ] beneath their heavy boots." },
      { id: 'g3', text: "They realized they had entered a chamber [ 32 ] belonged to a long-forgotten civilization." },
      { id: 'g4', text: "Suddenly, a tremendous roar echoed, and a horde of bats [ 33 ] swiftly past them." },
      { id: 'g5', text: "It was undoubtedly the most [ 34 ] experience of their entire expedition." }
    ],
    questions: [
      {
        id: "g_q1", tag: "Adjectives",
        text: "Gap 30: Select the most appropriate word to fill the gap.", evidenceLine: "g1",
        options: [
          { id: "A", text: "darkly", correct: false },
          { id: "B", text: "mysterious", correct: true },
          { id: "C", text: "mystery", correct: false },
          { id: "D", text: "mystify", correct: false }
        ],
        explanation: "Need an adjective to describe the cavern."
      },
      {
        id: "g_q2", tag: "Verbs",
        text: "Gap 31: Select the most appropriate word to fill the gap.", evidenceLine: "g2",
        options: [
          { id: "A", text: "tremble", correct: true },
          { id: "B", text: "trembling", correct: false },
          { id: "C", text: "trembled", correct: false },
          { id: "D", text: "trembles", correct: false }
        ],
        explanation: "Correct infinitive form after 'to'."
      },
      {
        id: "g_q3", tag: "Pronouns",
        text: "Gap 32: Select the most appropriate word to fill the gap.", evidenceLine: "g3",
        options: [
          { id: "A", text: "who", correct: false },
          { id: "B", text: "where", correct: false },
          { id: "C", text: "which", correct: true },
          { id: "D", text: "whose", correct: false }
        ],
        explanation: "Relative pronoun for objects."
      },
      {
        id: "g_q4", tag: "Verbs (Tense)",
        text: "Gap 33: Select the most appropriate word to fill the gap.", evidenceLine: "g4",
        options: [
          { id: "A", text: "flew", correct: true },
          { id: "B", text: "flown", correct: false },
          { id: "C", text: "flies", correct: false },
          { id: "D", text: "flying", correct: false }
        ],
        explanation: "Correct past tense for the action."
      },
      {
        id: "g_q5", tag: "Adjectives",
        text: "Gap 34: Select the most appropriate word to fill the gap.", evidenceLine: "g5",
        options: [
          { id: "A", text: "terrify", correct: false },
          { id: "B", text: "terrified", correct: false },
          { id: "C", text: "terrifying", correct: true },
          { id: "D", text: "terror", correct: false }
        ],
        explanation: "Adjective describing the experience."
      }
    ]
  }
];

async function uploadProperSpag() {
  console.log('Uploading PROPER SPaG questions to english_passages...');
  const { data, error } = await supabase
    .from('english_passages')
    .upsert(PROPER_SPAG);

  if (error) {
    console.error('Error uploading:', error.message);
  } else {
    console.log('✅ Successfully uploaded the proper SPaG questions to the database!');
  }
}

uploadProperSpag();
