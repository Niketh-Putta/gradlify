from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
    PageBreak, Table, TableStyle, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import Flowable

W, H = A4

# ── DOCUMENT ──────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    "/mnt/user-data/outputs/QE_Boys_11plus_English_Mock_Paper.pdf",
    pagesize=A4,
    leftMargin=2.2*cm, rightMargin=2.2*cm,
    topMargin=2.2*cm, bottomMargin=2.2*cm,
    title="QE Boys 11+ English Mock Paper",
    author="QE Preparation"
)

# ── STYLES ────────────────────────────────────────────────────────────────────
BASE = getSampleStyleSheet()

def S(name, parent='Normal', **kw):
    return ParagraphStyle(name, parent=BASE[parent], **kw)

st_cover_title  = S('CoverTitle', 'Title',  fontSize=22, leading=28,
                     spaceAfter=8, textColor=colors.HexColor('#1a1a2e'), alignment=TA_CENTER)
st_cover_sub    = S('CoverSub',   'Normal', fontSize=13, leading=18,
                     spaceAfter=4, textColor=colors.HexColor('#333366'), alignment=TA_CENTER)
st_cover_meta   = S('CoverMeta',  'Normal', fontSize=10, leading=14,
                     spaceAfter=3, textColor=colors.HexColor('#555555'), alignment=TA_CENTER)
st_section_hdr  = S('SecHdr',     'Heading1', fontSize=12, leading=16,
                     spaceBefore=18, spaceAfter=4,
                     textColor=colors.HexColor('#ffffff'),
                     backColor=colors.HexColor('#1a1a2e'))
st_instr        = S('Instr',      'Normal', fontSize=9, leading=13,
                     spaceBefore=4, spaceAfter=8, textColor=colors.HexColor('#444444'),
                     leftIndent=6, rightIndent=6,
                     borderPad=4)
st_passage      = S('Passage',    'Normal', fontSize=10, leading=15,
                     spaceBefore=2, spaceAfter=2, alignment=TA_JUSTIFY)
st_passage_title= S('PTitle',     'Normal', fontSize=11, leading=14,
                     spaceBefore=6, spaceAfter=8, alignment=TA_CENTER,
                     textColor=colors.HexColor('#1a1a2e'),
                     fontName='Helvetica-Bold')
st_q_num        = S('QNum',       'Normal', fontSize=10, leading=14,
                     spaceBefore=10, spaceAfter=3,
                     fontName='Helvetica-Bold',
                     textColor=colors.HexColor('#1a1a2e'))
st_q_body       = S('QBody',      'Normal', fontSize=10, leading=14,
                     spaceBefore=0, spaceAfter=3, leftIndent=16)
st_option       = S('Opt',        'Normal', fontSize=10, leading=13,
                     spaceBefore=1, spaceAfter=1, leftIndent=28)
st_seg_row      = S('SegRow',     'Normal', fontSize=10, leading=14,
                     spaceBefore=1, spaceAfter=1, leftIndent=28)
st_ak_hdr       = S('AKHdr',      'Heading2', fontSize=11, leading=15,
                     spaceBefore=14, spaceAfter=4,
                     textColor=colors.HexColor('#1a1a2e'),
                     fontName='Helvetica-Bold')
st_ak_q         = S('AKQ',        'Normal', fontSize=10, leading=14,
                     spaceBefore=8, spaceAfter=2,
                     fontName='Helvetica-Bold',
                     textColor=colors.HexColor('#1a1a2e'))
st_ak_body      = S('AKBody',     'Normal', fontSize=9.5, leading=14,
                     spaceBefore=0, spaceAfter=2,
                     leftIndent=12, textColor=colors.HexColor('#222222'))
st_rule_box     = S('RuleBox',    'Normal', fontSize=9, leading=13,
                     spaceBefore=2, spaceAfter=4,
                     leftIndent=12, rightIndent=12,
                     textColor=colors.HexColor('#003300'),
                     backColor=colors.HexColor('#eaf5ea'),
                     borderPad=6)
st_normal       = S('Norm',       'Normal', fontSize=10, leading=14,
                     spaceBefore=2, spaceAfter=2)
st_divider_lbl  = S('DivLbl',     'Normal', fontSize=8, leading=10,
                     spaceBefore=2, spaceAfter=2, alignment=TA_CENTER,
                     textColor=colors.HexColor('#888888'))

# ── HELPERS ───────────────────────────────────────────────────────────────────
def HR(color='#cccccc', thickness=0.5):
    return HRFlowable(width='100%', thickness=thickness,
                      color=colors.HexColor(color), spaceAfter=4, spaceBefore=4)

def section_header(text):
    return [
        Spacer(1, 6),
        Table([[Paragraph(text, st_section_hdr)]],
              colWidths=[doc.width],
              style=TableStyle([
                  ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#1a1a2e')),
                  ('TOPPADDING',   (0,0), (-1,-1), 6),
                  ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                  ('LEFTPADDING',  (0,0), (-1,-1), 10),
              ])),
        Spacer(1, 6),
    ]

def q_header(num, text):
    return Paragraph(f'<b>{num}.</b>&nbsp;&nbsp;{text}', st_q_num)

def option(letter, text):
    return Paragraph(f'<b>{letter})</b>&nbsp;&nbsp;{text}', st_option)

def seg_row(letter, text):
    return Paragraph(f'&nbsp;&nbsp;&nbsp;<b>{letter}.</b>&nbsp;&nbsp;{text}', st_seg_row)

def q_block(num, stem, opts, seg=False):
    """Build a KeepTogether block for one question."""
    items = [q_header(num, stem)]
    for letter, text in opts:
        if seg:
            items.append(seg_row(letter, text))
        else:
            items.append(option(letter, text))
    items.append(Spacer(1, 4))
    return KeepTogether(items)

def ak_entry(num, answer, explanation, rule=None):
    items = [
        Paragraph(f'Q{num}.&nbsp;&nbsp;<b>{answer}</b>', st_ak_q),
        Paragraph(explanation, st_ak_body),
    ]
    if rule:
        items.append(Paragraph(f'<b>Rule:</b> {rule}', st_rule_box))
    items.append(Spacer(1, 2))
    return KeepTogether(items)

# ══════════════════════════════════════════════════════════════════════════════
# BUILD STORY
# ══════════════════════════════════════════════════════════════════════════════
story = []

# ── COVER PAGE ────────────────────────────────────────────────────────────────
story += [
    Spacer(1, 3*cm),
    Paragraph("QUEEN ELIZABETH'S SCHOOL", st_cover_title),
    Paragraph("Barnet — 11+ English Entrance Examination", st_cover_sub),
    Spacer(1, 0.5*cm),
    HR('#1a1a2e', 2),
    Spacer(1, 0.4*cm),
    Paragraph("MOCK PAPER — FULL EXAMINATION", st_cover_sub),
    Spacer(1, 1.5*cm),
    Paragraph("Time allowed: <b>45 minutes</b>", st_cover_meta),
    Paragraph("Total questions: <b>70</b>", st_cover_meta),
    Spacer(1, 1.5*cm),
    HR('#cccccc'),
    Spacer(1, 0.5*cm),
    Paragraph("<b>INSTRUCTIONS</b>", st_cover_meta),
    Spacer(1, 0.3*cm),
    Paragraph("Answer ALL questions.", st_cover_meta),
    Paragraph("For questions 1–60, choose ONE answer from the options given.", st_cover_meta),
    Paragraph("For questions 61–70, choose the word or phrase that best completes the sentence.", st_cover_meta),
    Paragraph("Work as quickly and as carefully as you can.", st_cover_meta),
    Paragraph("Do not spend too long on any one question.", st_cover_meta),
    Spacer(1, 2*cm),
    HR('#1a1a2e', 2),
    PageBreak(),
]

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1: FICTION
# ══════════════════════════════════════════════════════════════════════════════
story += section_header("SECTION 1: FICTION COMPREHENSION   |   Questions 1–20")

