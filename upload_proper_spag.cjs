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
    id: 'spelling-proper-10qs',
    track: '11plus',
    sectionId: 'spag',
    subtopic: 'spelling',
    title: 'SECTION B: SPELLING EXERCISES',
    desc: 'Select the correctly spelled word to fill in the numbered blanks in the passage.',
    tier: '11+ Standard',
    difficulty: 2,
    passageBlocks: [
      {
        id: "p1",
        text: "The old mansion at the end of the lane was [1] haunted, or so the local children thought. It wasn't strictly [2] to cross the rusty gates, but curiosity got the better of them. Inside, they found three [3] rooms filled with dusty furniture. Suddenly, they heard a noise. Did they just [4] a warning from a ghost? It was a very [5] sound, like a low howl. To their absolute [6], a tiny stray kitten popped out from behind a sofa. It tried to [7] into the shadows, but Leo offered it a piece of ham. The large house had enough room to [8] a whole family of cats. Leo didn't want to [9] himself by admitting he screamed earlier, so he pretended he wasn't scared. 'I [10] we should take it home,' he whispered."
      }
    ],
    questions: [
      {
        id: "s_q1", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [1]?",
        options: [
          { id: "A", text: "definately", correct: false },
          { id: "B", text: "definitely", correct: true },
          { id: "C", text: "definitly", correct: false },
          { id: "D", text: "definetly", correct: false }
        ],
        explanation: "The root word is 'finite'. Add the prefix 'de-' and the suffix '-ly' to get 'definitely'. There is no 'a' in definitely."
      },
      {
        id: "s_q2", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [2]?",
        options: [
          { id: "A", text: "neccessary", correct: false },
          { id: "B", text: "necesary", correct: false },
          { id: "C", text: "necessary", correct: true },
          { id: "D", text: "neccesary", correct: false }
        ],
        explanation: "Remember the 'shirt' rule for 'necessary': a shirt has one collar (one 'c') and two sleeves (two 's's)."
      },
      {
        id: "s_q3", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [3]?",
        options: [
          { id: "A", text: "separate", correct: true },
          { id: "B", text: "seperate", correct: false },
          { id: "C", text: "separete", correct: false },
          { id: "D", text: "saperate", correct: false }
        ],
        explanation: "A great way to remember this spelling is that there is 'a rat' in 'sep-a-rat-e'."
      },
      {
        id: "s_q4", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [4]?",
        options: [
          { id: "A", text: "recieve", correct: false },
          { id: "B", text: "receve", correct: false },
          { id: "C", text: "receeve", correct: false },
          { id: "D", text: "receive", correct: true }
        ],
        explanation: "Follow the rule 'i before e, except after c'. Since the letter before the vowel sound is 'c', it is spelled 'ei'."
      },
      {
        id: "s_q5", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [5]?",
        options: [
          { id: "A", text: "wierd", correct: false },
          { id: "B", text: "weerd", correct: false },
          { id: "C", text: "weird", correct: true },
          { id: "D", text: "weard", correct: false }
        ],
        explanation: "The word 'weird' is a common exception to the 'i before e' rule. It is spelled 'ei' even though there is no 'c'."
      },
      {
        id: "s_q6", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [6]?",
        options: [
          { id: "A", text: "suprise", correct: false },
          { id: "B", text: "surprize", correct: false },
          { id: "C", text: "surprise", correct: true },
          { id: "D", text: "suprize", correct: false }
        ],
        explanation: "Many people drop the first 'r' when speaking, but the correct spelling is 'surprise'."
      },
      {
        id: "s_q7", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [7]?",
        options: [
          { id: "A", text: "dissappear", correct: false },
          { id: "B", text: "disappear", correct: true },
          { id: "C", text: "dissapear", correct: false },
          { id: "D", text: "disapear", correct: false }
        ],
        explanation: "The prefix is 'dis-' and the root word is 'appear'. Combine them to get 'disappear' (one 's', two 'p's)."
      },
      {
        id: "s_q8", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [8]?",
        options: [
          { id: "A", text: "accommodate", correct: true },
          { id: "B", text: "accomodate", correct: false },
          { id: "C", text: "acommodate", correct: false },
          { id: "D", text: "acomodate", correct: false }
        ],
        explanation: "The word 'accommodate' has two 'c's and two 'm's. Think of it as needing enough room to accommodate 'two cots and two mattresses'."
      },
      {
        id: "s_q9", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [9]?",
        options: [
          { id: "A", text: "embarass", correct: false },
          { id: "B", text: "embarras", correct: false },
          { id: "C", text: "embaress", correct: false },
          { id: "D", text: "embarrass", correct: true }
        ],
        explanation: "The word 'embarrass' needs a double 'r' and a double 's'."
      },
      {
        id: "s_q10", tag: "Error-Hunt", evidenceLine: "p1",
        text: "Which word correctly fills blank [10]?",
        options: [
          { id: "A", text: "beleive", correct: false },
          { id: "B", text: "believe", correct: true },
          { id: "C", text: "belive", correct: false },
          { id: "D", text: "beleeve", correct: false }
        ],
        explanation: "Follow the 'i before e' rule here."
      }
    ]
  },
  {
    id: 'punctuation-proper-10qs',
    track: '11plus',
    sectionId: 'spag',
    subtopic: 'punctuation',
    title: 'SECTION C: PUNCTUATION EXERCISES',
    desc: 'Read the following passage carefully. Pay close attention to the advanced punctuation used throughout the text, then answer the 10 questions that follow.',
    tier: '11+ Standard',
    difficulty: 3,
    passageBlocks: [
      {
        id: "p1",
        text: "The tempest howled across the moors, battering the ancient, ivy-strangled walls of Oakhaven Manor; within, Lord Alistair—a man of singular, brooding temperament—paced the length of the grand library. His mind was a tempest of its own, swirling with unresolved grievances: betrayal by his kin, the loss of his ancestral fortune, and a creeping, unshakable dread."
      },
      {
        id: "p2",
        text: "\"Is it not enough,\" he muttered, his voice barely rising above the wind's cacophony, \"that they have stripped me of my titles? Must they also claim the very stones of this estate?\""
      },
      {
        id: "p3",
        text: "On the mahogany desk lay the fateful document. Its wax seal, bearing the crest of the Royal Court (a silver falcon clutching a serpent), was fractured—a stark symbol of his ruined legacy. He reached for his quill, the feather trembling slightly in his grip, yet he hesitated. To sign meant surrender; to refuse meant certain ruin."
      },
      {
        id: "p4",
        text: "A sudden, sharp knock echoed through the cavernous hall. The heavy oak doors, which hadn't been opened to visitors in a decade, groaned in protest. Alistair's manservant, Barnaby—whose loyalty was as unquestionable as his age was advanced—shuffled into the room. \"My Lord,\" Barnaby wheezed, \"the emissaries... they have arrived.\""
      }
    ],
    questions: [
      {
        id: "h_q1", tag: "Punctuation Hunt", evidenceLine: "p1",
        text: "In paragraph 1, what is the grammatical function of the semicolon in the phrase '...walls of Oakhaven Manor; within, Lord Alistair...'?",
        options: [
          { id: "A", text: "To separate items in a complex list.", correct: false },
          { id: "B", text: "To link two closely related independent clauses.", correct: true },
          { id: "C", text: "To introduce an explanation or a quotation.", correct: false },
          { id: "D", text: "To indicate a pause longer than a full stop.", correct: false }
        ],
        explanation: "A semicolon connects two independent clauses that are closely linked in theme."
      },
      {
        id: "h_q2", tag: "Punctuation Hunt", evidenceLine: "p1",
        text: "Look at the phrase '...Lord Alistair—a man of singular, brooding temperament—paced...'. Why has the author used dashes here?",
        options: [
          { id: "A", text: "To show a sudden interruption in speech.", correct: false },
          { id: "B", text: "To enclose parenthetical (extra) information.", correct: true },
          { id: "C", text: "To introduce a list of character traits.", correct: false },
          { id: "D", text: "To separate a subordinate clause from a main clause.", correct: false }
        ],
        explanation: "A pair of dashes can be used to mark parenthesis—extra information inserted into a sentence."
      },
      {
        id: "h_q3", tag: "Punctuation Hunt", evidenceLine: "p1",
        text: "Why is a colon used after the word 'grievances' in paragraph 1?",
        options: [
          { id: "A", text: "To separate two independent clauses.", correct: false },
          { id: "B", text: "To introduce a list or expansion of the preceding statement.", correct: true },
          { id: "C", text: "To emphasize the final word of the sentence.", correct: false },
          { id: "D", text: "To indicate a missing word.", correct: false }
        ],
        explanation: "A colon is used to introduce a list or an explanation of what has just been mentioned."
      },
      {
        id: "h_q4", tag: "Punctuation Hunt", evidenceLine: "p3",
        text: "In paragraph 3, the sentence reads: 'To sign meant surrender; to refuse meant certain ruin.' If the author had used a comma instead of a semicolon, what grammatical error would have been created?",
        options: [
          { id: "A", text: "A misplaced modifier.", correct: false },
          { id: "B", text: "A comma splice.", correct: true },
          { id: "C", text: "A split infinitive.", correct: false },
          { id: "D", text: "A dangling participle.", correct: false }
        ],
        explanation: "Joining two independent clauses with just a comma creates an error known as a comma splice."
      },
      {
        id: "h_q5", tag: "Punctuation Hunt", evidenceLine: "p2",
        text: "In paragraph 2, why is there a comma immediately after the word 'enough' inside the inverted commas?",
        options: [
          { id: "A", text: "Because 'he muttered' is a reporting clause interrupting the direct speech.", correct: true },
          { id: "B", text: "Because the sentence inside the speech marks is grammatically incomplete.", correct: false },
          { id: "C", text: "To separate the subject from the verb.", correct: false },
          { id: "D", text: "To indicate that a question is being asked.", correct: false }
        ],
        explanation: "A comma is placed inside the inverted commas to separate the spoken words from the narrator's tag."
      },
      {
        id: "h_q6", tag: "Punctuation Hunt", evidenceLine: "p2",
        text: "What does the apostrophe in the phrase 'the wind's cacophony' indicate?",
        options: [
          { id: "A", text: "A contraction of 'wind is'.", correct: false },
          { id: "B", text: "The plurality of the wind.", correct: false },
          { id: "C", text: "Singular possession (the cacophony belonging to the wind).", correct: true },
          { id: "D", text: "Plural possession (the cacophony belonging to multiple winds).", correct: false }
        ],
        explanation: "The apostrophe followed by an 's' on a singular noun indicates possession."
      },
      {
        id: "h_q7", tag: "Punctuation Hunt", evidenceLine: "p3",
        text: "In paragraph 3, brackets are used around the phrase '(a silver falcon clutching a serpent)'. What is the purpose of these brackets?",
        options: [
          { id: "A", text: "To show an editorial correction to the text.", correct: false },
          { id: "B", text: "To provide supplementary, parenthetical information about the crest.", correct: true },
          { id: "C", text: "To emphasize the importance of the falcon to the plot.", correct: false },
          { id: "D", text: "To replace a missing comma in the sentence.", correct: false }
        ],
        explanation: "Brackets are used to insert extra, non-essential information into a sentence."
      },
      {
        id: "h_q8", tag: "Punctuation Hunt", evidenceLine: "p1",
        text: "Look at the list in paragraph 1: '...betrayal by his kin, the loss of his ancestral fortune, and a creeping, unshakable dread.' What is the specific term for the comma placed immediately before the word 'and'?",
        options: [
          { id: "A", text: "The serial (or Oxford) comma.", correct: true },
          { id: "B", text: "The splicing comma.", correct: false },
          { id: "C", text: "The parenthetical comma.", correct: false },
          { id: "D", text: "The coordinating comma.", correct: false }
        ],
        explanation: "The comma placed before the final conjunction in a list is the serial or Oxford comma."
      },
      {
        id: "h_q9", tag: "Punctuation Hunt", evidenceLine: "p1",
        text: "Why is a hyphen used in the phrase 'ivy-strangled walls' in paragraph 1?",
        options: [
          { id: "A", text: "To create a compound adjective modifying the word 'walls'.", correct: true },
          { id: "B", text: "To show a dramatic pause before describing the walls.", correct: false },
          { id: "C", text: "To indicate that a word has been split across two lines of text.", correct: false },
          { id: "D", text: "To separate a prefix from a root word.", correct: false }
        ],
        explanation: "A hyphen is used to link words to form a compound adjective."
      },
      {
        id: "h_q10", tag: "Punctuation Hunt", evidenceLine: "p4",
        text: "In the final sentence, Barnaby says, 'the emissaries... they have arrived.' What does the ellipsis (...) indicate in this context?",
        options: [
          { id: "A", text: "An omission of words from a quoted text.", correct: false },
          { id: "B", text: "A grammatical trailing off into complete silence.", correct: false },
          { id: "C", text: "A hesitation, pause, or faltering in speech.", correct: true },
          { id: "D", text: "The definitive end of a declarative sentence.", correct: false }
        ],
        explanation: "An ellipsis is frequently used to show a character hesitating or pausing."
      }
    ]
  },
  {
    id: 'grammar-proper-10qs',
    track: '11plus',
    sectionId: 'spag',
    subtopic: 'grammar',
    title: 'SECTION D: GRAMMAR CLOZE',
    desc: 'Read the passage carefully and answer the grammar questions that follow.',
    tier: '11+ Standard',
    difficulty: 2,
    passageBlocks: [
      { id: "g1", text: "Leo tiptoed into the dusty attic. The wooden floorboards creaked under his feet. He was looking for his grandfather's old chest." },
      { id: "g2", text: "Suddenly, he spotted a shiny brass lock gleaming in the dark corner. He quickly wiped away the thick cobwebs and opened the heavy lid." },
      { id: "g3", text: "Inside, a rolled-up parchment rested on a pile of faded clothes. Leo carefully unrolled it. It was a treasure map! \"I must show this to my sister,\" he whispered excitedly." },
      { id: "g4", text: "He ran downstairs as fast as he could. His sister, Mia, was reading a book in the garden. When she saw the map, her eyes widened with amazement." }
    ],
    questions: [
      {
        id: "g_q1", tag: "Grammar", evidenceLine: "g1",
        text: "Read the first sentence: 'Leo tiptoed into the dusty attic.' Which word is an adjective?",
        options: [
          { id: "A", text: "Leo", correct: false },
          { id: "B", text: "tiptoed", correct: false },
          { id: "C", text: "dusty", correct: true },
          { id: "D", text: "attic", correct: false }
        ],
        explanation: "An adjective is a describing word. 'Dusty' describes the noun 'attic'."
      },
      {
        id: "g_q2", tag: "Grammar", evidenceLine: "g1",
        text: "In paragraph 1, the word 'creaked' is used. What part of speech is it?",
        options: [
          { id: "A", text: "Noun", correct: false },
          { id: "B", text: "Verb", correct: true },
          { id: "C", text: "Adjective", correct: false },
          { id: "D", text: "Adverb", correct: false }
        ],
        explanation: "A verb is an action or doing word."
      },
      {
        id: "g_q3", tag: "Grammar", evidenceLine: "g2",
        text: "Look at paragraph 2. Which of these words is an adverb?",
        options: [
          { id: "A", text: "shiny", correct: false },
          { id: "B", text: "quickly", correct: true },
          { id: "C", text: "heavy", correct: false },
          { id: "D", text: "corner", correct: false }
        ],
        explanation: "An adverb describes a verb. 'Quickly' tells us how Leo wiped away the cobwebs."
      },
      {
        id: "g_q4", tag: "Grammar", evidenceLine: "g2",
        text: "In paragraph 2, what part of speech is the word 'cobwebs'?",
        options: [
          { id: "A", text: "Pronoun", correct: false },
          { id: "B", text: "Adjective", correct: false },
          { id: "C", text: "Preposition", correct: false },
          { id: "D", text: "Noun", correct: true }
        ],
        explanation: "A noun is a person, place, or thing."
      },
      {
        id: "g_q5", tag: "Grammar", evidenceLine: "g4",
        text: "Which of these words from paragraph 4 is a pronoun?",
        options: [
          { id: "A", text: "He", correct: true },
          { id: "B", text: "ran", correct: false },
          { id: "C", text: "downstairs", correct: false },
          { id: "D", text: "garden", correct: false }
        ],
        explanation: "A pronoun replaces a noun."
      },
      {
        id: "g_q6", tag: "Grammar", evidenceLine: "g1",
        text: "In the phrase 'under his feet' from paragraph 1, what part of speech is the word 'under'?",
        options: [
          { id: "A", text: "Preposition", correct: true },
          { id: "B", text: "Conjunction", correct: false },
          { id: "C", text: "Adverb", correct: false },
          { id: "D", text: "Adjective", correct: false }
        ],
        explanation: "A preposition shows position or direction."
      },
      {
        id: "g_q7", tag: "Grammar", evidenceLine: "g1",
        text: "What is the main tense used throughout this story?",
        options: [
          { id: "A", text: "Present tense", correct: false },
          { id: "B", text: "Past tense", correct: true },
          { id: "C", text: "Future tense", correct: false },
          { id: "D", text: "Present perfect tense", correct: false }
        ],
        explanation: "The story uses past tense verbs like 'tiptoed' and 'creaked'."
      },
      {
        id: "g_q8", tag: "Grammar", evidenceLine: "g3",
        text: "In paragraph 3, we read: 'he whispered excitedly.' What part of speech is 'excitedly'?",
        options: [
          { id: "A", text: "Verb", correct: false },
          { id: "B", text: "Adjective", correct: false },
          { id: "C", text: "Noun", correct: false },
          { id: "D", text: "Adverb", correct: true }
        ],
        explanation: "Words that describe verbs are adverbs."
      },
      {
        id: "g_q9", tag: "Grammar", evidenceLine: "g2",
        text: "Look at paragraph 2: '...wiped away the thick cobwebs and opened the heavy lid.' What part of speech is 'and'?",
        options: [
          { id: "A", text: "Preposition", correct: false },
          { id: "B", text: "Conjunction", correct: true },
          { id: "C", text: "Pronoun", correct: false },
          { id: "D", text: "Article", correct: false }
        ],
        explanation: "A conjunction is a joining word."
      },
      {
        id: "g_q10", tag: "Grammar", evidenceLine: "g4",
        text: "In paragraph 4, Mia is reading 'a' book. What do we call the word 'a'?",
        options: [
          { id: "A", text: "Definite article", correct: false },
          { id: "B", text: "Indefinite article", correct: true },
          { id: "C", text: "Proper noun", correct: false },
          { id: "D", text: "Demonstrative pronoun", correct: false }
        ],
        explanation: "The word 'a' is an indefinite article."
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
