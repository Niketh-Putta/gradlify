import json
import os

filepath = 'src/data/eleven_plus_english_notes.json'

with open(filepath, 'r', encoding='utf-8') as f:
    data = json.load(f)

additional_questions = {
    "inference": """
---

**Q3 (Level: Medium)**
What does the 'solitary lamppost' suggest about the setting?

[QUIZ_OPTION: A] The platform is very bright and safe.
[QUIZ_OPTION: B] The area is isolated and likely abandoned. [CORRECT]
[QUIZ_OPTION: C] It is currently daytime.
[QUIZ_OPTION: D] Train drivers use the lamp to see the track.
[QUIZ_OPTION: E] There are many people waiting under it.

**Explanation:**
The word 'solitary' means alone or single. Combined with 'desolate', it strongly infers an isolated, lonely, and potentially unsafe environment (Option B), rejecting any idea of a warm or populated space.

---

**Q4 (Level: Hard)**
Based on the final sentence, how does the author convey the sudden nature of the train's arrival?

[QUIZ_OPTION: A] By describing the color of the train.
[QUIZ_OPTION: B] By stating the exact time it arrived.
[QUIZ_OPTION: C] By having Elias shout in surprise.
[QUIZ_OPTION: D] By having the headlight 'pierce' the suffocating fog. [CORRECT]
[QUIZ_OPTION: E] By describing a slow, gradual clearing of the weather.

**Explanation:**
The verb 'pierced' suggests a sudden, sharp, and violent breaking of the previously heavy ('suffocating') fog. It implies speed and suddenness, shifting the narrative instantly.

---

**Q5 (Level: Extreme)**
Which word from the text provides the strongest evidence that the approaching train is intimidating or physically overwhelming?

[QUIZ_OPTION: A] Flickering
[QUIZ_OPTION: B] Desolate
[QUIZ_OPTION: C] Rhythmic
[QUIZ_OPTION: D] Suffocating [CORRECT]
[QUIZ_OPTION: E] Solitary

**Explanation:**
The train's headlight emerges from 'suffocating' fog, but even earlier, the 'vibration' bleeds through the soles of his boots. However, the fog itself is described as 'suffocating', which creates the intense, overwhelming, breathless atmosphere that amplifies the train's intimidating presence.
""",
    
    "text_structure": """
---

**Q3 (Level: Medium)**
What is the primary purpose of the opening sentence ('groaned an ancient protest')?

[QUIZ_OPTION: A] To explain the history of the library.
[QUIZ_OPTION: B] To persuade the reader to buy new doors.
[QUIZ_OPTION: C] To establish that the archive is extremely old and rarely accessed. [CORRECT]
[QUIZ_OPTION: D] To frighten the reader with supernatural elements.
[QUIZ_OPTION: E] To describe the architectural style of the building.

**Explanation:**
The personification of 'groaning an ancient protest' structurally establishes the setting immediately: it is old, heavy, and has been shut for a very long time, setting a mysterious tone.

---

**Q4 (Level: Hard)**
Look at the phrase 'Row upon endless row of leather-bound tomes stood like silent sentinels.' How does this structure affect the pace of the text?

[QUIZ_OPTION: A] It speeds up the pace to build panic.
[QUIZ_OPTION: B] It slows the pace to convey the immense, imposing scale of the room. [CORRECT]
[QUIZ_OPTION: C] It introduces rapid dialogue between characters.
[QUIZ_OPTION: D] It breaks the narrative into a flashback.
[QUIZ_OPTION: E] It provides a quick factual summary.

**Explanation:**
This is a long, descriptive, compound sentence. Authors use this structure to force the reader to slow down, mimicking Evelyn taking in the massive, imposing scale of the library.

---

**Q5 (Level: Medium)**
Which of the 'PIE' purposes does this passage primarily align with across its structure?

[QUIZ_OPTION: A] Persuade (to read more books).
[QUIZ_OPTION: B] Inform (about library architecture).
[QUIZ_OPTION: C] Entertain (by building narrative suspense). [CORRECT]
[QUIZ_OPTION: D] Persuade (to protect ancient archives).
[QUIZ_OPTION: E] Inform (about dust motes).

**Explanation:**
The text is clearly building a narrative arc with rich imagery and a cliffhanger ending (the footstep). It is a piece of fiction designed solely to entertain the reader with suspense.
""",
    
    "vocabulary_context": """
---

**Q3 (Level: Medium)**
What does the word 'depleting' mean in the context of the second sentence?

[QUIZ_OPTION: A] Increasing slightly.
[QUIZ_OPTION: B] Rotting away.
[QUIZ_OPTION: C] Rapidly running out. [CORRECT]
[QUIZ_OPTION: D] Becoming poisonous.
[QUIZ_OPTION: E] Being stolen by animals.

**Explanation:**
If you insert 'running out' into the sentence, it perfectly aligns with the context of an 'arduous' multi-week expedition. Therefore, C is the correct answer.

---

**Q4 (Level: Hard)**
Look at the phrase 'oppressive humidity'. Which of the following is the closest antonym for 'oppressive' in this context?

[QUIZ_OPTION: A] Heavy
[QUIZ_OPTION: B] Suffocating
[QUIZ_OPTION: C] Relieving [CORRECT]
[QUIZ_OPTION: D] Violent
[QUIZ_OPTION: E] Unbearable

**Explanation:**
'Oppressive' means weighing heavily on the senses or spirit (unbearable/suffocating). The question asks for the ANTONYM (opposite). The opposite of a suffocating, unbearable heat is a relieving or refreshing environment.

---

**Q5 (Level: Extreme)**
Which phrase from the text best helps the reader understand the meaning of 'treacherous'?

[QUIZ_OPTION: A] "small transport vessel"
[QUIZ_OPTION: B] "constant threat of venomous vipers" [CORRECT]
[QUIZ_OPTION: C] "eagle's focus"
[QUIZ_OPTION: D] "remained resolute"
[QUIZ_OPTION: E] "three weeks"

**Explanation:**
'Treacherous' means extremely dangerous or hazardous. The 'constant threat of venomous vipers' is a primary context clue that directly proves the riverbanks are incredibly lethal and hostile.
""",

    "character_analysis": """
---

**Q3 (Level: Medium)**
What does the description of his shoes clicking 'with the military precision of a metronome' reveal about Mr. Sterling?

[QUIZ_OPTION: A] He is a talented musician.
[QUIZ_OPTION: B] He used to be a soldier in the army.
[QUIZ_OPTION: C] He is highly disciplined, rigid, and calculating. [CORRECT]
[QUIZ_OPTION: D] He walks with a pronounced limp.
[QUIZ_OPTION: E] He is rushing because he is late.

**Explanation:**
A metronome keeps exact, rigid time. By comparing his walk to military and metronomic precision, the author uses his actions (the 'A' in STEAL) to show he is rigidly disciplined and calculating.

---

**Q4 (Level: Hard)**
Why might the author have chosen the word 'surrender' in the opening sentence ('he commanded it to surrender')?

[QUIZ_OPTION: A] To show that the school is under military attack.
[QUIZ_OPTION: B] To establish him as a dominant, overwhelming, and authoritarian figure. [CORRECT]
[QUIZ_OPTION: C] To imply that the students are brave rebels.
[QUIZ_OPTION: D] To show he is giving up his position as headmaster.
[QUIZ_OPTION: E] Because he is physically fighting the students.

**Explanation:**
'Surrender' is highly aggressive and authoritarian. Rather than just entering a room, he forces the room to yield to him, instantly establishing an oppressive dominance.

---

**Q5 (Level: Medium)**
What is the effect of Mr. Sterling never looking down at the students?

[QUIZ_OPTION: A] It shows he is too tall to see them clearly.
[QUIZ_OPTION: B] It proves he is completely blind.
[QUIZ_OPTION: C] It demonstrates absolute arrogance and a lack of empathy for inferiors. [CORRECT]
[QUIZ_OPTION: D] It implies he is afraid of making eye contact.
[QUIZ_OPTION: E] It shows he is distracted by the dust on the desks.

**Explanation:**
Refusing to make eye contact with subordinates is a classic trope representing extreme arrogance and a belief that those below him are not worthy of his attention.
""",

    "figurative_language": """
---

**Q3 (Level: Medium)**
The phrase 'the wind began to howl its mournful warning' is an example of which two figurative devices?

[QUIZ_OPTION: A] Simile and Alliteration
[QUIZ_OPTION: B] Metaphor and Onomatopoeia
[QUIZ_OPTION: C] Personification and Onomatopoeia [CORRECT]
[QUIZ_OPTION: D] Hyperbole and Simile
[QUIZ_OPTION: E] Assonance and Metaphor

**Explanation:**
The wind is given the human ability to 'warn' and feel 'mournful' (Personification), while the word 'howl' directly mimics the actual sound the wind makes (Onomatopoeia).

---

**Q4 (Level: Hard)**
What is the effect of describing the old tower as having 'stone skin flaking away'?

[QUIZ_OPTION: A] To compare the building to a sick, decaying, or dying creature. [CORRECT]
[QUIZ_OPTION: B] To explain standard architectural erosion processes to the reader.
[QUIZ_OPTION: C] To show that the lighthouse is completely safe to enter.
[QUIZ_OPTION: D] To persuade the reader to donate to lighthouse restoration.
[QUIZ_OPTION: E] To make the seaside look beautiful.

**Explanation:**
By personifying the stone as 'skin' that is 'flaking' and combined with 'decaying giant', the author transforms a simple ruined building into something resembling a diseased or dying titan, amplifying the gothic horror.

---

**Q5 (Level: Extreme)**
How does the Pathetic Fallacy in paragraph two ('As the tempest rolled in') reflect the upcoming conflict?

[QUIZ_OPTION: A] The storm represents a peaceful resolution for the sailors.
[QUIZ_OPTION: B] The violent weather mirrors the vicious, fatal danger awaiting any approaching ships. [CORRECT]
[QUIZ_OPTION: C] The tempest shows that the lighthouse keeper is very angry at the sea.
[QUIZ_OPTION: D] The weather indicates that a sunny morning is about to arrive.
[QUIZ_OPTION: E] It has no connection; it is just a factual weather report.

**Explanation:**
Pathetic Fallacy uses weather to reflect mood or plot. A violently arriving tempest perfectly mirrors the fatal danger that the 'gnashing' rocks present to the sailors.
""",

    "factual_retrieval": """
---

**Q3 (Level: Easy)**
Who is explicitly named as one of the most infamous nautical outlaws?

[QUIZ_OPTION: A] The Mayor of Charleston
[QUIZ_OPTION: B] A merchant captain
[QUIZ_OPTION: C] Blackbeard [CORRECT]
[QUIZ_OPTION: D] A high-ranking politician
[QUIZ_OPTION: E] An Indian Ocean sailor

**Explanation:**
Using the scanning protocol, looking for names instantly lands on the sentence: 'Blackbeard, perhaps the most infamous of these nautical outlaws...'

---

**Q4 (Level: Medium)**
Which three regions were explicitly mentioned as being terrorized by pirates?

[QUIZ_OPTION: A] The Caribbean Sea, the Pacific Ocean, and South America.
[QUIZ_OPTION: B] The Caribbean Sea, the Indian Ocean, and the eastern coast of North America. [CORRECT]
[QUIZ_OPTION: C] The Atlantic Ocean, the Indian Ocean, and South Carolina.
[QUIZ_OPTION: D] The Mediterranean Sea, the Indian Ocean, and North America.
[QUIZ_OPTION: E] The Caribbean Sea, the Red Sea, and the eastern coast of England.

**Explanation:**
By scanning for the list sequence in the text: '...terrorized the trade routes spanning the Caribbean Sea, the Indian Ocean, and the eastern coast of North America.' Option B is a perfect factual match.

---

**Q5 (Level: Hard)**
Where did Blackbeard originally capture the high-ranking politicians?

[QUIZ_OPTION: A] Inside the heavily fortified port of Charleston.
[QUIZ_OPTION: B] On an island in the Caribbean Sea.
[QUIZ_OPTION: C] In a hospital while stealing medical supplies.
[QUIZ_OPTION: D] Underneath a merchant ship in the Indian Ocean.
[QUIZ_OPTION: E] On a merchant ship just days prior to the blockade. [CORRECT]

**Explanation:**
The text states he demanded ransom for 'the city's highest-ranking politicians, whom he had captured on a merchant ship just days prior.' Option E perfectly mirrors the final phrase of the paragraph.
""",

    "poetry_decoding": """
---

**Q3 (Level: Medium)**
What literary technique is used in the line 'Briefly piercing through the soot-stained night'?

[QUIZ_OPTION: A] Personification
[QUIZ_OPTION: B] Simile
[QUIZ_OPTION: C] Enjambment
[QUIZ_OPTION: D] Alliteration
[QUIZ_OPTION: E] Imagery [CORRECT]

**Explanation:**
While it contains minor sibilance, it is primarily a powerful piece of visual Imagery, painting a vivid contrast between the bright 'golden' sparks and the dark, filthy 'soot-stained' environment.

---

**Q4 (Level: Hard)**
What is the structural effect of the final sentence: 'The fire roars. He draws the metal in.'?

[QUIZ_OPTION: A] Long, descriptive sentence mirroring exhaustion.
[QUIZ_OPTION: B] Short, sharp sentences showing decisive, unrelenting mechanical action. [CORRECT]
[QUIZ_OPTION: C] Flowing enjambment demonstrating the beauty of the fire.
[QUIZ_OPTION: D] A sudden change in rhyme scheme to ABAB.
[QUIZ_OPTION: E] The introduction of a completely new character.

**Explanation:**
After the longer sentences detailing his blisters, the poet ends with two highly truncated, sharp sentences. This structural shift creates a stark, brutal rhythm, proving the blacksmith ignores his injuries and performs his work purely like a machine.

---

**Q5 (Level: Extreme)**
Considering the adjectives used throughout the poem, which option best describes the overarching tone regarding the blacksmith's labor?

[QUIZ_OPTION: A] Joyful and highly energetic.
[QUIZ_OPTION: B] Grueling, oppressive, and mechanically relentless. [CORRECT]
[QUIZ_OPTION: C] Relaxing, rhythmic, and sleepy.
[QUIZ_OPTION: D] Angry, vengeful, and rebellious.
[QUIZ_OPTION: E] Luxurious, golden, and wealthy.

**Explanation:**
Adjectives like 'hollow dread', 'brutally tight', 'blisters burning', and 'weathered skin' entirely rule out joy or relaxation. The tone focuses exclusively on the agonizing, repetitive, and oppressive nature of the forge (Option B).
"""
}

# Apply additional questions to the JSON parsed data
for masterclass_block in data.get('Comprehension Masterclass', []):
    slug = masterclass_block.get('slug')
    if slug in additional_questions:
        # Append the new questions to the 'md' field
        masterclass_block['md'] += additional_questions[slug]

# Dump back to exactly the same file
with open(filepath, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Successfully injected 3 additional GL-level questions per module into eleven_plus_english_notes.json")