story.append(Paragraph(
    "<b>Instructions:</b> Read the following passage carefully before answering the questions.",
    st_instr))

story.append(Paragraph("THE WATCHMAKER'S APPRENTICE", st_passage_title))
story.append(HR())

fiction_paras = [
    ("",
     "The shop occupied the narrowest premises on Calloway Street, wedged between a pawnbroker "
     "and a printer's yard as though the city itself had forgotten to leave sufficient room for it. "
     "A single gas lamp burned in the window, illuminating a row of clocks whose faces stared "
     "outward with the blank authority of judges. It was here that Edmund Pell had spent the last "
     "fourteen months of his life, and here, on a Tuesday morning in November, that he began to "
     "understand what he had agreed to."),
    ("",
     "Mr. Crabtree did not speak before ten o'clock. This was not a rule he had stated; it was "
     "simply a condition of the premises, like the smell of machine oil and the particular cold "
     "that came up through the floorboards regardless of the season. Edmund had learned this in "
     "his first week, as he had learned a great many things: that Mr. Crabtree's hands, though "
     "gnarled at the knuckle, moved with a surgeon's precision; that the magnifying glass was "
     "never to be set down on the workbench face-downward; that gratitude, when it came, arrived "
     "without announcement and was rarely repeated."),
    ("",
     "On this particular morning, a woman entered the shop at twenty minutes past nine. She was "
     "dressed in mourning — black wool, black gloves, a veil so fine it seemed more like shadow "
     "than fabric — and she carried a clock in both hands as one might carry something that had "
     "once been alive. Edmund straightened at once. Mr. Crabtree did not move."),
    ("",
     "\u201cI was told,\u201d the woman said, addressing Mr. Crabtree\u2019s back, \u201cthat you are "
     "the only man in this part of the city who can repair a Viennese escapement.\u201d"),
    ("",
     "Mr. Crabtree continued to work. The silence stretched. Edmund felt the blood rise in his face."),
    ("",
     "\u201cMy husband wound this clock on the morning he died,\u201d she said, more quietly. "
     "\u201cIt has not been touched since.\u201d"),
    ("",
     "There was a pause — not an empty one, but weighted, as though the room were considering "
     "her words along with its inhabitants. Then Mr. Crabtree set down his instrument, turned "
     "on his stool, and looked at the woman fully for the first time."),
    ("",
     "\u201cLeave it,\u201d he said. \u201cCome back Thursday.\u201d"),
    ("",
     "The woman placed the clock on the counter with a care that Edmund found almost unbearable "
     "to watch. She left without another word. When the door had closed and the bell above it had "
     "ceased to shiver, Mr. Crabtree returned to his work without comment. Edmund waited for "
     "something — an explanation, a softening. Neither came."),
    ("",
     "He looked at the clock. It was a beautiful object: dark walnut case, a face of cream enamel, "
     "and hands of such fine brass that they seemed hardly capable of bearing the weight of time. "
     "And it had stopped, he noticed, at seven minutes past four."),
]

for _, p in fiction_paras:
    story.append(Paragraph(p, st_passage))
    story.append(Spacer(1, 4))

story.append(HR())
story.append(Spacer(1, 6))

# Fiction questions
fq = [
    (1, "According to the passage, which of the following best describes the location of Mr. Crabtree's shop?",
     [("A","It was situated at the end of a busy commercial street near a market"),
      ("B","It was uncomfortably narrow, positioned between two other businesses"),
      ("C","It was a well-known landmark on Calloway Street, identifiable by its gas lamps"),
      ("D","It was hidden from view, accessible only through the printer's yard")]),
    (2, "What does the phrase <i>\u201cthe blank authority of judges\u201d</i> (paragraph 1) suggest about the clocks in the window?",
     [("A","That the clocks were old and their faces had faded with age"),
      ("B","That the clocks appeared to observe and pass silent judgement on passers-by"),
      ("C","That the clocks were arranged formally, as though prepared for inspection"),
      ("D","That the clocks kept perfect time, as reliable as a court of law")]),
    (3, "The detail that Mr. Crabtree did not speak before ten o'clock is presented as:",
     [("A","A strict rule he had communicated to Edmund on his first day"),
      ("B","An unspoken condition of the workplace that Edmund had deduced himself"),
      ("C","A habit Edmund found rude and difficult to accept"),
      ("D","A professional custom common among craftsmen of Mr. Crabtree's trade")]),
    (4, "Which of the following best explains what Edmund learned about gratitude in Mr. Crabtree's shop?",
     [("A","That Mr. Crabtree expressed it only when a particularly difficult repair was completed"),
      ("B","That it was offered occasionally but never elaborated upon or returned to"),
      ("C","That Mr. Crabtree considered it an unnecessary distraction from precise work"),
      ("D","That Edmund himself had learned to withhold it, following his employer's example")]),
    (5, "The woman\u2019s clock is described as being carried \u201cas one might carry something that had once been alive.\u201d What does this comparison most strongly imply?",
     [("A","That the clock was extremely fragile and she feared dropping it"),
      ("B","That the clock held deep personal significance and was associated with loss"),
      ("C","That the woman was unaccustomed to carrying heavy or awkward objects"),
      ("D","That the clock had once belonged to a person of great importance")]),
    (6, "What is the most likely reason Edmund\u2019s \u201cblood rose in his face\u201d when Mr. Crabtree remained silent?",
     [("A","He was embarrassed by the woman's emotional display in a professional setting"),
      ("B","He was frustrated that Mr. Crabtree had not yet permitted him to speak"),
      ("C","He felt the discomfort of Mr. Crabtree's apparent rudeness towards a grieving customer"),
      ("D","He was anxious that the woman would leave before a repair could be agreed upon")]),
    (7, "What does the phrase \u201cnot an empty one, but weighted\u201d suggest about the pause following the woman\u2019s second statement?",
     [("A","That the room had become uncomfortably silent after a period of noise"),
      ("B","That the pause carried emotional and moral significance for those present"),
      ("C","That Mr. Crabtree was calculating the cost of the repair before responding"),
      ("D","That Edmund was uncertain whether the woman intended to speak again")]),
    (8, "Mr. Crabtree\u2019s response \u2014 \u201cLeave it. Come back Thursday.\u201d \u2014 is best described as:",
     [("A","Dismissive, suggesting he had little interest in the emotional circumstances of the repair"),
      ("B","Efficient and compassionate, in his own austere manner"),
      ("C","Deliberately cold, intended to discourage customers from sharing personal information"),
      ("D","Professionally cautious, as he was not yet certain the clock could be repaired")]),
    (9, "Why does Edmund find the woman\u2019s placing of the clock on the counter \u201calmost unbearable to watch\u201d?",
     [("A","He was concerned the woman might damage the delicate mechanism"),
      ("B","He was moved by the tenderness of the gesture and its association with grief"),
      ("C","He found the entire encounter awkward and wished it to conclude"),
      ("D","He was eager to examine the clock himself and found the delay frustrating")]),
    (10, "Which word is closest in meaning to \u201cgnarled\u201d as used in paragraph 2?",
     [("A","Steady"), ("B","Twisted"), ("C","Slender"), ("D","Scarred")]),
    (11, "What does the passage suggest about Mr. Crabtree\u2019s character through the detail of the magnifying glass?",
     [("A","That he was possessive of his tools and distrustful of Edmund"),
      ("B","That he maintained exacting standards of care in his workshop"),
      ("C","That he had suffered a previous apprentice who had broken his equipment"),
      ("D","That he was unable to work effectively without particular instruments")]),
    (12, "The woman is described as wearing \u201ca veil so fine it seemed more like shadow than fabric.\u201d What effect does this description create?",
     [("A","It emphasises the poor quality of the woman's mourning dress"),
      ("B","It creates an impression of the woman as barely present, almost ghostly"),
      ("C","It suggests the woman was attempting to conceal her identity in the shop"),
      ("D","It draws attention to the contrast between the woman and her surroundings")]),
    (13, "Which of the following pieces of evidence best supports the idea that Edmund is still learning to navigate his employer\u2019s expectations?",
     [("A","\u201cEdmund had learned this in his first week\u201d"),
      ("B","\u201cEdmund straightened at once\u201d"),
      ("C","\u201cEdmund waited for something \u2014 an explanation, a softening\u201d"),
      ("D","\u201cHe looked at the clock\u201d")]),
    (14, "The narrator describes the shop\u2019s cold as coming \u201cup through the floorboards regardless of the season.\u201d This detail primarily serves to:",
     [("A","Suggest the shop is located in an unusually cold part of the city"),
      ("B","Indicate that Mr. Crabtree is too frugal to heat his premises properly"),
      ("C","Establish the shop as a place of permanent, unchanging austerity"),
      ("D","Create sympathy for Edmund, who suffers physical discomfort during his apprenticeship")]),
    (15, "Which of the following best describes the overall mood of the passage?",
     [("A","Melancholy and oppressive, reflecting Edmund's unhappiness in his position"),
      ("B","Restrained and sombre, with grief and quiet dignity running beneath the surface"),
      ("C","Tense and confrontational, building towards an unresolved conflict"),
      ("D","Nostalgic and warm, evoking a lost world of traditional craftsmanship")]),
    (16, "The clock is described as having \u201chands of such fine brass that they seemed hardly capable of bearing the weight of time.\u201d This phrase is best understood as:",
     [("A","A literal observation about the physical fragility of the clock's mechanism"),
      ("B","A figurative suggestion that the clock is too delicate to function reliably"),
      ("C","A poetic expression linking the clock's beauty to the burden of memory and time"),
      ("D","An indication that the clock was poorly made despite its attractive appearance")]),
    (17, "Why does the writer choose to end the passage with the detail that the clock had stopped at seven minutes past four?",
     [("A","To provide a clue about the time at which the woman's husband died"),
      ("B","To show that Edmund is more interested in the clock's history than in his work"),
      ("C","To highlight Edmund's technical curiosity about the clock's mechanism"),
      ("D","To suggest that Mr. Crabtree will be able to identify the fault immediately")]),
    (18, "The phrase \u201cas though the city itself had forgotten to leave sufficient room for it\u201d is an example of which literary technique?",
     [("A","Simile"), ("B","Hyperbole"), ("C","Personification"), ("D","Pathetic fallacy")]),
    (19, "What does the passage imply about the relationship between Edmund and Mr. Crabtree at this point in the story?",
     [("A","Edmund respects Mr. Crabtree but finds his manner bewildering and sometimes painful"),
      ("B","Edmund admires Mr. Crabtree unreservedly and models his own behaviour on him"),
      ("C","Edmund resents Mr. Crabtree's silences and is considering leaving the apprenticeship"),
      ("D","Edmund and Mr. Crabtree have developed a quiet mutual understanding over time")]),
    (20, "Which of the following statements about Mr. Crabtree is best supported by the passage as a whole?",
     [("A","He is a man whose coldness conceals indifference to the suffering of others"),
      ("B","He is a skilled craftsman whose unconventional manner masks a deeper sensitivity"),
      ("C","He is a professional who separates his personal feelings entirely from his work"),
      ("D","He is a private man who resents being disturbed by customers with emotional requests")]),
]

