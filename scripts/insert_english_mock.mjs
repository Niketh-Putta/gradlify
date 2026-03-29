import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const questions = [];

// COMPREHENSION
const comprehension_passage = `### Passage 1: 19th Century Classic

The fog was so thick it seemed to swallow the cobbled streets of London whole. Eliza pulled her shawl tighter against the biting chill, her footsteps echoing like lonely heartbeats against the damp stone. She had been warned not to venture out past curfew, but the letter in her pocket—heavy with a wax seal that bore the crest of a fallen house—demanded urgency.

Above her, the gas lamps flickered weakly, struggling to pierce the miasma. A sudden clatter from a nearby alleyway made her freeze. Naturally, her mind raced. Was it merely a stray cat, or was she being pursued by the very shadows she sought to evade? The city was a labyrinth of secrets, and she was but a mouse navigating its treacherous corridors.

Clutching the letter, she turned the corner onto Blackwood Avenue. The imposing silhouette of her destination loomed ahead—a manor that had stood empty for a decade, or so the townsfolk whispered. Yet, a single, pale light burned in the highest window.`;

for (let i = 0; i < 10; i++) {
    questions.push({
        question_text: `${comprehension_passage}\n\n**Question ${i+1}: What implies the main character's true motivation in paragraph ${Math.min(i+1, 3)}?**`,
        options: JSON.stringify(["A surface-level assumption.", "An exaggerated interpretation.", "A perfectly logical but completely unsupported claim.", "The nuanced answer deriving from the passage."]),
        correct_answer: "The nuanced answer deriving from the passage.",
        explanation: "This nuanced answer correctly synthesizes the information from the paragraph.",
        question_type: "Comprehension",
        subtopic: "comprehension|fiction",
        track: "11plus",
        marks: 1,
        difficulty: 2,
        tier: "11+ Standard",
        calculator: "Non-Calculator",
        estimated_time_sec: 90
    });
}

// SPaG
const spag_passage = `### Passage 2: Punctuation (Hippos)

Mention the word hippo and you will probably think of a cute but robust animal that's missing its commas. Waiting in the wings, the students' nerves soared as they listened to the whispers from the crowd.`;

for (let i = 0; i < 10; i++) {
    questions.push({
        question_text: `${spag_passage}\n\n**Question ${i+1}: Identify the punctuation error in this segment.**`,
        options: JSON.stringify(["Segment one of the sentence", "Segment two of the sentence", "The erroneous segment with the missing comma", "Segment four of the sentence"]),
        correct_answer: "The erroneous segment with the missing comma",
        explanation: "A comma is required to separate the clauses effectively.",
        question_type: "SPaG",
        subtopic: "spag|punctuation",
        track: "11plus",
        marks: 1,
        difficulty: 2,
        tier: "11+ Standard",
        calculator: "Non-Calculator",
        estimated_time_sec: 60
    });
}

// VOCAB
const vocab_passage = `### Vocabulary Test: Synonyms and Antonyms

The ancient manor possessed an incredibly scrupulous and meticulous design, ensuring that every stone was perfectly aligned with the cosmos. His lethargic successors failed to maintain the facade, allowing ivy to aggressively pillage the grand stonework.`;

for (let i = 0; i < 10; i++) {
    questions.push({
        question_text: `${vocab_passage}\n\n**Vocabulary Question ${i+1}:\nWhich of the following is an antonym for 'Scrupulous'?**`,
        options: JSON.stringify(["Meticulous", "Careless", "Honest", "Diligent"]),
        correct_answer: "Careless",
        explanation: "Scrupulous means careful, whereas careless is the direct opposite.",
        question_type: "Vocabulary",
        subtopic: "vocab|synonyms-antonyms",
        track: "11plus",
        marks: 1,
        difficulty: 2,
        tier: "11+ Standard",
        calculator: "Non-Calculator",
        estimated_time_sec: 45
    });
}

async function upload() {
    console.log("Adding Mock English Questions...");
    
    // Optional: First delete existing English questions to avoid duplicates on multiple runs
    const { error: delError } = await supabase
        .from('exam_questions')
        .delete()
        .in('question_type', ['Comprehension', 'SPaG', 'Vocabulary']);
        
    const { data, error } = await supabase.from('exam_questions').insert(questions).select();
    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Successfully inserted", data.length, "English questions!");
    }
}

upload();
