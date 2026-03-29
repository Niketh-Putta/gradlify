import json

filepath = 'src/data/eleven_plus_english_notes.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_spag = [
    {
      "slug": "spag-word_classes",
      "title": "S1: Word Class Mastery",
      "level": "11+",
      "md": """## SPaG Reference: The Toolkit
*Use this technical reference to instantly classify words in the hardest grammar questions.*

**Nouns (The Architecture)**
*   **Proper:** Specific names requiring capital letters *(London, Jupiter)*.
*   **Common:** General items *(table, dog)*.
*   **Abstract:** Invisible concepts and feelings *(bravery, time, sorrow)*.
*   **Collective:** Groups of things *(a pride of lions, a flock of birds)*.

**Verbs (The Engine)**
*   **Action:** Physical or mental movements *(run, think, detonate)*.
*   **Auxiliary:** Helping verbs showing tense *(is, was, has)*.
*   **Modal:** Show necessity or possibility *(must, should, could)*.

**Adjectives & Adverbs (The Paint)**
*   **Adjectives:** Describe nouns. *(The **ferocious** wolf).*
*   **Adverbs:** Describe verbs, often ending in -ly. *(He ran **ferociously**).*

**Prepositions (The Map)**
*   Shows location or time. *(**Under** the bridge, **before** dawn).*

## 1. The Chameleon Words
In the 11+, examiners will forcefully test your ability to classify words by utilizing "Chameleon Words". These are words that completely change their grammatical class depending on where they sit in a sentence.

You cannot just memorize a word class; you must analyze the word's *job* in the sentence.

### The Swap Technique
Look at the word "fast".
*   "The *fast* runner..." (Adjective  - it describes the noun 'runner')
*   "He ran *fast*..." (Adverb  - it describes the verb 'ran')
*   "I will *fast* for a day..." (Verb  - the physical action of not eating)

Always ask yourself: "What is this word doing to its neighbor?" 

## 2. GL Official Practice Questions

**Q1 (Level: Easy)**
Which word class does 'bravery' belong to?

[QUIZ_OPTION: A] Common Noun
[QUIZ_OPTION: B] Proper Noun
[QUIZ_OPTION: C] Abstract Noun [CORRECT]
[QUIZ_OPTION: D] Collective Noun
[QUIZ_OPTION: E] Adjective

**Explanation:**
Bravery is an invisible concept or feeling. You cannot physically touch or put bravery in a box, making it an abstract noun.

---

**Q2 (Level: Medium)**
Read this sentence: *The pilot smoothly landed the massive aeroplane on the runway.*
Which word is the adverb?

[QUIZ_OPTION: A] pilot
[QUIZ_OPTION: B] smoothly [CORRECT]
[QUIZ_OPTION: C] landed
[QUIZ_OPTION: D] massive
[QUIZ_OPTION: E] runway

**Explanation:**
An adverb describes the action (how a verb is done). 'Smoothly' describes exactly how the pilot executed the landing.

---

**Q3 (Level: Hard)**
Identify the grammatical role of the word 'light' in this sentence: *Please light the fire before it gets freezing cold.*

[QUIZ_OPTION: A] Noun
[QUIZ_OPTION: B] Verb [CORRECT]
[QUIZ_OPTION: C] Adjective
[QUIZ_OPTION: D] Adverb
[QUIZ_OPTION: E] Preposition

**Explanation:**
Here, 'light' is a direct command telling someone to perform a physical action (igniting the fire), functioning squarely as a verb.

---

**Q4 (Level: Hard)**
Which sentence contains a modal verb?

[QUIZ_OPTION: A] He ran down the street quickly.
[QUIZ_OPTION: B] She is walking to the distant shop.
[QUIZ_OPTION: C] They must finish the dangerous mission by dawn. [CORRECT]
[QUIZ_OPTION: D] We have completed the homework already.
[QUIZ_OPTION: E] I bought a massive new car.

**Explanation:**
'Must' is a modal verb that dictates absolute necessity or obligation. 'Is' and 'have' are standard auxiliary verbs.

---

**Q5 (Level: Extreme)**
In the phrase *a swarm of aggressive wasps*, what grammatical class is 'swarm'?

[QUIZ_OPTION: A] Pronoun
[QUIZ_OPTION: B] Abstract Noun
[QUIZ_OPTION: C] Collective Noun [CORRECT]
[QUIZ_OPTION: D] Proper Noun
[QUIZ_OPTION: E] Plural Noun

**Explanation:**
A 'swarm' specifically identifies a massive group of flying insects, making it a Collective Noun."""
    },
    {
      "slug": "spag-punctuation_marks",
      "title": "S2: Punctuation Mastery",
      "level": "11+",
      "md": """## SPaG Reference: Punctuation Rules
*Use this visual anchor to verify punctuation hierarchies in error-correction tests.*

**The Comma ( , )**
*   Separates items in a list.
*   Separates introductory clauses/fronted adverbials. *(Before dawn, the troops attacked.)*
*   Marks non-essential extra information (parenthesis).

**The Semicolon ( ; )**
*   Connects two closely related, independent sentences without using a conjunction. 
*   *Example:* The storm tore the roof off; the family huddled in the basement.

**The Colon ( : )**
*   Acts as a gateway. Introduces a list, an explanation, or a quotation.
*   *Example:* He only needed one thing for survival: fresh water.

**The Apostrophe ( ' )**
*   **Contraction:** Shows missing letters *(Can't, Shouldn't)*.
*   **Possession:** Shows absolute ownership *(The dog's collar)*.

## 1. Controlling the Reader's Mind
Punctuation is not just grammar; it is the traffic light system of the English language. It dictates the exact speed and structure with which the reader consumes the information.

### The "Greengrocer's Apostrophe" Trap
Examiners relentlessly hunt for students who use apostrophes to make words plural. This is a fatal spelling error.

*   **Wrong:** "Fresh apple's for sale!"
*   **Right:** "Fresh apples for sale!"

You only ever deploy an apostrophe to indicate that someone owns something, or to staple two words together (do + not = don't).

### Dashes vs Hyphens
A hyphen connects compound words (mother-in-law, ice-cold). A dash introduces a sudden break in thought or an abrupt dramatic shift at the end of a sentence.

## 2. GL Official Practice Questions

**Q1 (Level: Easy)**
Which sentence uses the apostrophe flawlessly?

[QUIZ_OPTION: A] The dog's are barking loudly.
[QUIZ_OPTION: B] The girls's coats were left in the hall.
[QUIZ_OPTION: C] The cat chased its' tail.
[QUIZ_OPTION: D] The teacher's desk was covered in paper. [CORRECT]
[QUIZ_OPTION: E] Many car's were parked outside.

**Explanation:**
Option D accurately uses the apostrophe to show that the desk physically belongs to the singular teacher.

---

**Q2 (Level: Medium)**
What punctuation mark is missing from the following sentence? *To bake the cake you will need flour sugar and eggs.*

[QUIZ_OPTION: A] Semicolon
[QUIZ_OPTION: B] Comma [CORRECT]
[QUIZ_OPTION: C] Dash
[QUIZ_OPTION: D] Apostrophe
[QUIZ_OPTION: E] Question Mark

**Explanation:**
A comma is required to properly separate the items in the list (flour, sugar, and eggs).

---

**Q3 (Level: Hard)**
Which punctuation mark best completes this sentence: *The general gave a single, devastating order ....... attack.*

[QUIZ_OPTION: A] Semicolon ( ; )
[QUIZ_OPTION: B] Comma ( , )
[QUIZ_OPTION: C] Colon ( : ) [CORRECT]
[QUIZ_OPTION: D] Full Stop ( . )
[QUIZ_OPTION: E] Hyphen ( - )

**Explanation:**
A colon acts as a gateway to introduce an explanation or a dramatic singular reveal (the order to attack).

---

**Q4 (Level: Extreme)**
Examine this sentence: *The boy grabbed his heavy coat; the wind was howling aggressively outside.* why is the semicolon utilized?

[QUIZ_OPTION: A] To introduce a list of weather events.
[QUIZ_OPTION: B] Because the writer forgot the word 'and'.
[QUIZ_OPTION: C] To connect two deeply related independent sentences gracefully. [CORRECT]
[QUIZ_OPTION: D] To show ownership of the heavy coat.
[QUIZ_OPTION: E] To replace a comma.

**Explanation:**
Both sides of the semicolon are complete standalone sentences that share a common thematic link (cold weather). The semicolon elegantly grafts them together.

---

**Q5 (Level: Medium)**
Select the correctly punctuated sentence containing a fronted adverbial.

[QUIZ_OPTION: A] Underneath the rickety old bridge a nasty troll waited.
[QUIZ_OPTION: B] Underneath the rickety old bridge; a nasty troll waited.
[QUIZ_OPTION: C] Underneath the rickety old bridge, a nasty troll waited. [CORRECT]
[QUIZ_OPTION: D] Underneath the rickety old bridge: a nasty troll waited.
[QUIZ_OPTION: E] Underneath, the rickety old bridge a nasty troll waited.

**Explanation:**
When starting a sentence with a prepositional phrase showing location, you must deploy a comma right before the main clause begins."""
    },
    {
      "slug": "spag-sentence_structure",
      "title": "S3: Complex Sentence Structure",
      "level": "11+",
      "md": """## SPaG Reference: Sentence Anatomy
*Use this technical reference to dissect the 3 primary sentence architectures.*

**1. Simple Sentence**
*   One independent clause. Contains one subject and one verb.
*   *Example:* The furious storm arrived.

**2. Compound Sentence**
*   Two independent clauses joined by a coordinating conjunction (FANBOYS: For, And, Nor, But, Or, Yet, So).
*   *Example:* The storm arrived, **and** the lights flickered violently.

**3. Complex Sentence**
*   One independent main clause attached to at least one dependent subordinate clause.
*   *Example:* **Because the storm arrived**, the lights flickered violently.

## 1. Subordinate Clauses
The GL test aggressively assesses your capacity to identify dependent clauses. A subordinate clause contains a subject and a verb, but it cannot stand alone because it begins with a subordinating conjunction (Because, Although, If, When, While). 

*If it rains* is a subordinate clause. It leaves the reader hanging, demanding a main clause to finish the architectural thought (*If it rains, we will stay indoors.*)

### Fronted Adverbials
A fronted adverbial is simply a word or clause shoved to the very front of the sentence to describe the action before it even happens.

*   **Time:** *Before dawn*, the birds began to sing.
*   **Place:** *Under the bridge*, a troll waited.
*   **Manner:** *Without a sound*, the cat crept forward.

The golden rule: You must securely lock a fronted adverbial away using a comma.

## 2. GL Official Practice Questions

**Q1 (Level: Easy)**
Identify the simple sentence from the options below.

[QUIZ_OPTION: A] The heavy wind blew the roof off, and the rain poured inside.
[QUIZ_OPTION: B] Although she was utterly exhausted, she continued running the marathon.
[QUIZ_OPTION: C] The terrifying dragon roared aggressively at the approaching knights. [CORRECT]
[QUIZ_OPTION: D] Because it was getting dark, they lit the wooden torches.
[QUIZ_OPTION: E] He loved eating pizza, but he hated mushrooms.

**Explanation:**
Option C contains one single independent clause with a subject (dragon) and a verb (roared).

---

**Q2 (Level: Medium)**
Which connecting word flawlessly creates a compound sentence? *The thief ran blindingly fast, ....... the police officer was faster.*

[QUIZ_OPTION: A] because
[QUIZ_OPTION: B] although
[QUIZ_OPTION: C] but [CORRECT]
[QUIZ_OPTION: D] since
[QUIZ_OPTION: E] despite

**Explanation:**
'But' is a FANBOYS coordinating conjunction effectively linking two complete, independent thoughts to show a sharp contrast.

---

**Q3 (Level: Hard)**
Identify the subordinate clause in this sentence: *The old pirate ship sank rapidly to the bottom of the ocean because a cannonball shattered its hull.*

[QUIZ_OPTION: A] The old pirate ship sank rapidly.
[QUIZ_OPTION: B] to the bottom of the ocean.
[QUIZ_OPTION: C] because a cannonball shattered its hull. [CORRECT]
[QUIZ_OPTION: D] a cannonball shattered its hull.
[QUIZ_OPTION: E] The old pirate ship

**Explanation:**
The clause beginning with the subordinating conjunction 'because' is physically unable to stand as a complete sentence on its own.

---

**Q4 (Level: Hard)**
Which sentence accurately contains a fronted adverbial of Time?

[QUIZ_OPTION: A] Bravely, the knight drew his heavy iron sword.
[QUIZ_OPTION: B] Above the clouds, the aeroplane soared smoothly.
[QUIZ_OPTION: C] During the brutal winter storm, the wolves stayed perfectly hidden. [CORRECT]
[QUIZ_OPTION: D] Quietly, she closed the heavy oak door.
[QUIZ_OPTION: E] The wolves stayed perfectly hidden during the brilliant storm.

**Explanation:**
Option C begins with a phrase denoting 'when' an action happened, and finishes it cleanly with a comma.

---

**Q5 (Level: Extreme)**
Which option constitutes a Fragment (an incomplete sentence)?

[QUIZ_OPTION: A] Run away.
[QUIZ_OPTION: B] The massive tree crashed loudly.
[QUIZ_OPTION: C] Even though the sun was shining brightly in the sky. [CORRECT]
[QUIZ_OPTION: D] He stopped.
[QUIZ_OPTION: E] Stop it right now.

**Explanation:**
Option C begins with 'Even though' (a subordinating conjunction), forcing it into being a dependent clause that leaves the reader permanently hanging for a conclusion."""
    },
    {
      "slug": "spag-spelling_rules",
      "title": "S4: Core Spelling Rules",
      "level": "11+",
      "md": """## SPaG Reference: The Spelling Vault
*Use this technical database to avoid common 11+ spelling traps.*

**1. 'I' before 'E' except after 'C'**
*   This classic rule applies when the sound is a long 'ee'.
*   *Normal:* Believe, Relief, Retrieve
*   *After C:* Receive, Ceiling, Deceit
*   *Traps (Exceptions):* Science, Weird, Protein

**2. The Double Consonant Rule**
*   If a word ends in a single vowel and a single consonant, and you are adding a suffix that begins with a vowel, you must double the final consonant.
*   *Run + ing* = Running (not runing)
*   *Big + est* = Biggest (not bigest)

**3. Dropping the 'E'**
*   If a root word ends in a silent 'e' and you add a suffix starting with a vowel, drop the 'e'.
*   *Make + ing* = Making
*   *Hope + ed* = Hoped

## 1. The Logic of English Spelling
English spelling often seems agonizingly random, but 80% of words follow strict, established patterns. Examiners will heavily target the 20% that break the rules.

### Dealing with 'Y' Endings
When a root word terminates in a consonant followed by a 'y', that 'y' turns into an 'i' when you attach almost any suffix (except -ing).

*   *Happy + ness* = Happiness
*   *Carry + ed* = Carried
*   *Play + ed* = Played (The 'y' stays because 'a' is a vowel, not a consonant!)

### Silent Assassins
Watch out for "silent guests" hiding within root words.
*   The invisible 'k' in *Knee* or *Knight*.
*   The hidden 'w' in *Sword* or *Wrestle*.
*   The trailing 'b' in *Comb* or *Dumb*.

## 2. GL Official Practice Questions

**Q1 (Level: Easy)**
Which word is spelled incorrectly?

[QUIZ_OPTION: A] Belief
[QUIZ_OPTION: B] Receive
[QUIZ_OPTION: C] Ceiling
[QUIZ_OPTION: D] Cheif [CORRECT]
[QUIZ_OPTION: E] Relief

**Explanation:**
The word is Chief. It follows the 'I before E' rule because there is no 'C' immediately preceding it.

---

**Q2 (Level: Medium)**
Apply the suffix '-ing' to the word **stop**.

[QUIZ_OPTION: A] stoping
[QUIZ_OPTION: B] stopping [CORRECT]
[QUIZ_OPTION: C] stoppeing
[QUIZ_OPTION: D] stopeing
[QUIZ_OPTION: E] stoped

**Explanation:**
Stop ends with a single vowel ('o') and single consonant ('p'). You must heavily double the 'p' before adding the suffix.

---

**Q3 (Level: Medium)**
What is the correct spelling when you add '-ed' to the word **worry**?

[QUIZ_OPTION: A] worryed
[QUIZ_OPTION: B] worreyed
[QUIZ_OPTION: C] worried [CORRECT]
[QUIZ_OPTION: D] worryd
[QUIZ_OPTION: E] woried

**Explanation:**
Because worry ends with a consonant ('r') followed by a 'y', the 'y' rigidly morphs into an 'i'.

---

**Q4 (Level: Hard)**
Which option completely disobeys the 'I before E' rule?

[QUIZ_OPTION: A] Piece
[QUIZ_OPTION: B] Field
[QUIZ_OPTION: C] Weird [CORRECT]
[QUIZ_OPTION: D] Shield
[QUIZ_OPTION: E] Grief

**Explanation:**
'Weird' is one of the most famous rogue words in the English language. It totally breaks the standard rule, which is heavily tested in the 11+.

---

**Q5 (Level: Extreme)**
Examine the word **argue**. What happens when you aggressively apply the suffix **-ment**?

[QUIZ_OPTION: A] The word becomes arguement.
[QUIZ_OPTION: B] The 'e' is traditionally dropped: argument. [CORRECT]
[QUIZ_OPTION: C] You double the 'e': argueement.
[QUIZ_OPTION: D] The 'u' vanishes: argment.
[QUIZ_OPTION: E] It splits into two words: argue ment.

**Explanation:**
Argue is an exception spelling. Most words keep the 'e' when adding a suffix starting with a consonant (manage -> management), but 'argue' strictly drops it."""
    },
    {
      "slug": "spag-active_passive",
      "title": "S5: Active vs Passive Voice",
      "level": "11+",
      "md": """## SPaG Reference: The Voice Switch
*Use this technical module to deeply understand how to shift narrative focus by swapping sentence voices.*

**The Active Voice (Direct & Energetic)**
*   The **Subject** aggressively performs the action on the **Object**.
*   *Example:* The vicious dragon (*Subject*) guarded (*Verb*) the gold (*Object*).
*   *Purpose:* Used for clear, fast-paced action storytelling.

**The Passive Voice (Formal & Objective)**
*   The **Object** is moved to the front and the action happens *to* it.
*   *Example:* The gold (*Object*) was guarded (*Verb*) by the vicious dragon.
*   *Purpose:* Used for formal reporting, scientific facts, or mysterious evasion.

## 1. The Subject-Object Flip
Switching voice is essentially just swapping the person doing the action with the thing receiving the action. 

If the sentence is *"The chef baked the cake"*:
1. Locate the Object (the cake).
2. Throw it to the front of the sentence.
3. Add a helping verb ("was").
4. The resulting Passive sentence gives you: *"The cake was baked by the chef."*

### Why Use the Passive Voice?
Examiners test passive voice to see if you understand tone.
Passive voice is brilliant for hiding blame. If a child shatters a window, instead of actively admitting *"I shattered the window"*, they can passively claim *"The window was shattered."* It completely deletes the actor from the crime!

## 2. GL Official Practice Questions

**Q1 (Level: Easy)**
Identify the sentence written in the Active Voice.

[QUIZ_OPTION: A] The expensive vase was smashed by the cat.
[QUIZ_OPTION: B] The heavy car was driven rapidly.
[QUIZ_OPTION: C] The cat smashed the expensive vase. [CORRECT]
[QUIZ_OPTION: D] The homework was completed by the student.
[QUIZ_OPTION: E] The song was enthusiastically sung by the choir.

**Explanation:**
Option C features the subject (cat) actively performing the strong verb (smashed) upon the object (vase).

---

**Q2 (Level: Medium)**
Change this active sentence into the passive voice: *The police officer chased the robber down the dark street.*

[QUIZ_OPTION: A] The robber chased the police officer down the dark street.
[QUIZ_OPTION: B] The robber was chased by the police officer down the dark street. [CORRECT]
[QUIZ_OPTION: C] The police officer was chasing the robber.
[QUIZ_OPTION: D] The dark street was guarded by the police officer.
[QUIZ_OPTION: E] The officer chased the running robber away.

**Explanation:**
You must isolate the object (robber) and throw it to the front. 

---

**Q3 (Level: Hard)**
Which of these sentences is in the Passive Voice but completely hides who did the action?

[QUIZ_OPTION: A] The old bridge was built by the Roman army.
[QUIZ_OPTION: B] The furious headteacher cancelled the exam.
[QUIZ_OPTION: C] The secret documents were completely destroyed in the fire. [CORRECT]
[QUIZ_OPTION: D] A wild bear attacked the campsite.
[QUIZ_OPTION: E] The red team won the chaotic match.

**Explanation:**
Option C is passive (the documents received the destruction), but it cleverly never names the human who actually lit the fire.

---

**Q4 (Level: Hard)**
Look at this sentence: *The magnificent sandcastle was thoroughly crushed by the incoming tide.* Who or what is the 'Actor' (doing the action)?

[QUIZ_OPTION: A] The magnificent sandcastle
[QUIZ_OPTION: B] The incoming tide [CORRECT]
[QUIZ_OPTION: C] The person who built it
[QUIZ_OPTION: D] The heavy crushing
[QUIZ_OPTION: E] The ocean fish

**Explanation:**
The tide is the physical force performing the crushing action, even though it is buried at the end of the passive sentence structure.

---

**Q5 (Level: Extreme)**
When writing a formal scientific lab report, why should a student primarily use the Passive Voice?

[QUIZ_OPTION: A] Because it guarantees the sentences are shorter and heavily punched in.
[QUIZ_OPTION: B] Because science words are inherently difficult to spell actively.
[QUIZ_OPTION: C] To decisively focus all attention on the experiment and results, rather than the person performing the test. [CORRECT]
[QUIZ_OPTION: D] To make the report sound incredibly emotional and fictional.
[QUIZ_OPTION: E] Because the active voice is strictly forbidden in schools.

**Explanation:**
Instead of saying "I heated the chemical" (Active), scientists say "The chemical was heated" (Passive) to keep the strict scientific focus purely on the objective facts."""
    }
]

data["SPaG"] = new_spag

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Injected strictly formatted split-pane premium SPaG notes!")