for num, stem, opts in fq:
    story.append(q_block(num, stem, opts))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2: NON-FICTION
# ══════════════════════════════════════════════════════════════════════════════
story += section_header("SECTION 2: NON-FICTION COMPREHENSION   |   Questions 21–40")

story.append(Paragraph(
    "<b>Instructions:</b> Read the following passage carefully before answering the questions.",
    st_instr))

story.append(Paragraph("THE DEEP OCEAN: EARTH'S LEAST KNOWN FRONTIER", st_passage_title))
story.append(HR())

nf_paras = [
    "Of all the environments on Earth, the deep ocean remains the least understood and the most "
    "difficult to reach. More than eighty percent of the world's oceans have never been mapped in "
    "detail, and scientists estimate that the vast majority of deep-sea species have yet to be "
    "identified, let alone studied. In this respect, the ocean floor represents a more profound "
    "frontier than outer space: we have better maps of the surface of Mars than we do of the "
    "seabed beneath our own oceans.",

    "The principal obstacle is pressure. At a depth of one thousand metres, the surrounding water "
    "exerts a force approximately one hundred times greater than atmospheric pressure at sea level. "
    "At the deepest point on Earth \u2014 the Challenger Deep in the Mariana Trench, which descends "
    "to nearly eleven thousand metres \u2014 the pressure is so extreme that only a handful of "
    "purpose-built submersibles have ever made the descent. The engineering demands alone are "
    "formidable: a vessel must be capable of withstanding pressures that would crush conventional "
    "steel hulls in seconds, while simultaneously housing sensitive scientific equipment and, in "
    "some cases, human crew members.",

    "Despite these obstacles, the discoveries made in the deep ocean have repeatedly overturned "
    "what scientists believed to be fundamental biological principles. Until the 1970s, it was "
    "widely assumed that life could not exist in environments entirely devoid of sunlight, since "
    "photosynthesis \u2014 the process by which plants and other organisms convert light into energy "
    "\u2014 was considered the essential foundation of all food chains. The discovery of hydrothermal "
    "vents in 1977, however, challenged this assumption entirely. Located along the boundaries of "
    "tectonic plates, these vents release superheated water \u2014 sometimes exceeding four hundred "
    "degrees Celsius \u2014 along with dissolved minerals and chemicals. Entire ecosystems had evolved "
    "to thrive in these conditions, sustained not by sunlight but by a process called chemosynthesis, "
    "in which bacteria convert chemical energy from the vents into organic matter that supports the "
    "surrounding food chain.",

    "The implications of this discovery extended far beyond marine biology. If complex life could "
    "sustain itself in complete darkness, at crushing pressures and near-boiling temperatures, "
    "scientists were forced to reconsider the conditions under which life might exist elsewhere in "
    "the solar system. Particular attention turned to Europa, one of Jupiter\u2019s moons, which is "
    "believed to harbour a vast liquid ocean beneath its frozen surface. If hydrothermal activity "
    "occurs at the floor of Europa\u2019s ocean \u2014 as some scientists believe it may \u2014 then "
    "the conditions necessary for chemosynthetic life might already be present.",

    "The technological advances required to explore the deep ocean have also produced methods with "
    "broad applications beyond oceanography. Remotely operated vehicles, or ROVs, which were "
    "originally developed to service offshore oil infrastructure, have since been adapted for "
    "deep-sea scientific exploration. Modern ROVs can descend to depths of several kilometres, "
    "transmitting high-definition video footage and collecting biological and geological samples "
    "via robotic arms. The data gathered from these missions has not only expanded our knowledge "
    "of deep-sea biology but has also contributed to our understanding of plate tectonics, "
    "underwater geology, and the chemical composition of the ocean at depth.",

    "Nevertheless, significant challenges remain. Deep-sea expeditions are extraordinarily "
    "expensive \u2014 a single research cruise can cost hundreds of thousands of pounds \u2014 and "
    "the inaccessibility of the environment means that even the most sophisticated equipment is "
    "prone to failure at extreme depths. Furthermore, the very act of exploration carries risks: "
    "the presence of submersibles and ROVs may disturb ecosystems that have evolved in conditions "
    "of almost complete stability over millions of years. Scientists are increasingly aware that "
    "the desire to understand the deep ocean must be balanced against the responsibility to "
    "protect it.",
]

