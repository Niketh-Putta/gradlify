import json

def expand_spag_questions():
    file_path = 'src/data/eleven_plus_english_notes.json'
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Dictionary of additional questions for each SPaG topic
    extra_questions = {
        "spag-word_classes": [
            """
**Q3 (Level: Medium)**
Identify the **preposition** in this sentence: *The dog ran quickly through the open gate.*

[QUIZ_OPTION: A] dog
[QUIZ_OPTION: B] ran
[QUIZ_OPTION: C] quickly
[QUIZ_OPTION: D] through [CORRECT]
[QUIZ_OPTION: E] open

**Explanation:**
'Through' shows the relationship between the dog's movement and the gate. Prepositions often show where or when something happens.

---

**Q4 (Level: Hard)**
Which word in the following sentence is an **abstract noun**? *He showed great courage during the difficult exam.*

[QUIZ_OPTION: A] showed
[QUIZ_OPTION: B] great
[QUIZ_OPTION: C] courage [CORRECT]
[QUIZ_OPTION: D] difficult
[QUIZ_OPTION: E] exam

**Explanation:**
An abstract noun is a thing you cannot touch, like a feeling or a quality. 'Courage' is a quality, making it an abstract noun.

---

**Q5 (Level: Hard)**
Identify the **pronoun** in this sentence: *The teacher told us that the books were finally ready.*

[QUIZ_OPTION: A] teacher
[QUIZ_OPTION: B] told
[QUIZ_OPTION: C] us [CORRECT]
[QUIZ_OPTION: D] books
[QUIZ_OPTION: E] finally

**Explanation:**
'Us' replaces the names of the people the teacher is speaking to, making it a pronoun.
""",
        ],
        "spag-punctuation_marks": [
            """
**Q3 (Level: Hard)**
Which sentence requires a **colon** to be added?

[QUIZ_OPTION: A] I have three favorite colors red blue and green. [CORRECT]
[QUIZ_OPTION: B] The cat sat on the mat.
[QUIZ_OPTION: C] Running is fun but it is also tiring.
[QUIZ_OPTION: D] Because it was raining I took my umbrella.
[QUIZ_OPTION: E] What time does the train leave?

**Explanation:**
A colon should be used to introduce the list of colors: "I have three favorite colors: red, blue and green."

---

**Q4 (Level: Hard)**
Identify the correct use of the **apostrophe for possession**.

[QUIZ_OPTION: A] The boy's are playing football.
[QUIZ_OPTION: B] The cat's tail was twitching. [CORRECT]
[QUIZ_OPTION: C] Its' raining outside today.
[QUIZ_OPTION: D] I have two dog's.
[QUIZ_OPTION: E] Her's was the red car.

**Explanation:**
'Cat's tail' correctly shows that the tail belongs to the cat. Option A and D are plural, not possessive. Option C should be 'It's' (contraction).

---

**Q5 (Level: Extreme)**
Where should the **hyphens** be placed in this sentence? *The well known actor gave an ice cold stare.*

[QUIZ_OPTION: A] well-known / ice-cold [CORRECT]
[QUIZ_OPTION: B] well known-actor / ice cold
[QUIZ_OPTION: C] well-known actor / ice cold-stare
[QUIZ_OPTION: D] well known / ice-cold stare
[QUIZ_OPTION: E] no hyphens needed

**Explanation:**
Hyphens are used to join two words that act as a single adjective before a noun. 'Well-known' describes the actor, and 'ice-cold' describes the stare.
""",
        ],
        "spag-sentence_structure": [
            """
**Q3 (Level: Hard)**
Which of these is a **relative clause**?

[QUIZ_OPTION: A] Because it was late
[QUIZ_OPTION: B] While he was sleeping
[QUIZ_OPTION: C] who was wearing a red hat [CORRECT]
[QUIZ_OPTION: D] If you are ready
[QUIZ_OPTION: E] Since the weather is nice

**Explanation:**
Relative clauses start with relative pronouns like 'who', 'which', or 'that' and describe a noun.

---

**Q4 (Level: Hard)**
Turn these two simple sentences into a **compound sentence** using a conjunction: *The rain stopped. The sun came out.*

[QUIZ_OPTION: A] The rain stopped because the sun came out.
[QUIZ_OPTION: B] The rain stopped, and the sun came out. [CORRECT]
[QUIZ_OPTION: C] When the rain stopped the sun came out.
[QUIZ_OPTION: D] The rain stopped; the sun came out.
[QUIZ_OPTION: E] The rain stopped after the sun came out.

**Explanation:**
Option B uses the conjunction 'and' to join two independent clauses, forming a compound sentence.

---

**Q5 (Level: Extreme)**
Identify the **main clause** in this complex sentence: *Although the mountain was steep, the hikers reached the summit before dusk.*

[QUIZ_OPTION: A] Although the mountain was steep
[QUIZ_OPTION: B] the mountain was steep
[QUIZ_OPTION: C] the hikers reached the summit [CORRECT]
[QUIZ_OPTION: D] before dusk
[QUIZ_OPTION: E] reached the summit before dusk

**Explanation:**
The main clause is the part of the sentence that makes sense on its own: "The hikers reached the summit."
""",
        ],
        "spag-spelling_rules": [
            """
**Q3 (Level: Medium)**
Which suffix correctly turns the verb 'create' into a **noun**?

[QUIZ_OPTION: A] -sion
[QUIZ_OPTION: B] -tion [CORRECT]
[QUIZ_OPTION: C] -ing
[QUIZ_OPTION: D] -ed
[QUIZ_OPTION: E] -ous

**Explanation:**
'Creation' is the noun form of 'create'. The suffix '-tion' is the most common way to form these nouns.

---

**Q4 (Level: Hard)**
Identify the correctly spelled word that contains a **silent letter**.

[QUIZ_OPTION: A] Coluumn
[QUIZ_OPTION: B] Column [CORRECT]
[QUIZ_OPTION: C] Colum
[QUIZ_OPTION: D] Columne
[QUIZ_OPTION: E] Collum

**Explanation:**
'Column' has a silent 'n' at the end. Spelling these silent letters correctly is a key part of the 11+ test.

---

**Q5 (Level: Hard)**
Choose the correctly spelled word that follows the **doubling consonant rule**.

[QUIZ_OPTION: A] Begining
[QUIZ_OPTION: B] Beginning [CORRECT]
[QUIZ_OPTION: C] Begginning
[QUIZ_OPTION: D] Begining
[QUIZ_OPTION: E] Begging

**Explanation:**
When a word ends in a single vowel and a single consonant and the stress is on the last syllable (be-GIN), you double the consonant before adding -ing.
""",
        ],
        "spag-active_passive": [
            """
**Q3 (Level: Hard)**
Identify the **active** version of this passive sentence: *The window was broken by the ball.*

[QUIZ_OPTION: A] The ball broke the window. [CORRECT]
[QUIZ_OPTION: B] The ball was breaking the window.
[QUIZ_OPTION: C] The window is broken by the ball.
[QUIZ_OPTION: D] Breaking the window was the ball.
[QUIZ_OPTION: E] The ball has broken the window.

**Explanation:**
To make it active, make 'the ball' the subject that performs the action 'broke' on the object 'the window'.

---

**Q4 (Level: Hard)**
Which sentence uses the **active voice**?

[QUIZ_OPTION: A] The cake was eaten by the children.
[QUIZ_OPTION: B] The children ate the cake. [CORRECT]
[QUIZ_OPTION: C] The cake is being eaten.
[QUIZ_OPTION: D] The children were eating.
[QUIZ_OPTION: E] It was eaten.

**Explanation:**
Option B is active because the subject (the children) is performing the action (ate).

---

**Q5 (Level: Extreme)**
Identify why an author might choose to use the **passive voice** in a science report.

[QUIZ_OPTION: A] To make it sound more exciting.
[QUIZ_OPTION: B] To focus on the results of the experiment rather than the person who did it. [CORRECT]
[QUIZ_OPTION: C] Because they don't know who did the action.
[QUIZ_OPTION: D] To make the sentence shorter.
[QUIZ_OPTION: E] Because they are lazy.

**Explanation:**
The passive voice is often used in formal writing, like science reports, to create an objective tone by focusing on the object of the study rather than the researcher.
""",
        ],
    }

    # Append the extra questions to the markdown for each topic
    for topic_slug, questions in extra_questions.items():
        found = False
        for topic in data.get("SPaG", []):
            if topic["slug"] == topic_slug:
                for q in questions:
                    topic["md"] += f"\n---\n{q}"
                found = True
                break
    
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    expand_spag_questions()
    print("Expanded SPaG questions with more examples across all topics.")
