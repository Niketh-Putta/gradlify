import json

def inject_spag_premium():
    # Load the English notes
    file_path = 'src/data/eleven_plus_english_notes.json'
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Define the new, expansive SPaG topics
    # Standard prefixing: G1, G2, etc. for Grammar/SPaG
    spag_topics = [
        {
            "slug": "spag-word_classes",
            "title": "G1: Master the 8 Word Classes",
            "level": "11+",
            "md": """## 1. The Building Blocks
Every word in a sentence has a job. If you can identify these jobs, you can spot grammar traps instantly.

**Nouns:** Names of people, places, things, or ideas.
*Example:* The **detective** studied the **clue** in **London**.

**Verbs:** Actions or states of being.
*Example:* The runner **bolted** while the coach **waited**.

**Adjectives:** Describing words that modify nouns.
*Example:* The **ancient, rusted** key turned slowly.

**Adverbs:** Descriptive words for verbs or adjectives (often ending in -ly).
*Example:* He whispered **quietly** and walked **very** fast.

**Pronouns:** Words that replace nouns to avoid repetition.
*Example:* **He** gave **it** to **them**.

**Prepositions:** Show the relationship in time or space.
*Example:* The cat sat **under** the chair **beside** the window.

**Conjunctions:** Connect words or clauses.
*Example:* I stayed home **because** it was raining.

**Determiners:** Introduce a noun (a, an, the, some).
*Example:* **The** bright light caught **those** eyes.

## SPaG Reference: Quick Identification
*Use this bank to practice identifying roles in tough 11+ sentences.*

**Word:** Quickly
*Class:* Adverb
*Role:* Tells us exactly how an action was performed.

**Word:** Ancient
*Class:* Adjective
*Role:* Provides specific detail about a noun's age or state.

**Word:** Underneath
*Class:* Preposition
*Role:* Shows the physical location of one object relative to another.

**Word:** Although
*Class:* Conjunction
*Role:* Joins two opposing ideas together in one sentence.

## 2. Exam Tips
Identify the verb first. Once you find the action, you can ask "Who did it?" (Noun) and "How did they do it?" (Adverb). This simple check helps you avoid the common trap of confusing adjectives with adverbs.

## 3. Practice Questions

**Q1 (Level: Easy)**
What is the word class of 'mysterious' in this sentence: *The mysterious box sat on the high shelf.*

[QUIZ_OPTION: A] Noun
[QUIZ_OPTION: B] Verb
[QUIZ_OPTION: C] Adjective [CORRECT]
[QUIZ_OPTION: D] Adverb
[QUIZ_OPTION: E] Pronoun

**Explanation:**
'Mysterious' provides detail about the box (the noun). Words that describe nouns are adjectives.

---

**Q2 (Level: Medium)**
Identify the adverb in the following sentence: *The eagle soared effortlessly above the jagged mountains.*

[QUIZ_OPTION: A] Eagle
[QUIZ_OPTION: B] Effortlessly [CORRECT]
[QUIZ_OPTION: C] Above
[QUIZ_OPTION: D] Jagged
[QUIZ_OPTION: E] Mountains

**Explanation:**
'Effortlessly' describes the manner in which the eagle soared (the verb). It tells us how the action happened.
"""
        },
        {
            "slug": "spag-punctuation_marks",
            "title": "G2: Punctuation Mastery",
            "level": "11+",
            "md": """## 1. Semicolons and Colons
The 11+ assesses your ability to use punctuation to connect complex ideas. 

### The Semicolon (;)
A semicolon acts like a bridge between two complete sentences that are closely related. If you could use a full stop, you can usually use a semicolon.
*Example:* The storm raged outside; the family stayed warm by the fire.

### The Colon (:)
A colon introduces a list, a quote, or an explanation. It signals that important information is about to follow.
*Example:* The explorer packed three items: a map, a compass, and a torch.

## SPaG Reference: The Punctuation Toolkit
*Review these common marks and their specific rules.*

**Mark:** Semicolon (;)
*Rule:* Joins two independent clauses without using a conjunction like 'and' or 'but'.

**Mark:** Colon (:)
*Rule:* Used to introduce a list or provide a direct explanation for the first half of the sentence.

**Mark:** Apostrophe (')
*Rule:* Used for contractions (it's) or to show possession (Sarah's book).

**Mark:** Hyphen (-)
*Rule:* Connects two words to create a single idea, like 'well-known' or 'ice-cold'.

## 2. Exam Tips
When you see a semicolon in a 'Spot the Error' question, check both sides of it. If both sides could stand as their own separate sentences, the semicolon is used correctly. If one side is just a fragment, it is a mistake.

## 3. Practice Questions

**Q1 (Level: Medium)**
Which sentence uses the semicolon correctly?

[QUIZ_OPTION: A] I went to the shop; and bought bread.
[QUIZ_OPTION: B] The cat slept; the dog barked. [CORRECT]
[QUIZ_OPTION: C] Running fast; he tripped over a branch.
[QUIZ_OPTION: D] Because it was late; we went home.
[QUIZ_OPTION: E] I have three pets; a dog, a cat, and a bird.

**Explanation:**
Option B has two complete sentences joined together. Options A, C, and D join fragments. Option E should use a colon for a list.

---

**Q2 (Level: Hard)**
Identify the punctuation error: *The explorers' were exhausted after their long journey.*

[QUIZ_OPTION: A] missing full stop
[QUIZ_OPTION: B] incorrect apostrophe [CORRECT]
[QUIZ_OPTION: C] missing capital letter
[QUIZ_OPTION: D] incorrect comma
[QUIZ_OPTION: E] missing hyphen

**Explanation:**
'Explorers' is just a plural word here, not showing possession. No apostrophe is needed unless you were talking about the explorers' equipment.
"""
        },
        {
            "slug": "spag-sentence_structure",
            "title": "G3: Complex Sentence Types",
            "level": "11+",
            "md": """## 1. Simple, Compound, and Complex
To score high marks, you must understand how sentences are built from clauses.

**Simple Sentence:** One independent clause.
*Example:* The sun set.

**Compound Sentence:** Two independent clauses joined by a conjunction (FANBOYS: For, And, Nor, But, Or, Yet, So).
*Example:* The sun set, and the stars appeared.

**Complex Sentence:** One independent clause and at least one dependent (subordinate) clause.
*Example:* Although it was cold, the children played outside.

## SPaG Reference: Clause Identification
*Use this bank to understand how sentences are layered.*

**Term:** Main Clause
*Definition:* A group of words that contains a verb and makes sense on its own.

**Term:** Subordinate Clause
*Definition:* Adds extra information but does not make sense alone. It usually starts with a word like 'while', 'because', or 'if'.

**Term:** Relative Clause
*Definition:* A type of subordinate clause that starts with 'who', 'which', or 'that' to describe a noun.

## 2. Exam Tips
Identify the "subordinator" word. If you see 'because', 'although', 'while', or 'since' at the start of a section, you are looking at a complex sentence. These words are the glue that holds the extra information to the main idea.

## 3. Practice Questions

**Q1 (Level: Medium)**
What type of sentence is this: *The team played well, but they lost the match.*

[QUIZ_OPTION: A] Simple
[QUIZ_OPTION: B] Compound [CORRECT]
[QUIZ_OPTION: C] Complex
[QUIZ_OPTION: D] Imperative
[QUIZ_OPTION: E] Fragment

**Explanation:**
Two independent clauses are joined by the conjunction 'but', making it a classic compound sentence.

---

**Q2 (Level: Hard)**
Identify the subordinate clause: *Even though she was tired, Sarah finished her homework.*

[QUIZ_OPTION: A] Sarah finished
[QUIZ_OPTION: B] her homework
[QUIZ_OPTION: C] finished her homework
[QUIZ_OPTION: D] Even though she was tired [CORRECT]
[QUIZ_OPTION: E] Sarah finished her

**Explanation:**
'Even though she was tired' cannot stand alone as a sentence. It depends on the rest of the sentence to make sense.
"""
        },
        {
            "slug": "spag-spelling_rules",
            "title": "G4: Core Spelling Rules",
            "level": "11+",
            "md": """## 1. Master the Rules (and Exceptions)
English spelling is famous for its oddities, but most words follow set patterns.

### I before E except after C
This classic rule works for words like *relief* and *believe*, and changes for *receipt* and *ceiling*.

### Doubling Consonants
When adding a suffix like -ed or -ing to a word with a short vowel sound, you double the final letter.
*Example:* Hop -> Hopped / Run -> Running.

### Silent Letters
Some words have hidden "ghost" letters that you must memorize.
*Examples:* **K**night, **G**nome, **W**rite, autum**n**.

## SPaG Reference: Spelling Patterns
*Study these common roots and suffixes to avoid spelling errors.*

**Pattern:** -tion / -sion
*Rule:* Used to turn verbs into nouns. Examples: Action, Tension, Mission.

**Pattern:** -ough
*Rule:* One of the hardest sounds. Examples: Rough, Though, Through, Cough.

**Pattern:** -ous
*Rule:* Used for adjectives. Examples: Dangerous, Famous, Courageous.

## 2. Exam Tips
Break long words into syllables. If you are stuck on a word like 'unnecessary', split it: un-ne-ces-sary. You will see immediately that it requires two 's' and two 'c' sounds if you listen to the individual parts.

## 3. Practice Questions

**Q1 (Level: Easy)**
Which of the following is spelled correctly?

[QUIZ_OPTION: A] Beleive
[QUIZ_OPTION: B] Believe [CORRECT]
[QUIZ_OPTION: C] Beleiv
[QUIZ_OPTION: D] Believ
[QUIZ_OPTION: E] Belive

**Explanation:**
Following the rule "I before E except after C", 'believe' is the correct spelling.

---

**Q2 (Level: Medium)**
Identify the incorrectly spelled word in this list.

[QUIZ_OPTION: A] Disappear
[QUIZ_OPTION: B] Dissapoint [CORRECT]
[QUIZ_OPTION: C] Necessary
[QUIZ_OPTION: D] Business
[QUIZ_OPTION: E] Separate

**Explanation:**
'Disappoint' has one 's' and two 'p's. It is formed by 'dis-' + 'appoint'. People often make the mistake of doubling the 's'.
"""
        },
        {
            "slug": "spag-active_passive",
            "title": "G5: Active vs Passive Voice",
            "level": "11+",
            "md": """## 1. Who is Doing the Action?
This is a high-level concept often used to separate top students.

**Active Voice:** The subject performs the action. It is direct and strong.
*Example:* The chef prepared the meal.

**Passive Voice:** The action happens to the subject. It is often slower and more formal.
*Example:* The meal was prepared by the chef.

## SPaG Reference: Voice Reversal
*Practice flipping the voice in your head.*

**Active:** The dog chased the cat.
**Passive:** The cat was chased by the dog.

**Active:** Scientists discovered a new planet.
**Passive:** A new planet was discovered by scientists.

## 2. Exam Tips
Look for the word 'by'. In many passive sentences, the person doing the action is hidden at the end after the word 'by'. If you see "was [verb] by", you are almost certainly looking at a passive sentence.

## 3. Practice Questions

**Q1 (Level: Medium)**
Which of these sentences is written in the passive voice?

[QUIZ_OPTION: A] The boy kicked the ball.
[QUIZ_OPTION: B] Sarah wrote a letter.
[QUIZ_OPTION: C] The book was read by the student. [CORRECT]
[QUIZ_OPTION: D] The sun shines brightly.
[QUIZ_OPTION: E] I am eating an apple.

**Explanation:**
In Option C, the subject (the book) is having the action done to it. The person doing the reading is placed at the end.

---

**Q2 (Level: Hard)**
Change this active sentence into the passive voice: *The artist painted a masterpiece.*

[QUIZ_OPTION: A] A masterpiece was painted by the artist. [CORRECT]
[QUIZ_OPTION: B] The artist was painting a masterpiece.
[QUIZ_OPTION: C] A masterpiece is painted by the artist.
[QUIZ_OPTION: D] The artist has painted a masterpiece.
[QUIZ_OPTION: E] Painting was done by the artist.

**Explanation:**
To flip to passive, move the object (masterpiece) to the start and use the past participle with 'was'.
"""
        }
    ]

    # Inject into SPaG section
    data["SPaG"] = spag_topics

    # Write back to file
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    inject_spag_premium()
    print("Injected detailed SPaG notes into eleven_plus_english_notes.json")