for p in nf_paras:
    story.append(Paragraph(p, st_passage))
    story.append(Spacer(1, 4))

story.append(HR())
story.append(Spacer(1, 6))

nfq = [
    (21, "According to the first paragraph, which of the following comparisons does the writer make?",
     [("A","The deep ocean is more dangerous to explore than the surface of Mars"),
      ("B","We have more detailed maps of Mars than of the ocean floor"),
      ("C","The ocean floor is larger in area than the surface of Mars"),
      ("D","Outer space has been explored more recently than the deep ocean")]),
    (22, "What is identified in the passage as the \u201cprincipal obstacle\u201d to deep-sea exploration?",
     [("A","The absence of light at extreme depths"),
      ("B","The cost of building and operating submersibles"),
      ("C","The immense pressure exerted by water at depth"),
      ("D","The instability of the ocean floor near tectonic boundaries")]),
    (23, "According to the passage, what engineering challenge do deep-sea vessels face beyond withstanding pressure?",
     [("A","Navigating the unpredictable currents near hydrothermal vents"),
      ("B","Communicating with the surface through several kilometres of water"),
      ("C","Housing scientific equipment and sometimes human crew members"),
      ("D","Operating effectively in temperatures that exceed four hundred degrees")]),
    (24, "Which word is closest in meaning to \u201cdevoid\u201d as used in paragraph 3?",
     [("A","Resistant"), ("B","Deprived"), ("C","Ignorant"), ("D","Entirely lacking")]),
    (25, "What was the significance of the 1977 discovery of hydrothermal vents?",
     [("A","It proved that photosynthesis could occur in deep-sea environments"),
      ("B","It demonstrated that ecosystems could be sustained without sunlight"),
      ("C","It confirmed that tectonic plate boundaries were biologically rich"),
      ("D","It provided the first evidence that superheated water could support bacteria")]),
    (26, "According to the passage, how do chemosynthetic bacteria sustain the ecosystems around hydrothermal vents?",
     [("A","By absorbing heat energy directly from the vent water"),
      ("B","By converting chemical energy from the vents into organic matter"),
      ("C","By filtering dissolved minerals from the surrounding water"),
      ("D","By photosynthesising at low light levels near the ocean floor")]),
    (27, "The writer states that the discovery of hydrothermal vent ecosystems \u201cextended far beyond marine biology.\u201d What does this refer to?",
     [("A","The discovery improved the engineering techniques used to build submersibles"),
      ("B","It suggested that life might be possible in extreme environments elsewhere in the solar system"),
      ("C","It prompted international cooperation in deep-sea conservation efforts"),
      ("D","It established that tectonic plate activity could generate enough energy to support ecosystems")]),
    (28, "Why does the writer draw attention to Europa in paragraph 4?",
     [("A","To illustrate how deep-sea technology could be used in space exploration"),
      ("B","To provide an example of a location where chemosynthetic life has been confirmed"),
      ("C","To suggest a location where conditions similar to hydrothermal vents may exist"),
      ("D","To contrast the conditions on Europa with those found in Earth\u2019s deep oceans")]),
    (29, "According to the passage, what were ROVs originally developed to do?",
     [("A","Collect biological samples from hydrothermal vent ecosystems"),
      ("B","Service offshore oil infrastructure"),
      ("C","Conduct deep-sea geological surveys"),
      ("D","Map the seabed in regions inaccessible to crewed submersibles")]),
    (30, "Which of the following best summarises the range of knowledge that ROV missions have contributed to, according to paragraph 5?",
     [("A","Marine biology, plate tectonics, underwater geology, and ocean chemistry"),
      ("B","Marine biology, hydrothermal vent ecology, and submersible design"),
      ("C","Oceanography, offshore engineering, and space exploration technology"),
      ("D","Plate tectonics, atmospheric science, and deep-sea conservation")]),
    (31, "What does the word \u201cformidable\u201d mean as used in paragraph 2?",
     [("A","Dangerous"), ("B","Impressive"), ("C","Extremely demanding"), ("D","Largely unsolvable")]),
    (32, "According to the final paragraph, what concern do scientists increasingly hold about deep-sea exploration?",
     [("A","That the cost of exploration makes it impossible to sustain long-term research programmes"),
      ("B","That the presence of equipment may damage ecosystems evolved in conditions of great stability"),
      ("C","That the data gathered by ROVs is insufficiently detailed to support meaningful conclusions"),
      ("D","That the failure rate of deep-sea equipment undermines the reliability of scientific findings")]),
    (33, "The writer describes the pressure at the Challenger Deep as capable of crushing \u201cconventional steel hulls in seconds.\u201d What is the purpose of this detail?",
     [("A","To explain why the Mariana Trench has only been explored by ROVs rather than crewed vessels"),
      ("B","To convey the extraordinary scale of the engineering challenge involved in deep-sea exploration"),
      ("C","To demonstrate that current technology is entirely inadequate for reaching the deepest ocean points"),
      ("D","To contrast the limitations of steel construction with newer materials used in modern submersibles")]),
    (34, "Which of the following best describes the overall structure of the passage?",
     [("A","A problem is introduced, followed by historical context, then recent discoveries, and finally a balanced conclusion"),
      ("B","A series of arguments for and against deep-sea exploration, leading to a definitive conclusion"),
      ("C","A chronological account of deep-sea exploration from the nineteenth century to the present day"),
      ("D","An explanation of hydrothermal vents followed by an assessment of their biological importance")]),
    (35, "The phrase \u201ca more profound frontier than outer space\u201d is used to suggest that the deep ocean is:",
     [("A","More scientifically important than space exploration"),
      ("B","More poorly understood and less accessible than is commonly assumed"),
      ("C","More hostile to human life than the vacuum of space"),
      ("D","More likely to yield significant scientific discoveries in future")]),
    (36, "According to the passage, what assumption did scientists hold before the 1970s regarding deep-sea life?",
     [("A","That the deep ocean was entirely uninhabited due to its extreme conditions"),
      ("B","That life without access to sunlight was biologically impossible"),
      ("C","That deep-sea organisms relied on nutrients descending from shallower water"),
      ("D","That photosynthesis could not function effectively below one thousand metres")]),
    (37, "Which of the following is NOT mentioned in the passage as a challenge facing deep-sea exploration?",
     [("A","The extreme cost of research expeditions"),
      ("B","The risk of damaging fragile ecosystems"),
      ("C","The difficulty of recruiting trained crew for deep-sea missions"),
      ("D","The unreliability of equipment at extreme depths")]),
    (38, "What does the passage imply about the relationship between commercial technology and scientific research?",
     [("A","Commercial pressures have consistently slowed the development of deep-sea research tools"),
      ("B","Technology developed for industrial purposes can subsequently be adapted for scientific use"),
      ("C","Scientific research has driven advances in offshore commercial engineering"),
      ("D","The two fields have developed in isolation, with few shared technologies")]),
    (39, "Which of the following words best describes the tone of the passage as a whole?",
     [("A","Enthusiastic and persuasive"),
      ("B","Cautious and pessimistic"),
      ("C","Informative and measured"),
      ("D","Technical and inaccessible")]),
    (40, "Which of the following statements is best supported by the passage as a whole?",
     [("A","The deep ocean will remain beyond the reach of scientific study for the foreseeable future"),
      ("B","The exploration of the deep ocean has transformed our understanding of life and carries significant responsibilities"),
      ("C","Advances in ROV technology have made deep-sea exploration broadly affordable and routine"),
      ("D","The primary motivation for deep-sea research is the search for life in the solar system")]),
]

for num, stem, opts in nfq:
    story.append(q_block(num, stem, opts))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3: SPELLING
