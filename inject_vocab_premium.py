import json
import re

filepath = 'src/data/eleven_plus_english_notes.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_advanced_vocabulary = [
    {
      "slug": "vocabulary-synonyms",
      "title": "V1: Mastering Synonyms",
      "level": "11+",
      "md": """## Vocabulary Reference: Synonyms
*Use this targeted word bank to help you answer the practice questions below.*

**Abundant** ➔ **Plentiful**
*Meaning:* Existing in very large quantities; clearly more than enough.
*Example:* The rainforest has an abundant supply of fresh water.

**Diligent** ➔ **Hardworking**
*Meaning:* Showing persistent care and strong effort in one's duties.
*Example:* The diligent student spent hours checking her answers.

**Conceal** ➔ **Hide**
*Meaning:* To deliberately keep something secret or entirely out of sight.
*Example:* He tried to conceal the stolen jewels inside his coat.

**Meticulous** ➔ **Precise**
*Meaning:* Showing immense attention to tiny details; extremely careful.
*Example:* The artist was meticulous when painting the tiny eyelashes.

**Courageous** ➔ **Brave**
*Meaning:* Not deterred by severe danger or deep pain; truly heroic.
*Example:* The courageous firefighter ran straight into the blazing building.

## 1. Using The Right Tool
Synonyms are words that mean almost exactly the same thing. In the 11+ exams, knowing basic synonyms isn't enough; you need to precisely know which synonym fits best in a specific sentence string. 

For example, 'huge' and 'colossal' are synonyms, but you wouldn't say "I ate a colossal slice of cake." You must match the word to the tone and scale of the sentence.

### The Direct Replacement Trick
When a question asks you to find a synonym for a word in a specific sentence, try the Direct Replacement Trick.

1. Cross out the tricky word in your mind.
2. Take each of the A-E options and place them into the blank space.
3. Read the sentence quietly out loud in your head. 

The correct synonym is the one that flawlessly keeps the original meaning without twisting the sentence grammar.

## 2. Common Mistakes
Many students fall for the trap of choosing an antonym (an opposite word) by mistake! If the question asks for a synonym, immediately pause and remind yourself: "I am looking for the EXACT same meaning."

Also, watch out for words that are simply related but not synonyms. An 'oven' and a 'microwave' are both for cooking, but they are not synonyms. They are completely different machines!

## 3. GL Practice Questions

**Q1 (Level: Easy)**
Choose the closest synonym for the word **brave**.

[QUIZ_OPTION: A] terrified
[QUIZ_OPTION: B] strong
[QUIZ_OPTION: C] courageous [CORRECT]
[QUIZ_OPTION: D] loud
[QUIZ_OPTION: E] foolish

**Explanation:**
Courageous means showing great bravery in the face of fear. 'Strong' is related, but you can be physically strong without being brave at all.

---

**Q2 (Level: Medium)**
Identify the best synonym for the word **conceal** in this sentence: *The spy had to conceal his secret documents in his shoe.*

[QUIZ_OPTION: A] reveal
[QUIZ_OPTION: B] hide [CORRECT]
[QUIZ_OPTION: C] protect
[QUIZ_OPTION: D] steal
[QUIZ_OPTION: E] carry

**Explanation:**
If you use the Direct Replacement Trick, saying "hide his secret documents" makes perfect sense and preserves exactly the same meaning.

---

**Q3 (Level: Medium)**
Choose the truest synonym for **abundant**.

[QUIZ_OPTION: A] empty
[QUIZ_OPTION: B] heavy
[QUIZ_OPTION: C] scarce
[QUIZ_OPTION: D] plentiful [CORRECT]
[QUIZ_OPTION: E] strange

**Explanation:**
Abundant means having a massive amount of something. Plentiful has the exact same meaning.

---

**Q4 (Level: Hard)**
Which of these words is a synonym for **diligent**?

[QUIZ_OPTION: A] lazy
[QUIZ_OPTION: B] angry
[QUIZ_OPTION: C] hardworking [CORRECT]
[QUIZ_OPTION: D] intelligent
[QUIZ_OPTION: E] confused

**Explanation:**
A diligent person always puts massive effort and care into their work, which perfectly matches hardworking. Remember it using the noun 'diligence'.

---

**Q5 (Level: Extreme)**
Find a synonym for the word **meticulous**.

[QUIZ_OPTION: A] messy
[QUIZ_OPTION: B] precise [CORRECT]
[QUIZ_OPTION: C] fast
[QUIZ_OPTION: D] gigantic
[QUIZ_OPTION: E] clumsy

**Explanation:**
Meticulous means showing huge attention to tiny details and ensuring accuracy. A person who is meticulous is incredibly precise and careful."""
    },
    {
      "slug": "vocabulary-antonyms",
      "title": "V2: Mastering Antonyms",
      "level": "11+",
      "md": """## Vocabulary Reference: Antonyms
*Use this targeted word bank to deeply understand opposing words. Notice how prefixes often instantly create a perfect opposite.*

**Ascend** ↔ **Descend**
*Meaning:* To climb upwards / To go downwards.
*Example:* The hot air balloon began to ascend into the clouds.

**Permanent** ↔ **Temporary**
*Meaning:* Lasting forever / Lasting for only a short passing time.
*Example:* A tattoo is permanent, but a sticker is temporary.

**Reckless** ↔ **Cautious**
*Meaning:* Acting without thinking of the danger / Acting with great care.
*Example:* The reckless driver sped through the red light.

**Expand** ↔ **Contract**
*Meaning:* To grow larger and wider / To shrink and pull inward.
*Example:* Metal pipes expand in the heavy heat of summer.

**Obscure** ↔ **Obvious**
*Meaning:* Unclear, hidden, or unknown / Extremely clear and easy to see.
*Example:* The ancient ruins were hidden in an obscure location.

## 1. Spotting Opposites
Antonyms are words with totally opposite meanings. The word 'hot' is a flawless antonym of 'cold'. The 11+ test will push your vocabulary by using highly advanced nouns and verbs, forcing you to think very carefully about what an opposite actually is.

### The Prefix Reversal
Many antonyms are created by simply attaching negative prefixes to the front of a base word. 

If you know the word 'believe', you intuitively know the antonym is 'disbelieve'. Notice how 'dis-' completely flipped the meaning backwards.

Always scan the answer list for common negative prefixes like **un-**, **in-**, **im-**, **ir-**, **dis-**, and **non-**. If you are totally stuck on a difficult question, check to see if an option simply adds a reverser prefix to the target word!

## 2. Exam Tips
Always read the question brief carefully! When a question dictates "Choose the word most opposite in meaning", examiners notoriously put an exact synonym as Option A. If you scan the test too quickly, your brain will see Option A matches the target word, and you will circle it—entirely forgetting that you were hunting for an antonym!

## 3. Practice Questions

**Q1 (Level: Easy)**
Choose the most accurate antonym for the word **ascend**.

[QUIZ_OPTION: A] climb
[QUIZ_OPTION: B] jump
[QUIZ_OPTION: C] descend [CORRECT]
[QUIZ_OPTION: D] fall
[QUIZ_OPTION: E] walk

**Explanation:**
To ascend means to go up stairs or a mountain. To descend means to go steadily downwards.

---

**Q2 (Level: Medium)**
Identify the antonym for the word **permanent**.

[QUIZ_OPTION: A] forever
[QUIZ_OPTION: B] broken
[QUIZ_OPTION: C] temporary [CORRECT]
[QUIZ_OPTION: D] solid
[QUIZ_OPTION: E] strong

**Explanation:**
Permanent means an installation lasting forever. Temporary means a state that only lasts for a short passing amount of time.

---

**Q3 (Level: Medium)**
What is the antonym of the word **reckless**?

[QUIZ_OPTION: A] careful [CORRECT]
[QUIZ_OPTION: D] stupid
[QUIZ_OPTION: B] dangerous
[QUIZ_OPTION: E] wild
[QUIZ_OPTION: C] angry

**Explanation:**
A reckless person does dangerous things without thinking about safety. The absolute opposite of that behavior is being very careful and cautious.

---

**Q4 (Level: Hard)**
Which word provides the best antonym for **expand** in this sentence: *The cold weather caused the metal pipes to .......*

[QUIZ_OPTION: A] freeze
[QUIZ_OPTION: B] contract [CORRECT]
[QUIZ_OPTION: C] crack
[QUIZ_OPTION: D] grow
[QUIZ_OPTION: E] melt

**Explanation:**
Expand means to grow bigger and wider. The opposite action is to shrink and pull inwards, which is exactly what contract means.

---

**Q5 (Level: Extreme)**
Find an antonym for the word **obscure**.

[QUIZ_OPTION: A] hidden
[QUIZ_OPTION: B] blurry
[QUIZ_OPTION: C] dark
[QUIZ_OPTION: D] obvious [CORRECT]
[QUIZ_OPTION: E] famous

**Explanation:**
Obscure means something that is very hard to see, confusing, or generally unknown. The direct opposite is something that is glaringly obvious and universally easy to spot."""
    },
    {
      "slug": "vocabulary-homophones",
      "title": "V3: Tricky Homophones",
      "level": "11+",
      "md": """## Vocabulary Reference: Homophones
*Use this targeted word bank to master the most dangerous spelling traps. These word pairs sound identical but mean wildly different things.*

**There / Their / They're**
*   **There:** Refers to a physical place. *(The dog is over there.)*
*   **Their:** Shows absolute ownership. *(That is their red car.)*
*   **They're:** Contraction of "They are". *(They're going to the cinema.)*

**Through / Threw**
*   **Through:** Moving inside and passing out the other side. *(Walking through a door.)*
*   **Threw:** The past tense of forcefully tossing. *(He threw the heavy ball.)*

**Hare / Hair**
*   **Hare:** A very fast, long-eared wild animal. *(The hare ran across the field.)*
*   **Hair:** The follicles that grow physically on your head. *(She brushed her hair.)*

**Buy / By**
*   **Buy:** To purchase an item using money. *(I will buy a new book.)*
*   **By:** Indicating position next to something. *(He sat by the fireplace.)*

## 1. Soundalikes that Trick You
Homophones are words that sound perfectly identical when spoken out loud, but have entirely different spellings and diverse meanings. They are the ultimate trap for students who rush.

### The Classic Trio trap
The most commonly tested homophones in the entire 11+ syllabus are the Trio: There, Their, and They're. You must lock down exactly which spelling matches the sentence context. The examiners will attempt to confuse you by placing them in tricky sentence structures.

## 2. Common Mistakes
Do not rely on the "reading out loud" trick! Because homophones sound completely identical, reading them aloud in your head will not help you spot the incorrect spelling. 

You must be deeply strict about checking exactly what spelling is printed on the page, and analyzing if it fits the grammar rules of the sentence. 

## 3. Practice Questions

**Q1 (Level: Easy)**
Which form of there/their/they're fits best in this gap: *The students forgot to bring ....... homework to class.*

[QUIZ_OPTION: A] there
[QUIZ_OPTION: B] their [CORRECT]
[QUIZ_OPTION: C] they're
[QUIZ_OPTION: D] the're
[QUIZ_OPTION: E] ther

**Explanation:**
The homework physically belongs to the students, which means you must use 'their' to properly show possession and ownership.

---

**Q2 (Level: Medium)**
Identify the correct homophone for the sentence: *The knight rode his horse completely ....... the dark forest.*

[QUIZ_OPTION: A] threw
[QUIZ_OPTION: B] thru
[QUIZ_OPTION: C] through [CORRECT]
[QUIZ_OPTION: D] thorough
[QUIZ_OPTION: E] though

**Explanation:**
'Through' refers to moving inside and past a location. 'Threw' is the past tense action of tossing an object.

---

**Q3 (Level: Medium)**
Which word correctly completes this sentence: *The dog wagged ....... tail wildly when its owner returned.*

[QUIZ_OPTION: A] its [CORRECT]
[QUIZ_OPTION: B] it's
[QUIZ_OPTION: C] its'
[QUIZ_OPTION: D] ites
[QUIZ_OPTION: E] it

**Explanation:**
'Its' (without the apostrophe) strictly shows ownership belonging to the dog. 'It's' with an apostrophe translates to 'It is'. You wouldn't logically say "The dog wagged It Is tail".

---

**Q4 (Level: Hard)**
Select the sentence that uses a homophone incorrectly.

[QUIZ_OPTION: A] I read the entire book from cover to cover.
[QUIZ_OPTION: B] She wore a beautiful red jumper to the winter party.
[QUIZ_OPTION: C] The heavy wind blew the roof off the little wooden shed.
[QUIZ_OPTION: D] I need to by some fresh milk from the little corner shop. [CORRECT]
[QUIZ_OPTION: E] He knew exactly what the right answer was.

**Explanation:**
Option D mistakenly uses 'by' (such as standing by a wall) instead of 'buy' (using currency to purchase an item).

---

**Q5 (Level: Extreme)**
Identify the correctly spelled homophone pair used in this sentence: *The ....... ran wildly across the grassy field, hoping the hunter wouldn't see his ....... brown coat.*

[QUIZ_OPTION: A] hare / hair [CORRECT]
[QUIZ_OPTION: B] hair / hare
[QUIZ_OPTION: C] hare / hare
[QUIZ_OPTION: D] hair / hair
[QUIZ_OPTION: E] hear / hare

**Explanation:**
A 'hare' is an animal similar to a large wild rabbit. 'Hair' is the fur covering its physical coat. Getting these mixed up completely destroys the logic of the sentence."""
    },
    {
      "slug": "vocabulary-prefixes",
      "title": "V4: Prefix Power",
      "level": "11+",
      "md": """## Vocabulary Reference: Prefixes
*Use this targeted word bank to master prefixes. A prefix is a modifier attached to the front of a word that radically alters its definition.*

**Pre-** (Before)
*Use:* Preview, Prehistoric, Predict
*Meaning:* Occurring beforehand in time or order.

**Un- / Dis-** (Reverse or Opposite)
*Use:* Unhappy, Disagree, Disappear
*Meaning:* Flips the word into its negative or opposite state.

**Mis-** (Wrongly or Badly)
*Use:* Misbehave, Misspell, Misunderstand
*Meaning:* An action that has been done incorrectly or poorly.

**Trans-** (Across or Beyond)
*Use:* Transatlantic, Transform, Transport
*Meaning:* Moving clearly across a boundary or physically changing state.

**Sub-** (Under or Below)
*Use:* Submarine, Subway, Submerge
*Meaning:* Located directly underneath or below a surface.

## 1. Changing the Front
A prefix is a small chunk of letters attached to the very beginning of a root word. Doing this completely alters the central meaning of the word.

### Reversing and Undoing
The most powerful prefixes in your toolkit are the 'Reversers'. 

Adding 'un-' (unhappy, unfair), 'dis-' (disagree, disappear), or 'il-' (illegal, illogical) usually turns a normally positive word into exactly the opposite.

If you see an incredibly long, terrifying word in your 11+ test, check to see if it starts with 'un' or 'dis'. If you cover up that prefix with your thumb, the core word hiding underneath normally makes perfect sense!

## 2. Exam Tips
Pay close attention to double letters! When adding the prefix **dis-** to the word **satisfy**, you drop it directly onto the front to make **dissatisfy** (two S's!). Never take away a letter from the original root word; just add the prefix squarely onto the front.

## 3. Practice Questions

**Q1 (Level: Easy)**
Which prefix can be added to the word **behave** to show that someone is acting badly?

[QUIZ_OPTION: A] un-
[QUIZ_OPTION: B] dis-
[QUIZ_OPTION: C] mis- [CORRECT]
[QUIZ_OPTION: D] re-
[QUIZ_OPTION: E] pre-

**Explanation:**
Adding 'mis-' creates 'misbehave', which simply means to behave badly or incorrectly.

---

**Q2 (Level: Medium)**
What does the prefix **pre-** literally mean in the words 'preview' or 'prehistoric'?

[QUIZ_OPTION: A] after
[QUIZ_OPTION: B] middle
[QUIZ_OPTION: C] against
[QUIZ_OPTION: D] before [CORRECT]
[QUIZ_OPTION: E] again

**Explanation:**
The prefix 'pre-' always means before. A preview means seeing a film before it is released, and prehistoric means before written history.

---

**Q3 (Level: Medium)**
Add the correct negative prefix to the word **logical**.

[QUIZ_OPTION: A] unlogical
[QUIZ_OPTION: B] illogical [CORRECT]
[QUIZ_OPTION: C] dislogical
[QUIZ_OPTION: D] nonlogical
[QUIZ_OPTION: E] irlogical

**Explanation:**
Words starting with the letter 'L' generally take the specialized prefix 'il-' to formulate their opposite, creating 'illogical'.

---

**Q4 (Level: Hard)**
If the prefix **auto-** means self, what does an 'autograph' literally translate to?

[QUIZ_OPTION: A] A photograph of yourself.
[QUIZ_OPTION: B] A fast sports car.
[QUIZ_OPTION: C] A machine that writes on a graph.
[QUIZ_OPTION: D] Writing done by a person's own hand. [CORRECT]
[QUIZ_OPTION: E] Driving a car to the shops.

**Explanation:**
'Auto' means self, and 'graph' historically relates to writing. Writing by yourself creates an autograph (your personal signature).

---

**Q5 (Level: Extreme)**
Which prefix specifically means 'across' or 'beyond'? For example, an ocean flight connecting London and New York is called .......atlantic.

[QUIZ_OPTION: A] inter-
[QUIZ_OPTION: B] sub-
[QUIZ_OPTION: C] trans- [CORRECT]
[QUIZ_OPTION: D] super-
[QUIZ_OPTION: E] anti-

**Explanation:**
'Trans' denotes moving completely across a gap or changing across forms. Translating across an ocean is transatlantic, and fundamentally changing a shape is transforming."""
    },
    {
      "slug": "vocabulary-suffixes",
      "title": "V5: Suffix Secrets",
      "level": "11+",
      "md": """## Vocabulary Reference: Suffixes
*Use this targeted word bank to master suffixes. Suffixes strongly alter what exact type of word is being used (Noun, Verb, Adjective).*

**-able / -ible** (Capable of being)
*Use:* Washable, Accessible, Visible
*Meaning:* Can be successfully done. Washable means it can be washed safely.

**-less** (Without)
*Use:* Careless, Fearless, Endless
*Meaning:* Completely lacking or without something. Fearless means without fear.

**-ful** (Filled with)
*Use:* Beautiful, Hopeful, Joyful
*Meaning:* Entirely full of a specific quality or emotion.

**-ly** (How something is done)
*Use:* Quickly, Happily, Silently
*Meaning:* Converts an adjective into an adverb, detailing the manner in which an action happens.

**-ment** (Action or state)
*Use:* Excitement, Payment, Enjoyment
*Meaning:* Converts an action verb neatly into a noun representing the result of that action.

## 1. Changing the Tail
A suffix is a string of letters added to the very end of a word. Unlike prefixes (which change the meaning of a word), a suffix usually changes the *type* of word it acts as in a sentence.

### Turning Verbs into Adjectives
You can change an action word (verb) into a describing word (adjective) by snapping a suffix right onto the tail end of it.

For example, take the verb 'comfort' (I will comfort the boy).
If you add the suffix '-able', it transforms magically into the adjective 'comfortable' (He sat on the comfortable sofa).

## 2. Common Mistakes
Always watch out for sneaky spelling changes! If a root word ends in the letter 'y' (like heavily relying on someone), and you want to add a suffix, you often have to drop the 'y' and swap it for an 'i'. 

*Example:* Rely + able = Reliable. 
*Example:* Beauty + ful = Beautiful.

## 3. Practice Questions

**Q1 (Level: Easy)**
Which suffix should you add to the word **care** to properly show that a person is acting completely without thought or caution?

[QUIZ_OPTION: A] -ful
[QUIZ_OPTION: B] -ment
[QUIZ_OPTION: C] -less [CORRECT]
[QUIZ_OPTION: D] -ly
[QUIZ_OPTION: E] -able

**Explanation:**
The suffix '-less' dictates being without something. Being completely without care means you are acting careless.

---

**Q2 (Level: Medium)**
Identify the correct spelling when you add the suffix '-ly' to the word **happy**.

[QUIZ_OPTION: A] happyly
[QUIZ_OPTION: B] hapyly
[QUIZ_OPTION: C] happely
[QUIZ_OPTION: D] happily [CORRECT]
[QUIZ_OPTION: E] happilee

**Explanation:**
Because 'happy' ends in a consonant paired with a 'y', you must chop off the 'y' and replace it with an 'i' before attaching the 'ly' tail.

---

**Q3 (Level: Medium)**
The suffix **-able** usually means you are capable or able to do something. Which word perfectly means 'capable of being washed'?

[QUIZ_OPTION: A] unwashed
[QUIZ_OPTION: B] washless
[QUIZ_OPTION: C] washable [CORRECT]
[QUIZ_OPTION: D] washment
[QUIZ_OPTION: E] washingly

**Explanation:**
Attaching '-able' to the verb wash proves that a jacket or t-shirt is totally capable of surviving the washing machine without damage.

---

**Q4 (Level: Hard)**
What happens to the root word 'beauty' when you add the strong suffix '-ful'?

[QUIZ_OPTION: A] The word stays exactly the same: beautyful.
[QUIZ_OPTION: B] You double the 't': beauttyful.
[QUIZ_OPTION: C] The 'y' completely disappears: beautful.
[QUIZ_OPTION: D] The 'y' changes into an 'i': beautiful. [CORRECT]
[QUIZ_OPTION: E] You drop the 'y' and add an 'e': beauteful.

**Explanation:**
The classic spelling Golden Rule applies here perfectly. Swap the tail end 'y' for a solid 'i' prior to attaching the new suffix.

---

**Q5 (Level: Extreme)**
Which of the following entirely changes a verb (action) into an abstract noun (an invisible concept or feeling)?

[QUIZ_OPTION: A] Adding '-ed' to 'walk' to make walked.
[QUIZ_OPTION: B] Adding '-ing' to 'jump' to make jumping.
[QUIZ_OPTION: C] Adding '-ment' to 'excite' to make excitement. [CORRECT]
[QUIZ_OPTION: D] Adding '-ly' to 'quick' to make quickly.
[QUIZ_OPTION: E] Adding '-er' to 'fast' to make faster.

**Explanation:**
Excite is an action word (verb). Excitement is an invisible emotion or feeling that you can mentally experience. The suffix '-ment' is excellent at creating strong abstract nouns from energetic verbs."""
    },
    {
      "slug": "vocabulary-root-words",
      "title": "V6: Root Word Detectives",
      "level": "11+",
      "md": """## Vocabulary Reference: Root Words
*Use this targeted word bank to decode complex Latin and Greek roots. Memorising these core bones gives you immense power to unlock unknown words.*

**Photo** (Greek)
*Meaning:* Light
*Examples:* Photograph, Photosynthesis, Photocopy

**Spect** (Latin)
*Meaning:* To watch or actively look at
*Examples:* Spectator, Inspect, Spectacle

**Chron** (Greek)
*Meaning:* Exact time
*Examples:* Chronological, Synchronise, Chronic

**Ject** (Latin)
*Meaning:* To forcibly throw
*Examples:* Eject, Inject, Reject

**Bene** (Latin)
*Meaning:* Good or highly helpful
*Examples:* Benefactor, Benefit, Benign

**Tele** (Greek)
*Meaning:* Distance or incredibly far away
*Examples:* Telescope, Telephone, Television

## 1. Finding the Skeleton
Every long, terrifying word in the English language is actively built around a small, simple core called a Root Word. A huge percentage of advanced English vocabulary is secretly glued to ancient Latin and ancient Greek roots.

### How to be a Root Word Detective
If you see an impossible word in your GL test, like **Auditory**, don't panic. Search for its hidden bones.

The root **Aud** comes from Latin, and it universally means 'to hear' (like audio). Therefore, an 'Auditory' test must relate directly to checking someone's ears or hearing capacity!

## 2. Common Mistakes
Do not confuse similar sounding prefixes and roots. **Micro** means tiny (microscope), while **Macro** heavily indicates something undeniably huge or covering a massive entire system. Swapping these entirely ruins a vocabulary breakdown.

## 3. Practice Questions

**Q1 (Level: Easy)**
If you firmly know the Greek root **photo** means 'light', what does a photograph essentially mean?

[QUIZ_OPTION: A] A drawing made with brightly coloured pencils.
[QUIZ_OPTION: B] An image captured utilizing light. [CORRECT]
[QUIZ_OPTION: C] A machine that prints fast on paper.
[QUIZ_OPTION: D] A book full of short painted pictures.
[QUIZ_OPTION: E] A tiny wooden frame.

**Explanation:**
The root 'photo' literally translates to light. A camera captures light to permanently record the actual visual image in front of you.

---

**Q2 (Level: Medium)**
The root word **spect** translates to 'look or watch'. Which word relates directly to someone loudly watching a football match?

[QUIZ_OPTION: A] Specialist
[QUIZ_OPTION: B] Speaker
[QUIZ_OPTION: C] Spectacular
[QUIZ_OPTION: D] Spectator [CORRECT]
[QUIZ_OPTION: E] Sprinter

**Explanation:**
A spectator physically sits in the very tall stadium stands and intentionally 'watches' the sport in front of them without taking part.

---

**Q3 (Level: Medium)**
Using your distinct knowledge of the root **chron**, what does telling a story in 'chronological' order mean?

[QUIZ_OPTION: A] Telling it completely backwards.
[QUIZ_OPTION: B] Telling it in exactly the order of the time events happened. [CORRECT]
[QUIZ_OPTION: C] Telling it using incredibly scary monsters.
[QUIZ_OPTION: D] Telling it very slowly and quietly.
[QUIZ_OPTION: E] Telling only the true parts.

**Explanation:**
Chron distinctly means time. Chronological order is arranging historical events exactly as they ticked by on a clock, from earliest to latest.

---

**Q4 (Level: Hard)**
The root verb **ject** absolutely means 'to throw'. Which word perfectly means 'to forcefully throw something out entirely'?

[QUIZ_OPTION: A] Inject
[QUIZ_OPTION: B] Object
[QUIZ_OPTION: C] Reject
[QUIZ_OPTION: D] Subject
[QUIZ_OPTION: E] Eject [CORRECT]

**Explanation:**
The prefix 'e-' originates from 'ex', denoting out. Combining 'Ex' (out) + 'Ject' (throw) perfectly creates Eject—throwing out!

---

**Q5 (Level: Extreme)**
The Latin root **bene** strictly translates to 'good'. Which advanced word describes a person who kindly leaves all of their money to someone in their personal will?

[QUIZ_OPTION: A] Banish
[QUIZ_OPTION: B] Benefactor [CORRECT]
[QUIZ_OPTION: C] Beneath
[QUIZ_OPTION: D] Benefit
[QUIZ_OPTION: E] Bentley

**Explanation:**
A 'benefactor' is someone who performs a highly 'good' (bene) action (factor) by thoughtfully donating their wealth to deeply help someone."""
    },
    {
      "slug": "vocabulary-odd-one-out",
      "title": "V7: Spotting the Odd One Out",
      "level": "11+",
      "md": """## Vocabulary Reference: Hidden Themes
*Use this targeted training bank to practice detecting the impostor. Every single list heavily contains one secretly disguised word that completely fails the invisible rule!*

**Type:** Furniture you sit literally *on*.
*   **List:** Sofa, Chair, Stool, Bench, *Table*
*   **Impostor:** *Table* (You sit heavily *at* a table, not *on* it).

**Type:** High-Speed bipedal human leg movement.
*   **List:** Sprint, Dash, Run, Jog, *Crawl*
*   **Impostor:** *Crawl* (Uses bare hands and raw knees; remarkably too slow).

**Type:** Destructive Wind-based severe weather.
*   **List:** Hurricane, Tornado, Cyclone, Typhoon, *Earthquake*
*   **Impostor:** *Earthquake* (Strictly geological underground rock vibrations, entirely zero wind).

**Type:** Forcefully loud, aggressive sound projection.
*   **List:** Shout, Scream, Yell, Bellow, *Whisper*
*   **Impostor:** *Whisper* (Intensely quiet volume entirely).

## 1. The GL Classic Trick
The 'Odd One Out' pattern is deeply famous in the 11+ vocabulary test. You are presented with five different words. Four of them firmly belong to an invisible family or conceptual theme, while one word is a sneakily disguised imposter.

### The Category Test
Never blindly choose a word just because it verbally 'looks' different or sounds weird. You must logically prove the invisible category.

Always demand of yourself: "What is the shared invisible umbrella that successfully protects four of these words?"

For example: Apple, Banana, Orange, Peach, Carrot.
The hidden category is 'Fruit'. A carrot might be bright orange like a peach, but it is scientifically a root vegetable. It fails the secret umbrella category!

## 2. Common Mistakes
Examiners adore tricking you using 'Sound Traps'. They will maliciously give you four words related to natural water (ocean, river, lake, stream) and one random word that just happens to rhyme perfectly with them (shiver). 

Ensure you accurately compare exactly what the words *mean*, not how they rhythmically sound when spoken aloud!

## 3. Practice Questions

**Q1 (Level: Easy)**
Identify the exact odd one out from this list of options.

[QUIZ_OPTION: A] Sofa
[QUIZ_OPTION: B] Chair
[QUIZ_OPTION: C] Table [CORRECT]
[QUIZ_OPTION: D] Stool
[QUIZ_OPTION: E] Bench

**Explanation:**
The hidden category is 'Objects specifically built for humans to physically sit upon'. A table is absolutely furniture, but you sit *at* it.

---

**Q2 (Level: Medium)**
Which of the following highly sneaky words does not belong in the group?

[QUIZ_OPTION: A] Sprint
[QUIZ_OPTION: B] Jog
[QUIZ_OPTION: C] Dash
[QUIZ_OPTION: D] Crawl [CORRECT]
[QUIZ_OPTION: E] Run

**Explanation:**
All the other words describe heavily moving rapidly utilizing two feet upright. Crawling is immensely slow and uses your hands and knees.

---

**Q3 (Level: Medium)**
Identify the odd one out from this weather-related list.

[QUIZ_OPTION: A] Hurricane
[QUIZ_OPTION: B] Tornado
[QUIZ_OPTION: C] Cyclone
[QUIZ_OPTION: D] Tsunami
[QUIZ_OPTION: E] Earthquake [CORRECT]

**Explanation:**
The first four are incredibly violent weather events born completely from massive atmospheric wind and water systems. An earthquake is fiercely geological, caused strictly by underground rock movements.

---

**Q4 (Level: Hard)**
Look incredibly closely. Which verb firmly fails to fit into the acoustic category?

[QUIZ_OPTION: A] Whisper
[QUIZ_OPTION: B] Shout
[QUIZ_OPTION: C] Yell
[QUIZ_OPTION: D] Scream
[QUIZ_OPTION: E] Bellow

**Explanation:**
The other four physically describe producing a hugely loud, aggressive volume of acoustic sound. A whisper is intensely quiet and highly secretive. [CORRECT: A]

---

**Q5 (Level: Extreme)**
Find the odd one out in this highly advanced vocabulary set.

[QUIZ_OPTION: A] Colossal
[QUIZ_OPTION: B] Gigantic
[QUIZ_OPTION: C] Minute [CORRECT]
[QUIZ_OPTION: D] Immense
[QUIZ_OPTION: E] Mammoth

**Explanation:**
The hidden category is 'Words detailing something incredibly huge'. Minute (pronounced my-noot) actually equates to incredibly tiny or entirely microscopic."""
    },
    {
      "slug": "vocabulary-cloze",
      "title": "V8: Cloze Passage Tactics",
      "level": "11+",
      "md": """## Vocabulary Reference: Cloze Dictionary
*Use this targeted word bank to deeply help you accurately fill in the missing blank spaces in realistic Cloze tests.*

**Sadly** (Adverb)
*Meaning:* Expressing deep sorrow or regret.
*Example:* The old dog looked sadly at its empty bowl.

**Warm** (Adjective)
*Meaning:* Of a comfortably high temperature. Provides contrast against extreme cold.
*Example:* The crackling fire kept the cabin delightfully warm.

**Conceal** (Verb)
*Meaning:* To deliberately keep out of sight or successfully hide.
*Example:* He attempted to conceal the stolen gold.

**Sceptical** (Adjective)
*Meaning:* Not easily convinced; having huge doubts about a story or claim.
*Example:* The strict teacher was highly sceptical of Jack's flimsy excuse.

**Groan** (Verb)
*Meaning:* A deep sound made in response to physical pain, or the creaking of heavy objects under intense weight.
*Example:* The wooden floorboards began to groan under the heavy safe.

## 1. Filling in the Blanks
A Cloze Passage is a dense, tricky paragraph that has several critical words entirely deleted. Your mission is to select exactly one word from a list of options to perfectly fill each missing gap. This aggressively tests both your advanced vocabulary and your grammatical intuition.

### The Grammar Filter Method
Before totally deciding what an unknown word literally means, look at the active grammar framing the empty hole.

If the sentence dictates: *\"The heroic knight bravely swung his heavy ....... at the massive dragon.\"*

1.  You instantly know the gap heavily requires a Noun (an actual physical object), because he is swinging it using his hands.
2.  If one of the options is 'quickly' (an adverb), you can confidently cross it out immediately. You cannot swing a 'quickly' at a dragon!

## 2. Exam Tips
Always read completely past the blank hole before deciding tightly. The true context clue that fully solves the entire puzzle is almost always hiding entirely in the sentence placed purely after the blank spot.

## 3. Practice Questions

**Q1 (Level: Easy)**
Which word perfectly completes the gap? *The old, starving dog stared ....... at the completely empty food bowl.*

[QUIZ_OPTION: A] happily
[QUIZ_OPTION: B] sadly [CORRECT]
[QUIZ_OPTION: C] quick
[QUIZ_OPTION: D] running
[QUIZ_OPTION: E] shouted

**Explanation:**
Because the dog is heavily described as starving and staring at an empty bowl, it makes no logical sense for him to stare happily. Sadly fits the dark, hungry mood flawlessly.

---

**Q2 (Level: Medium)**
Fill in the blank space: *Despite the freezing blizzard raging outside, the fireplace kept the small cabin intensely ....... .*

[QUIZ_OPTION: A] cold
[QUIZ_OPTION: B] bright
[QUIZ_OPTION: C] warm [CORRECT]
[QUIZ_OPTION: D] freezing
[QUIZ_OPTION: E] hot

**Explanation:**
The sentence leads with 'Despite', throwing down a sharp contrast. A blizzard is violently cold, so the magical fireplace must provide exactly the opposite outcome to survive: warm.

---

**Q3 (Level: Medium)**
Identify the missing word: *The thief heavily tried to ....... the shiny diamonds directly into his hidden jacket pockets.*

[QUIZ_OPTION: A] steal
[QUIZ_OPTION: B] conceal [CORRECT]
[QUIZ_OPTION: C] view
[QUIZ_OPTION: D] throw
[QUIZ_OPTION: E] look

**Explanation:**
The gap heavily needs an active physical verb. 'Conceal' perfectly equates to completely hiding something away invisibly, which neatly matches 'hidden pockets'.

---

**Q4 (Level: Hard)**
Choose the most accurate word: *The aggressive teacher was highly ....... that Jack had genuinely completed his lengthy homework, because Jack commonly told massive lies.*

[QUIZ_OPTION: A] sure
[QUIZ_OPTION: B] happy
[QUIZ_OPTION: C] sceptical [CORRECT]
[QUIZ_OPTION: D] angry
[QUIZ_OPTION: E] excited

**Explanation:**
If Jack frequently lies, an intelligent strict teacher wouldn't instantly trust him. Sceptical perfectly portrays actively struggling to believe if a claim is a complete truth.

---

**Q5 (Level: Extreme)**
Which highly difficult verb logically completes the gap: *The heavy wooden floorboards began to quietly ....... under the extreme physical weight of the giant iron bookshelf.*

[QUIZ_OPTION: A] crack
[QUIZ_OPTION: B] groan [CORRECT]
[QUIZ_OPTION: C] laugh
[QUIZ_OPTION: D] run
[QUIZ_OPTION: E] explode

**Explanation:**
The adverb 'quietly' tightly removes 'explode' and 'crack' (which are intensely sharp and loud). The personification 'groan' perfectly simulates the eerie, struggling acoustic noise of highly compressed wood."""
    },
    {
      "slug": "vocabulary-emotion",
      "title": "V9: Words of Emotion & Tone",
      "level": "11+",
      "md": """## Vocabulary Reference: The Emotion Ladder
*Use this targeted emotional word bank to measure precisely how intensely a character is experiencing a feeling.*

**Terrified**
*Meaning:* Experiencing extreme, paralyzing fear or absolute panic.
*Context:* Used when facing a direct threat to personal survival.

**Melancholy**
*Meaning:* A feeling of pensive, quiet, and long-lasting sadness.
*Context:* Deeper than just being upset; often associated with dark, gloomy memories.

**Ecstatic**
*Meaning:* Feeling or expressing overwhelming happiness and joyful excitement.
*Context:* Used for massive victories, not just for eating a nice sandwich.

**Appalled**
*Meaning:* Greatly dismayed, horrified, or disgusted by something terrible.
*Context:* Reacting to incredibly bad behavior or a shocking, grotesque scene.

**Exasperated**
*Meaning:* Intensely irritated and completely frustrated, often after dealing with an annoyance for a long time.
*Context:* How a mother feels after her child ignores her instructions for the fifth time.

## 1. Upgrading Your Feelings
In the 11+, using basic words like "happy," "sad," or "angry" will not secure you top bracket marks. You need a mature arsenal of emotional vocabulary to critically decode exactly how a character's brain is working.

### The Emotion Escalator
Think of basic emotions like stepping onto the very bottom rank of a huge escalator ladder.

*   **Anger Level 1:** Annoyed (mildly frustrated at a small delay).
*   **Anger Level 2:** Furious (intensely angry, aggressive tone).
*   **Anger Level 3:** Enraged / Irate (completely explosive, uncontrollable pure rage).

If you can accurately map exactly how strong a character's emotion currently is, you can crush the hardest vocabulary questions rapidly.

## 2. Exam Tips
Watch tightly for the heavily descriptive verbs and physical cues a character exhibits. If they are aggressively "slamming doors" and have rigidly "clenched fists", they aren't mildly irritated—they are violently incensed (enraged). Use physical descriptions to deduce the emotional vocabulary.

## 3. Practice Questions

**Q1 (Level: Easy)**
Which word is a vastly stronger version of feeling incredibly **scared**?

[QUIZ_OPTION: A] nervous
[QUIZ_OPTION: B] worried
[QUIZ_OPTION: C] terrified [CORRECT]
[QUIZ_OPTION: D] upset
[QUIZ_OPTION: E] shy

**Explanation:**
Nervous and worried are mild feelings you routinely experience before taking a school test. Terrified dictates absolute, screaming panic for your personal safety.

---

**Q2 (Level: Medium)**
If a girl feels intensely **melancholic**, how is she heavily feeling?

[QUIZ_OPTION: A] Deeply angry and completely aggressive.
[QUIZ_OPTION: B] Extremely joyful and heavily bouncy.
[QUIZ_OPTION: C] Quietly sad, deeply thoughtful, and highly depressed. [CORRECT]
[QUIZ_OPTION: D] Sick with a terrible fever headache.
[QUIZ_OPTION: E] Ready heavily to fall fast asleep.

**Explanation:**
Melancholy represents a very deep, quiet, lingering sadness that strongly resists fading. It is an emotional state far deeper than merely crying over a dropped ice cream.

---

**Q3 (Level: Medium)**
Identify the advanced word that most strongly means feeling **incredibly joyful and thrilled**.

[QUIZ_OPTION: A] content
[QUIZ_OPTION: B] ecstatic [CORRECT]
[QUIZ_OPTION: C] calm
[QUIZ_OPTION: D] amused
[QUIZ_OPTION: E] relaxed

**Explanation:**
Content simply means comfortably satisfied in peace. Ecstatic sits at the absolute peak of the positive joy ladder, representing uncontrollable extreme happiness.

---

**Q4 (Level: Hard)**
Which of the following highly intense words totally describes someone who genuinely is completely and deeply **shocked** by utterly horrible behavior?

[QUIZ_OPTION: A] surprised
[QUIZ_OPTION: B] confused
[QUIZ_OPTION: C] amused
[QUIZ_OPTION: D] appalled [CORRECT]
[QUIZ_OPTION: E] curious

**Explanation:**
Surprised can genuinely be heavily positive (e.g. a surprise birthday party). Appalled strictly dictates being completely disgusted, horrified, and intensely repulsed by terribly wrong actions.

---

**Q5 (Level: Extreme)**
What does it mean if a teacher feels terribly **exasperated** with a severely misbehaving class?

[QUIZ_OPTION: A] She is highly entertained and laughing loudly.
[QUIZ_OPTION: B] She is completely exhausted, highly frustrated, and at the absolute total end of her patience. [CORRECT]
[QUIZ_OPTION: C] She feels deeply sorry for them entirely.
[QUIZ_OPTION: D] She is strictly proud of their massive effort.
[QUIZ_OPTION: E] She is planning to actively attack them fiercely.

**Explanation:**
Exasperated carries a very specific tone. It brilliantly combines total emotional exhaustion with intense frustration, identical to dealing completely with a heavily messy, aggressively misbehaving child for three unbroken hours."""
    },
    {
      "slug": "vocabulary-adjectives",
      "title": "V10: Supercharged Adjectives",
      "level": "11+",
      "md": """## Vocabulary Reference: Supercharged Describers
*Use this targeted word bank to decode immensely advanced GL adjectives back down to their simpler standard meanings.*

**Deafening**
*Meaning:* So incredibly loud that it hurts your ears and prevents you from hearing anything else. 
*Context:* Used for explosions or sirens.

**Exhausted**
*Meaning:* Completely drained of all physical or mental energy.
*Context:* The state encountered after running a grueling marathon.

**Solitary**
*Meaning:* Existing completely alone, totally separated from others.
*Context:* A single isolated cabin placed miles away from civilization.

**Impregnable**
*Meaning:* Absolutely unable to be captured, broken into, or compromised.
*Context:* Used to describe thick-walled fortress castles.

**Ominous**
*Meaning:* Giving an intensely worrying or creepy impression that something bad is approaching.
*Context:* Heavy, dark grey storm clouds gathering aggressively.

## 1. Upgrading the Mundane
Adjectives are descriptive words used strictly to intensely colour the invisible nouns inside a sentence in vibrant detail. In the 11+, picking merely ordinary, boring adjectives will simply lead to ordinary marks.

### Swapping the Bland
Never settle quickly for 'big'. Was it enormous, colossal, gigantic, or massive?
Never simply settle for 'bad'. Was it wicked, atrocious, malevolent, or completely horrific?

The master secret to intensely decoding an unknown superhero adjective is tracking exactly *what invisible thing* the author is directly describing. If the author is attaching the tricky adjective "malevolent" directly onto an evil witch stirring green venom in a toxic cauldron, you can expertly deduce it equates to incredibly 'evil'.

## 2. Exam Tips
Sometimes examiners purposely bury a massively supercharged, scary adjective neatly inside a heavy pile of very mundane, normal words. 

Scan purely for that completely weird word that vastly sticks out from the standard text. Then, deeply analyze exactly what the noun in the sentence is physically doing to successfully crack its hidden meaning.

## 3. Practice Questions

**Q1 (Level: Easy)**
Which highly charged adjective correctly describes a terrifyingly, incredibly loud noise?

[QUIZ_OPTION: A] silent
[QUIZ_OPTION: B] noisy
[QUIZ_OPTION: C] deafening [CORRECT]
[QUIZ_OPTION: D] squeaky
[QUIZ_OPTION: E] quiet

**Explanation:**
'Noisy' merely indicates light annoying chatter in a crowded room. 'Deafening' proves the absolute sound is violently loud enough to heavily completely rip away your actual hearing entirely.

---

**Q2 (Level: Medium)**
Identify the vastly supercharged synonym for 'incredibly tired'.

[QUIZ_OPTION: A] sleepy
[QUIZ_OPTION: B] resting
[QUIZ_OPTION: C] exhausted [CORRECT]
[QUIZ_OPTION: D] yawning
[QUIZ_OPTION: E] lazy

**Explanation:**
'Sleepy' indicates simply being heavily ready for an evening bed. 'Exhausted' tightly expresses having zero physical energy left totally after heavily running a massive marathon.

---

**Q3 (Level: Medium)**
What does the intensely advanced adjective **solitary** entirely mean?

[QUIZ_OPTION: A] heavily bright
[QUIZ_OPTION: B] completely solid
[QUIZ_OPTION: C] totally alone [CORRECT]
[QUIZ_OPTION: D] beautifully warm
[QUIZ_OPTION: E] hugely heavy

**Explanation:**
Solitary firmly stems entirely from identical hidden Latin roots as 'solo'. It intensely means completely alone or totally heavily isolated tightly from everyone else.

---

**Q4 (Level: Hard)**
Which of the following extremely potent adjectives describes a medieval castle completely built to forcefully stop any attacking enemy?

[QUIZ_OPTION: A] gorgeous
[QUIZ_OPTION: B] terrible
[QUIZ_OPTION: C] impregnable [CORRECT]
[QUIZ_OPTION: D] invisible
[QUIZ_OPTION: E] tall

**Explanation:**
An impregnable fortress possesses solid walls so thick and robust that nobody essentially can successfully break violently inside it.

---

**Q5 (Level: Extreme)**
What does it heavily signify if an incredibly dark alien forest appears intensely **ominous**?

[QUIZ_OPTION: A] immensely beautiful and heavily welcoming
[QUIZ_OPTION: B] completely and extremely deeply brightly lit
[QUIZ_OPTION: C] giving a deeply unsettling feeling that heavy terrible danger is approaching [CORRECT]
[QUIZ_OPTION: D] completely totally harmless entirely
[QUIZ_OPTION: E] full of lovely heavy magic

**Explanation:**
Ominous is a dark, heavy, supercharged adjective perfectly derived strictly from 'omen' (a heavy sign of future dark disaster). It definitively proves that the trees entirely emit incredibly dangerous and unsafe vibrations."""
    }
]

data["Vocabulary"] = new_advanced_vocabulary

# Clean all 3+ underscores to dots across the whole JSON just in case they snuck back in
def fix_text(text):
    if not isinstance(text, str):
        return text
    return re.sub(r'_{3,}', '.......', text)

def process_node(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == 'md' and isinstance(v, str):
                node[k] = fix_text(v)
            else:
                process_node(v)
    elif isinstance(node, list):
        for item in node:
            process_node(item)

process_node(data)

with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Successfully injected completely rewritten Premium Vocabulary Modules.")
