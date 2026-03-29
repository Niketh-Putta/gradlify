import json
import re

def enrich_spag_premium():
    file_path = 'src/data/eleven_plus_english_notes.json'
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Expanded details for SPaG topics
    enrichments = {
        "spag-word_classes": """
### Expanded Word Class Mastery

Every sentence is built from 8 core building blocks. To score 100% in the 11+, you must distinguish between them even when a word changes its "job" depending on the context.

#### 1. The Noun Family
*   **Proper Nouns:** Specific names (London, Jupiter). Always capitalized.
*   **Common Nouns:** General items (table, dog).
*   **Abstract Nouns:** Concepts or feelings you cannot touch (bravery, time, sorrow).
*   **Collective Nouns:** Groups of things (a *pride* of lions, a *herd* of cows).

#### 2. The Verb Engine
*   **Action Verbs:** Physical or mental actions (run, think, explode).
*   **Auxiliary (Helping) Verbs:** Used with main verbs to show tense (is, was, has, will).
*   **Modal Verbs:** Show possibility or necessity (could, might, must, should).

#### 3. Determiners: The "Pointing" Words
Determinant words come before nouns to clarify which one you mean:
*   **Articles:** The, a, an.
*   **Demonstratives:** This, that, these, those.
*   **Quantifiers:** Some, many, few, every.

---
[BLOCK_TYPE: concepts]
#### 11+ Strategy: The Word-Class Swap
Some words look like one class but act like another.
*   "The **fast** runner..." (Adjective - describes the runner)
*   "He ran **fast**..." (Adverb - describes how he ran)
*   "I will **fast** for a day..." (Verb - the action of not eating)
---
""",
        "spag-punctuation_marks": """
### Punctuation for Precision

Punctuation isn't just about stops; it's about controlling the speed and flow of the reader's mind.

#### The Hierarchy of Pauses
1.  **Comma (,):** A quick breath. Used for lists, fronted adverbials, and marking clauses.
2.  **Semicolon (;):** A heavy pause. Connects two independent sentences that are closely related.
3.  **Colon (:):** A gateway. Introduces a list, an explanation, or a quote.
4.  **Full Stop (.):** A complete halt.

#### Advanced Punctuation: The 11+ Differentiators
*   **Dash (—):** Used to add sudden emphasis or an "extra" thought at the end of a sentence.
*   **Parentheses ( ):** Used for non-essential information (extra detail).
*   **Hyphen (-):** Used to join words together (e.g., *mother-in-law*, *ice-cold*). Do not confuse this with a dash!

---
[BLOCK_TYPE: mistakes]
#### The "Greengrocer's Apostrophe"
Never use an apostrophe to make a word plural. 
*   **Wrong:** Apple's for sale!
*   **Right:** Apples for sale!
Only use apostrophes for **Contraction** (can't) or **Possession** (the girl's hat).
---
""",
        "spag-sentence_structure": """
### Complex Sentence Architecture

High-scoring writing uses a variety of sentence lengths and structures.

#### 1. Simple Sentences
One independent clause. Short, punchy, and clear.
*   *The storm arrived.*

#### 2. Compound Sentences
Two main clauses joined by a coordinating conjunction (FANBOYS: For, And, Nor, But, Or, Yet, So).
*   *The storm arrived, **and** the lights flickered.*

#### 3. Complex Sentences
One main clause and at least one subordinate (dependent) clause.
*   *Because the storm arrived, the lights flickered.*

---
[BLOCK_TYPE: concepts]
#### Fronted Adverbials
A fronted adverbial is a word or phrase at the beginning of a sentence which describes the action that follows.
*   **Time:** *Before dawn*, the birds began to sing.
*   **Place:** *Under the bridge*, a troll waited.
*   **Manner:** *Without a sound*, the cat crept forward.
*   **Constraint:** You **must** use a comma after a fronted adverbial.
---
""",
        "spag-spelling_rules": """
### The Logic of English Spelling

English spelling can seem random, but 80% follow established patterns. Mastering these "logic gates" will prevent marks from slipping away.

#### 1. The "Magic E" (Split Digraph)
Adding an 'e' to the end of a word usually makes the preceding vowel say its name (long vowel sound).
*   *Hop* becomes *Hope*. *Pin* becomes *Pine*.

#### 2. The Double Consonant Rule
If a word ends in a single vowel + single consonant, and the suffix begins with a vowel, you usually double the final consonant to keep the first vowel short.
*   *Run* + *ing* = *Running* (not runing).
*   *Step* + *ed* = *Stepped* (not steped).

#### 3. 'I' before 'E' except after 'C'
This classic rule applies when the sound is a long 'ee'.
*   *Believe, Relief*
*   *Receive, Ceiling*
*   **Exceptions:** *Science, Weird, Height.*

---
[BLOCK_TYPE: summary]
#### 11+ Spelling Checklist
1. Identify the root word.
2. Check for prefixes (un-, dis-, mis-).
3. Check for suffixes (-ing, -ed, -ly).
4. Look for "silent guests" (K in Knee, G in Gnaw, B in Comb).
---
""",
        "spag-active_passive": """
### The Power of Voice: Active vs Passive

Choosing between active and passive voice is a stylistic decision that changes the focus of the sentence.

#### 1. The Active Voice (Direct & Strong)
The subject **does** the action. Use this for clear, energetic storytelling.
*   *The dragon guarded the treasure.*
*   (Subject: Dragon | Action: Guarded | Object: Treasure)

#### 2. The Passive Voice (Formal & Objective)
The action happens **to** the subject. Use this for formal reports or to create mystery.
*   *The treasure was guarded by the dragon.*
*   (Note: The object 'Treasure' has moved to the front).

---
[BLOCK_TYPE: summary]
#### Why use Passive Voice?
1. **Formal Tone:** "The law was passed."
2. **Shift Focus:** "A cure has been discovered!" (The cure is more important than who found it).
3. **Avoid Blame:** "A mistake was made." (Instead of "I made a mistake").
---
"""
    }

    # Apply enrichments and scrub bold text from markdown
    for topic in data.get("SPaG", []):
        slug = topic["slug"]
        if slug in enrichments:
            # Overwrite with deep detail
            enriched_md = enrichments[slug]
            
            # Append existing practice questions if they exist
            if "---" in topic["md"]:
                parts = topic["md"].split("---")
                # Keep the quiz parts (usually the later parts)
                quiz_parts = [p for p in parts if "[QUIZ_OPTION" in p]
                if quiz_parts:
                    enriched_md += "\n---\n" + "\n---\n".join(quiz_parts)
            
            topic["md"] = enriched_md
        
        # Scrub standard bold markdown (**text**) from all SPaG notes
        # We want to remove the ** but keep the text
        # The Custom renderer will handle semantic bolding via our new serif style
        topic["md"] = re.sub(r'\*\*(.*?)\*\*', r'\1', topic["md"])

    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    enrich_spag_premium()
    print("Enriched SPaG notes with deep detail and scrubbed standard bolding for a premium serif look.")