# ══════════════════════════════════════════════════════════════════════════════
story += section_header("SECTION 3: SPELLING   |   Questions 41–50")

story.append(Paragraph(
    "<b>Instructions:</b> Each question contains a sentence divided into four sections labelled "
    "A, B, C and D. One section may contain a spelling mistake. If you find a spelling mistake, "
    "choose that letter. If there is no spelling mistake, choose <b>N</b>.",
    st_instr))

spelling_qs = [
    (41, [("A","The professor had"),
          ("B","dedicated his entire carreer"),
          ("C","to the study of"),
          ("D","ancient civilisations."),
          ("N","No mistake")]),
    (42, [("A","She arranged the documents"),
          ("B","in alphabetical order"),
          ("C","before submitting them"),
          ("D","to the commitee."),
          ("N","No mistake")]),
    (43, [("A","It was immediately"),
          ("B","apparant that the bridge"),
          ("C","had not been maintained"),
          ("D","for several decades."),
          ("N","No mistake")]),
    (44, [("A","The soldiers marched"),
          ("B","in formation through"),
          ("C","the narrow streets"),
          ("D","of the ancient city."),
          ("N","No mistake")]),
    (45, [("A","His conscience"),
          ("B","would not permit him"),
          ("C","to remain silient"),
          ("D","in the face of such injustice."),
          ("N","No mistake")]),
    (46, [("A","The headteacher gave"),
          ("B","a particularly"),
          ("C","eloquent speech"),
          ("D","at the anual prize-giving ceremony."),
          ("N","No mistake")]),
    (47, [("A","Despite the difficulties,"),
          ("B","she remained"),
          ("C","remarkably persistant"),
          ("D","throughout the investigation."),
          ("N","No mistake")]),
    (48, [("A","The museum's"),
          ("B","newest aquisition"),
          ("C","attracted considerable"),
          ("D","attention from scholars worldwide."),
          ("N","No mistake")]),
    (49, [("A","The parliament"),
          ("B","voted unanimously"),
          ("C","to reccommend"),
          ("D","a full public inquiry."),
          ("N","No mistake")]),
    (50, [("A","The temperature"),
          ("B","in the laboratory"),
          ("C","must remain"),
          ("D","consistent throughout the experiment."),
          ("N","No mistake")]),
]

for num, segs in spelling_qs:
    items = [q_header(num, "")]
    for letter, text in segs:
        items.append(seg_row(letter, text))
    items.append(Spacer(1, 4))
    story.append(KeepTogether(items))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4: PUNCTUATION
# ══════════════════════════════════════════════════════════════════════════════
story += section_header("SECTION 4: PUNCTUATION   |   Questions 51–60")

story.append(Paragraph(
    "<b>Instructions:</b> Each question contains a sentence divided into four sections labelled "
    "A, B, C and D. One section may contain a punctuation mistake. If you find a punctuation "
    "mistake, choose that letter. If there is no punctuation mistake, choose <b>N</b>.",
    st_instr))

punct_qs = [
    (51, [("A",'\u201cI cannot believe'),
          ("B",'you have done this\u201d'),
          ("C",'said Mr. Hartley,'),
          ("D",'turning sharply away.'),
          ("N","No mistake")]),
    (52, [("A","The results however"),
          ("B","were far more"),
          ("C","significant than the"),
          ("D","researchers had anticipated."),
          ("N","No mistake")]),
    (53, [("A","After the long journey"),
          ("B","the explorers set up camp"),
          ("C","beside the river,"),
          ("D","exhausted but determined."),
          ("N","No mistake")]),
    (54, [("A","It was Charless"),
          ("B","responsibility to ensure"),
          ("C","that the equipment"),
          ("D","was secured before nightfall."),
          ("N","No mistake")]),
    (55, [("A","The children\u2019s coats"),
          ("B","were hanging neatly"),
          ("C","in the corridor however"),
          ("D","their boots were missing."),
          ("N","No mistake")]),
    (56, [("A",'\u201cWe will depart'),
          ("B",'at dawn,\u201d announced'),
          ("C",'the general, \u201cand we'),
          ("D",'will not look back.\u201d'),
          ("N","No mistake")]),
    (57, [("A","Having reviewed"),
          ("B","all of the evidence,"),
          ("C","the judge concluded that"),
          ("D","the verdict was unsafe."),
          ("N","No mistake")]),
    (58, [("A","The three main rivers,"),
          ("B","the Nile, the Amazon"),
          ("C","and the Yangtze,"),
          ("D","are among the worlds longest."),
          ("N","No mistake")]),
    (59, [("A","The scientist who"),
          ("B","had spent thirty years"),
          ("C","on the project finally"),
          ("D","published her findings."),
          ("N","No mistake")]),
    (60, [("A","It was an unusually"),
          ("B","warm evening; the guests"),
          ("C","gathered on the terrace"),
          ("D","and waited for the announcement."),
          ("N","No mistake")]),
]

for num, segs in punct_qs:
    items = [q_header(num, "")]
    for letter, text in segs:
        items.append(seg_row(letter, text))
    items.append(Spacer(1, 4))
    story.append(KeepTogether(items))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5: GRAMMAR  (Q65 changed to Hardly…when)
# ══════════════════════════════════════════════════════════════════════════════
story += section_header("SECTION 5: GRAMMAR   |   Questions 61–70")

story.append(Paragraph(
    "<b>Instructions:</b> Each question contains a sentence with one word or phrase missing. "
    "Choose the word or phrase from the options below that best completes the sentence.",
    st_instr))

grammar_qs = [
    (61, "The committee, along with several independent advisors, _____ yet to reach a final decision.",
     [("A","have"),("B","are"),("C","is"),("D","were"),("E","being")]),
    (62, "By the time the rescue team arrived, the survivors _____ in the cave for over forty hours.",
     [("A","waited"),("B","were waiting"),("C","have waited"),("D","had been waiting"),("E","would wait")]),
    (63, "The new policy will affect not only the students _____ the teaching staff as well.",
     [("A","but also"),("B","and also"),("C","but even"),("D","and too"),("E","as well as")]),
    (64, "He was the sort of man _____ presence could silence a room without a word being spoken.",
     [("A","which"),("B","that"),("C","whom"),("D","whose"),("E","who")]),
    # ── Q65 CHANGED: Hardly…when ──────────────────────────────────────────────
    (65, "Hardly had the first shots been fired _____ the soldiers retreated to the ridge.",
     [("A","than"),("B","when"),("C","then"),("D","before"),("E","as")]),
    # ─────────────────────────────────────────────────────────────────────────
    (66, "She found the second examination considerably _____ than the first.",
     [("A","more difficult"),("B","difficulter"),("C","most difficult"),("D","much difficult"),("E","difficultly")]),
    (67, "The evidence suggested that neither of the suspects _____ in the building at the time.",
     [("A","were"),("B","have been"),("C","are"),("D","was"),("E","had been")]),
    (68, "The bridge, _____ construction had taken six years, was officially opened last spring.",
     [("A","which"),("B","whose"),("C","that"),("D","whom"),("E","of which")]),
    (69, "_____ the report was incomplete, the board decided to proceed with the vote.",
     [("A","Despite"),("B","Although"),("C","Unless"),("D","Even so"),("E","Whereas")]),
    (70, "The delegation arrived later _____ expected, having been delayed by severe weather conditions.",
     [("A","as"),("B","like"),("C","than"),("D","from"),("E","then")]),
]

for num, stem, opts in grammar_qs:
    story.append(q_block(num, stem, opts))

story.append(PageBreak())

# ══════════════════════════════════════════════════════════════════════════════
# ANSWER KEY
# ══════════════════════════════════════════════════════════════════════════════
story += section_header("FULL ANSWER KEY WITH EXPLANATIONS")

# ── FICTION AK ────────────────────────────────────────────────────────────────
story.append(Paragraph("SECTION 1: FICTION COMPREHENSION", st_ak_hdr))
story.append(HR())

fiction_ak = [
    (1,"B","The passage states the shop was \u201cwedged between a pawnbroker and a printer's yard.\u201d A invents a nearby market. C misreads the gas lamp as a landmark. D fabricates restricted access."),
    (2,"B","\u201cBlank authority of judges\u201d is a metaphor attributing silent, impassive judgement to the clocks. A focuses on age, which is not implied. C interprets \u201cauthority\u201d too literally. D makes an unsupported leap to accuracy."),
    (3,"B","The passage explicitly states: \u201cThis was not a rule he had stated; it was simply a condition of the premises.\u201d A directly contradicts this. C is a plausible emotional reading but unsupported. D imports a cultural assumption not mentioned."),
    (4,"B","The passage says gratitude \u201carrived without announcement and was rarely repeated\u201d, occasional and unrepeated. A adds the condition of difficult repairs, which is not stated. C is a tempting inference but unconfirmed. D is invented."),
    (5,"B","The simile evokes death and personal loss, immediately reinforced by the revelation that her husband wound the clock on the morning he died. A focuses on fragility alone. C is irrelevant. D is too vague."),
    (6,"C","Edmund \u201cstraightened at once\u201d when the woman entered, showing social awareness. His discomfort arises from observing what reads as rudeness toward a grieving customer. A projects an unsupported judgement. B is plausible but Edmund is not described as wanting to speak. D introduces commercial anxiety not evidenced."),
    (7,"B","The pause is described as \u201cweighted\u201d, explicitly contrasted with being empty, carrying moral and emotional significance. C is a plausible distractor but no calculation is indicated. D misidentifies whose uncertainty is described."),
    (8,"B","Despite its brevity, Crabtree\u2019s response shows he has listened: he turns, looks at her \u201cfully,\u201d and agrees to take the clock. A is the most tempting wrong answer, brevity reads as dismissiveness, but the act of turning directly contradicts this. C adds malicious intent not evidenced. D adds uncertainty about repair not stated."),
    (9,"B","The gesture is described as \u201calmost unbearable to watch\u201d, an emotional response linked to the grief embodied in the action. A mistakes emotional unbearability for practical concern. C contradicts his attentive behaviour. D is possible but the text frames the moment in terms of grief."),
    (10,"B","\u201cGnarled\u201d means twisted or knotted, particularly of aged hands or wood. A (steady) is opposite. C (slender) contradicts it. D (scarred) relates to damage but is not the meaning."),
    (11,"B","The rule about the magnifying glass, one of several precise instructions, collectively establishes rigorous standards. A adds distrust without evidence. C invents a backstory. D is partially true but misses the standards emphasis."),
    (12,"B","The simile of the veil as \u201cshadow rather than fabric\u201d creates an impression of the woman as insubstantial and half-present, consistent with grief\u2019s effect. A judges quality, which is not suggested. C invents a concealment motivation. D is possible but secondary."),
    (13,"C","\u201cEdmund waited for something, an explanation, a softening. Neither came.\u201d This directly shows ongoing navigation of unfamiliar expectations. A refers to past learning, not current difficulty. B shows alertness, not uncertainty. D is neutral observation."),
    (14,"C","The cold \u201cregardless of the season\u201d makes it permanent and unvarying, characterising the shop as unchangingly austere. A introduces geography without basis. B infers miserliness, which is possible but not stated. D is secondary."),
    (15,"B","The passage maintains emotional restraint throughout, grief is present but never voiced dramatically. A (melancholy and oppressive) overstates. C (confrontational) misreads the encounter. D (nostalgic and warm) is wrong, the tone is too cool and spare."),
    (16,"C","The \u201cweight of time\u201d is metaphorical, linking the fragile hands to the burden of memory and loss. A and B take the phrase too literally. D introduces a negative judgement contradicted by the admiring description."),
    (17,"A","The stopped time is the passage\u2019s final image, clearly linked to the husband\u2019s death. B misreads Edmund\u2019s gaze as self-interest. C focuses on technical curiosity, which the passage does not foreground here. D has no support."),
    (18,"C","Attributing the act of \u201cforgetting\u201d to the city is personification, giving a non-human entity a human mental action. A (simile) requires \u201clike\u201d or \u201cas\u201d as a direct comparison marker. B (hyperbole) is exaggeration for effect. D (pathetic fallacy) involves emotion projected onto weather."),
    (19,"A","Edmund respects and observes Crabtree carefully but also \u201cwaited for something, an explanation, a softening. Neither came\u201d, capturing both respect and pained bewilderment. B is too straightforward. C introduces resentment not evidenced. D overstates mutual understanding."),
    (20,"B","Crabtree\u2019s turning, looking \u201cfully,\u201d and agreeing to take the clock suggest quiet attentiveness beneath an austere exterior. A is the most tempting wrong answer, his silences read as coldness, but his response directly contradicts indifference. C is contradicted by his response. D is contradicted by his willingness to help."),
]
for num, ans, expl in fiction_ak:
    story.append(ak_entry(num, ans, expl))

story.append(PageBreak())

# ── NON-FICTION AK ───────────────────────────────────────────────────────────
story.append(Paragraph("SECTION 2: NON-FICTION COMPREHENSION", st_ak_hdr))
story.append(HR())

nf_ak = [
    (21,"B","The passage states: \u201cwe have better maps of the surface of Mars than we do of the seabed beneath our own oceans.\u201d A is not stated. C makes a claim about area not in the text. D reverses the implication."),
    (22,"C","The passage explicitly names pressure as \u201cthe principal obstacle\u201d in paragraph 2. A (absence of light) is real but not identified as principal. B (cost) is mentioned only in the final paragraph. D (tectonic instability) is not mentioned as an obstacle."),
    (23,"C","Paragraph 2 states a vessel must house \u201csensitive scientific equipment and, in some cases, human crew members.\u201d A (currents) is not mentioned. B (communication) is not discussed. D misreads the temperature detail."),
    (24,"D","\u201cDevoid\u201d means entirely lacking or completely without. B (deprived) implies something has been taken away, whereas devoid describes an absolute absence. A and C are unrelated."),
    (25,"B","The passage states that entire ecosystems evolved to thrive without sunlight, directly overturning the assumption about photosynthesis. A is wrong, photosynthesis does not occur at vents. C overstates. D is too narrow."),
    (26,"B","The passage states explicitly that bacteria \u201cconvert chemical energy from the vents into organic matter that supports the surrounding food chain.\u201d A is a misreading. C is not described. D directly contradicts the passage."),
    (27,"B","Paragraph 4 explains that the discovery prompted scientists to reconsider whether life might exist elsewhere in the solar system. A refers to engineering advances mentioned separately. C is not mentioned. D is a partial reading of vent conditions."),
    (28,"C","Europa is introduced as a location where hydrothermal activity may produce conditions similar to deep-sea vents, potentially supporting chemosynthetic life. A reverses the direction. B is wrong, no life has been confirmed on Europa. D is wrong, the passage draws a parallel, not a contrast."),
    (29,"B","The passage states explicitly that ROVs \u201cwere originally developed to service offshore oil infrastructure.\u201d A, C and D all describe subsequent scientific uses, not the original purpose."),
    (30,"A","Paragraph 5 states ROV missions contributed to knowledge of \u201cdeep-sea biology,\u201d \u201cplate tectonics,\u201d \u201cunderwater geology,\u201d and \u201cthe chemical composition of the ocean at depth.\u201d B incorrectly includes submersible design. C incorrectly includes space exploration. D incorrectly includes atmospheric science."),
    (31,"C","\u201cFormidable\u201d here means extremely demanding or imposing in scale. A (dangerous) is related but not the primary meaning. B (impressive) misses the sense of difficulty. D (largely unsolvable) overstates."),
    (32,"B","The final paragraph states scientists are aware that exploration \u201cmay disturb ecosystems that have evolved in conditions of almost complete stability over millions of years.\u201d A overstates. C and D are not stated as the concern scientists \u201cincreasingly hold.\u201d"),
    (33,"B","The detail about crushing steel hulls \u201cin seconds\u201d is a vivid measure conveying the extraordinary scale of the engineering challenge. A is too specific and not stated. C overstates, purpose-built vessels have made the descent. D invents a contrast not in the passage."),
    (34,"A","The passage opens with the scale of the unknown (problem), moves through historical context and the 1977 discovery, develops implications and technology, then ends with a balanced acknowledgement. B is wrong, it is not structured as argument and counter-argument. C is wrong, the structure is thematic, not strictly chronological. D is too narrow."),
    (35,"B","The phrase argues that the ocean is a more profound frontier because it is less mapped and understood than space, contradicting the common assumption. A makes a value judgement not quite made in the text. C (more hostile) is not argued. D (more likely to yield discoveries) is not stated."),
    (36,"B","Paragraph 3 states it was \u201cwidely assumed that life could not exist in environments entirely devoid of sunlight.\u201d A overstates. C (nutrients descending) is not mentioned. D mislocates the assumption to a specific depth."),
    (37,"C","The passage mentions cost (A), ecosystem disturbance (B), and equipment failure (D) explicitly. The difficulty of recruiting trained crew (C) is never mentioned."),
    (38,"B","The ROV example, developed for offshore oil, then adapted for science, directly illustrates how commercial technology can be repurposed. A is contradicted by this example. C reverses the direction. D is directly contradicted."),
    (39,"C","The passage presents information clearly and objectively, acknowledging both discoveries and challenges without emotional advocacy. A overstates. B misreads the balance of the final paragraph. D is wrong, the passage is accessible to an educated general audience."),
    (40,"B","The passage demonstrates throughout that deep-sea exploration has transformed biology and ecology, while the final paragraph introduces the responsibility of protection. A is contradicted by the account of ongoing exploration. C is contradicted by the description of enormous cost. D overstates one implication as the primary motivation."),
]
for num, ans, expl in nf_ak:
    story.append(ak_entry(num, ans, expl))

story.append(PageBreak())

# ── SPELLING AK ───────────────────────────────────────────────────────────────
story.append(Paragraph("SECTION 3: SPELLING", st_ak_hdr))
story.append(HR())

spelling_ak = [
    (41,"B","<i>carreer</i> should be <i>career</i>. Single r only. The double-r mirrors words such as <i>occur</i> and misleads students who over-apply consonant-doubling rules."),
    (42,"D","<i>commitee</i> should be <i>committee</i>. Requires double m AND double t. The misspelling retains one double and drops the other, a characteristically believable error."),
    (43,"B","<i>apparant</i> should be <i>apparent</i>. The -ent/-ant suffix confusion is among the most common errors at this level. <i>Apparant</i> looks entirely plausible at speed."),
    (44,"N","No mistake. All spellings are correct. Included to create hesitation, students may suspect <i>formation</i> or <i>ancient</i> and waste time rechecking."),
    (45,"C","<i>silient</i> should be <i>silent</i>. The insertion of an extra <i>i</i> is subtle enough to be missed at speed. Students scanning quickly may register the word shape without catching the error."),
    (46,"D","<i>anual</i> should be <i>annual</i>. The surrounding longer words draw the eye away from this short word, making the missing <i>n</i> easy to overlook."),
    (47,"C","<i>persistant</i> should be <i>persistent</i>. The -ant/-ent trap is made harder because <i>resistant</i> ends in -ant, making <i>persistant</i> feel correct by analogy."),
    (48,"B","<i>aquisition</i> should be <i>acquisition</i>. The silent <i>c</i> is among the most frequently omitted letters in this word. The misspelling is visually convincing."),
    (49,"C","<i>reccommend</i> should be <i>recommend</i>. Only one <i>c</i>, double <i>m</i>. The misspelling doubles the wrong consonant, exactly the error students make when they know a word has a double letter but misplace it."),
    (50,"N","No mistake. <i>Laboratory</i>, <i>consistent</i> and <i>temperature</i> are all correctly spelled. Students under pressure frequently second-guess these words, wasting time on a clean sentence."),
]
for num, ans, expl in spelling_ak:
    story.append(ak_entry(num, ans, expl))

story.append(PageBreak())

# ── PUNCTUATION AK  (with 2 fixes applied) ────────────────────────────────────
story.append(Paragraph("SECTION 4: PUNCTUATION", st_ak_hdr))
story.append(HR())

# Q51
story.append(ak_entry(
    51, "B",
    "The closing quotation mark should follow a comma, not stand alone: "
    "\u201cI cannot believe you have done this,\u201d said Mr. Hartley. "
    "The comma belongs inside the speech marks before the reporting clause.",
))

# Q52
story.append(ak_entry(
    52, "A",
    "\u201cThe results however\u201d requires commas around <i>however</i> as a parenthetical adverb: "
    "<i>The results, however, were\u2026</i> Students often miss the first comma while looking for the second.",
))

# Q53 ── FIX APPLIED: clarify apostrophe singular/plural possessive
story.append(ak_entry(
    53, "A",
    "A comma is required after the fronted adverbial clause <i>After the long journey</i>: "
    "<i>After the long journey, the explorers\u2026</i> The comma in section C is correctly placed, "
    "which distracts students into thinking the sentence is punctuated correctly overall.",
    rule="Any adverbial phrase or clause placed before the main clause (a \u2018fronted adverbial\u2019) "
         "must be followed by a comma. This applies regardless of whether the adverbial is a single word, "
         "a phrase, or a full clause."
))

# Q54 ── FIX APPLIED: explicitly explain interrupter commas
story.append(ak_entry(
    54, "A",
    "<i>Charless</i> should be <i>Charles\u2019s</i>. A possessive apostrophe is required. "
    "When a singular noun ends in <i>s</i>, whether a common noun such as <i>bus</i> or "
    "a proper name such as <i>Charles</i>, the possessive is formed by adding <i>\u2019s</i>: "
    "<i>the bus\u2019s engine</i>, <i>Charles\u2019s responsibility</i>. "
    "This differs from a plural possessive, where the apostrophe follows the existing <i>s</i> "
    "with no additional letter: <i>the teachers\u2019 staffroom</i> (belonging to multiple teachers). "
    "Students who know that names ending in <i>s</i> are \u2018tricky\u2019 sometimes omit the apostrophe "
    "entirely or place it incorrectly after the final letter without the additional <i>s</i>.",
    rule="Singular possessive (one owner, name ends in s): add \u2018s \u2192 Charles\u2019s. "
         "Plural possessive (multiple owners): apostrophe after the s \u2192 teachers\u2019."
))

# Q55
story.append(ak_entry(
    55, "C",
    "<i>in the corridor however</i> creates a comma splice between two independent clauses with no "
    "punctuation before <i>however</i>. Correct: <i>in the corridor; however,</i> or restructured. "
    "The adverb <i>however</i> cannot join two independent clauses on its own, a semicolon or "
    "full stop is required before it.",
))

# Q56
story.append(ak_entry(
    56, "N",
    "No mistake. The interrupted speech is correctly punctuated: comma after <i>dawn</i>, speech marks "
    "correctly placed, and the continuation begins with a lowercase letter. Included to reward students "
    "who confidently recognise correct speech punctuation under pressure.",
))

# Q57
story.append(ak_entry(
    57, "N",
    "No mistake. The fronted participial phrase <i>Having reviewed all of the evidence</i> is correctly "
    "followed by a comma. Students may suspect section B or C, but both are entirely correct.",
))

# Q58
story.append(ak_entry(
    58, "D",
    "<i>the worlds longest</i> should be <i>the world\u2019s longest</i>. Missing possessive apostrophe. "
    "Placed at the very end of the sentence, where tired students are least likely to scrutinise carefully.",
))

# Q59
story.append(ak_entry(
    59, "A",
    "The non-defining relative clause <i>who had spent thirty years on the project</i> must be enclosed "
    "in commas. The opening comma is missing after <i>scientist</i> in section A. "
    "Correct: <i>The scientist, who had spent thirty years on the project, finally published\u2026</i>",
))

# Q60
story.append(ak_entry(
    60, "N",
    "No mistake. The semicolon correctly joins two related independent clauses. Students uncertain about "
    "semicolons may flag section B, but the usage here is entirely correct.",
))

story.append(PageBreak())

# ── GRAMMAR AK  (with 4 fixes applied) ────────────────────────────────────────
story.append(Paragraph("SECTION 5: GRAMMAR", st_ak_hdr))
story.append(HR())

# Q61 ── FIX: add formal rule about verb agreeing with main subject, not nearest noun
story.append(ak_entry(
    61, "C, <i>is</i>",
    "The subject is <i>the committee</i>, a singular collective noun. "
    "The phrase <i>along with several independent advisors</i> is parenthetical: it adds information "
    "but does not alter the grammatical subject of the sentence. "
    "<i>Have</i> and <i>are</i> are the most tempting distractors because the phrase makes the sentence "
    "feel plural, but the verb must agree with the main subject, not with the nearest noun.",
    rule="When the subject is followed by a parenthetical phrase introduced by <i>along with</i>, "
         "<i>as well as</i>, <i>together with</i>, or <i>in addition to</i>, the verb agrees with "
         "the original subject only, not with the noun inside the parenthetical phrase."
))

# Q62 ── FIX: explain why "despite" is wrong grammatically
story.append(ak_entry(
    62, "D, <i>had been waiting</i>",
    "The action began before the team\u2019s arrival and continued up to that point, requiring the "
    "past perfect continuous. <i>Were waiting</i> sounds natural but does not capture the extended "
    "duration relative to the past reference point. <i>Have waited</i> uses the wrong tense entirely.",
))

story.append(ak_entry(
    63, "A, <i>but also</i>",
    "This is the fixed correlative conjunction structure: <i>not only\u2026 but also</i>. "
    "<i>And also</i> sounds natural in speech and will catch students not alert to correlative pair logic. "
    "<i>As well as</i> cannot follow <i>not only</i> idiomatically in this structure.",
))

story.append(ak_entry(
    64, "D, <i>whose</i>",
    "A possessive relative pronoun is needed to modify <i>presence</i>: <i>a man whose presence</i>. "
    "<i>Who</i> and <i>whom</i> are strong distractors, students must recognise that <i>whose</i> "
    "shows possession, not simply introduces a relative clause.",
))

# Q65 ── FIX: Hardly…when correlative structure (question replaced)
story.append(ak_entry(
    65, "B, <i>when</i>",
    "The sentence uses the fixed correlative adverbial structure <i>Hardly\u2026 when</i>, which "
    "expresses that one event occurred almost immediately after another. "
    "<i>Than</i> (A) is the most tempting wrong answer because students confuse this construction "
    "with the <i>no sooner\u2026 than</i> pattern, but <i>hardly</i> and <i>scarcely</i> "
    "always pair with <i>when</i>, never with <i>than</i>. "
    "<i>Then</i> (C) is an adverb, not a conjunction, and cannot join clauses in this structure.",
    rule="<b>Correlative adverbial pairs (do not mix):</b> "
         "<i>Hardly / Scarcely\u2026 when</i> (correct), "
         "<i>No sooner\u2026 than</i> (correct), "
         "<i>Hardly\u2026 than</i> (incorrect)."
))

# Q66 ── FIX: clarify FORMAL grammar convention
story.append(ak_entry(
    66, "A, <i>more difficult</i>",
    "The only correct comparative form of <i>difficult</i> in formal written English. "
    "<i>Difficulter</i> (B) is an over-regularisation error: English forms comparatives with "
    "<i>-er</i> only for short adjectives of one or two syllables. "
    "<i>Most difficult</i> (C) is superlative, not comparative. "
    "<i>Much difficult</i> (D) requires <i>more</i> to be grammatically complete. "
    "Note: <i>difficulter</i> does occasionally appear in informal spoken English, "
    "but in all formal written contexts and standardised examinations, <i>more difficult</i> "
    "is the unambiguous and required form.",
    rule="Adjectives of three or more syllables always form comparatives with <i>more</i>, "
         "never with <i>-er</i>. This is a requirement of formal written English, not merely "
         "a stylistic preference."
))

story.append(ak_entry(
    67, "D, <i>was</i>",
    "<i>Neither of the suspects</i> takes a singular verb. <i>Were</i> is the overwhelming instinctive "
    "choice and will catch the majority of students who do not pause. "
    "<i>Had been</i> (E) is a plausible distractor in the past narrative context, but the singular "
    "<i>neither</i> confirms <i>was</i>.",
))

story.append(ak_entry(
    68, "B, <i>whose</i>",
    "A possessive relative pronoun is needed: <i>the bridge whose construction</i>. "
    "<i>Which</i> (A) is the most tempting wrong answer, students may attempt "
    "<i>the bridge, which construction</i> by analogy with relative clauses, but this is "
    "grammatically impossible without a preposition. <i>Of which</i> would also work structurally "
    "(<i>the construction of which</i>) but is not one of the options as phrased.",
))

# Q69 ── FIX: explain why "despite" is grammatically impossible before a finite clause
story.append(ak_entry(
    69, "B, <i>although</i>",
    "The sentence requires a subordinating conjunction signalling concession: despite the report "
    "being incomplete, the board proceeded. <i>Although</i> is the only option that functions as "
    "a subordinating conjunction linking two finite clauses (clauses with their own subject and "
    "conjugated verb). "
    "<i>Despite</i> (A) is grammatically impossible here: <i>despite</i> is a preposition, not "
    "a conjunction, and must be followed by a noun phrase or gerund, never by a finite clause. "
    "\u201cDespite the report was incomplete\u201d is ungrammatical because <i>the report was incomplete</i> "
    "is a finite clause, not a noun phrase. The correct preposition-based version would be: "
    "<i>Despite the report being incomplete\u2026</i> "
    "<i>Even so</i> (D) is an adverb, not a conjunction, and cannot introduce a subordinate clause.",
    rule="<b>Despite</b> = preposition \u2192 must be followed by a noun or gerund: "
         "<i>Despite the rain / Despite losing</i>. "
         "<b>Although / Even though</b> = conjunction \u2192 must be followed by a full clause: "
         "<i>Although it was raining</i>. Never write <i>Despite + finite clause</i>."
))

story.append(ak_entry(
    70, "C, <i>than</i>",
    "Comparative structures require <i>than</i>. "
    "<i>Then</i> (E) is the most common wrong answer, a homophone confusion made when "
    "students are not reading the sentence as a comparison. "
    "<i>As</i> (A) would require an <i>as\u2026 as</i> construction.",
))

# ── END ───────────────────────────────────────────────────────────────────────
story.append(Spacer(1, 1*cm))
story.append(HR('#1a1a2e', 2))
story.append(Paragraph("END OF PAPER AND ANSWER KEY", S('End','Normal',
    fontSize=10, alignment=TA_CENTER, textColor=colors.HexColor('#1a1a2e'),
    spaceBefore=8)))

# ── BUILD ─────────────────────────────────────────────────────────────────────
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#888888'))
    canvas.drawCentredString(W/2, 1.2*cm,
        f"QE Boys 11+ English Mock Paper   |   Page {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print("PDF generated successfully.")
