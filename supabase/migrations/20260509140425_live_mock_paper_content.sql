CREATE TABLE IF NOT EXISTS public.live_mock_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  track text NOT NULL DEFAULT '11plus',
  subject text NOT NULL DEFAULT 'english',
  starts_at timestamptz,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  question_count integer NOT NULL CHECK (question_count > 0),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed', 'results_released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.live_mock_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.live_mock_papers(id) ON DELETE CASCADE,
  section_order integer NOT NULL,
  section_key text NOT NULL,
  title text NOT NULL,
  instructions text,
  passage_title text,
  passage_blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paper_id, section_key),
  UNIQUE (paper_id, section_order)
);

CREATE TABLE IF NOT EXISTS public.live_mock_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.live_mock_papers(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.live_mock_sections(id) ON DELETE CASCADE,
  question_number integer NOT NULL CHECK (question_number > 0),
  question_type text NOT NULL,
  stem text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text NOT NULL,
  explanation text,
  topic text,
  subtopic text,
  difficulty integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paper_id, question_number)
);

CREATE TABLE IF NOT EXISTS public.live_mock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.live_mock_papers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  duration_seconds integer,
  question_count integer NOT NULL DEFAULT 0,
  answered_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paper_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.live_mock_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.live_mock_attempts(id) ON DELETE CASCADE,
  paper_id uuid NOT NULL REFERENCES public.live_mock_papers(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.live_mock_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_option text,
  is_correct boolean,
  answered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.live_mock_integrity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.live_mock_attempts(id) ON DELETE CASCADE,
  paper_id uuid REFERENCES public.live_mock_papers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_mock_sections_paper_order_idx ON public.live_mock_sections(paper_id, section_order);
CREATE INDEX IF NOT EXISTS live_mock_questions_paper_number_idx ON public.live_mock_questions(paper_id, question_number);
CREATE INDEX IF NOT EXISTS live_mock_questions_section_idx ON public.live_mock_questions(section_id);
CREATE INDEX IF NOT EXISTS live_mock_attempts_user_idx ON public.live_mock_attempts(user_id);
CREATE INDEX IF NOT EXISTS live_mock_answers_user_idx ON public.live_mock_answers(user_id);
CREATE INDEX IF NOT EXISTS live_mock_integrity_user_idx ON public.live_mock_integrity_events(user_id);

ALTER TABLE public.live_mock_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_mock_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_mock_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_mock_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_mock_integrity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view live mock papers" ON public.live_mock_papers;
CREATE POLICY "Authenticated users can view live mock papers"
ON public.live_mock_papers FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view live mock sections" ON public.live_mock_sections;
CREATE POLICY "Authenticated users can view live mock sections"
ON public.live_mock_sections FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can view live mock questions" ON public.live_mock_questions;
CREATE POLICY "Authenticated users can view live mock questions"
ON public.live_mock_questions FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view their own live mock attempts" ON public.live_mock_attempts;
CREATE POLICY "Users can view their own live mock attempts"
ON public.live_mock_attempts FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own live mock attempts" ON public.live_mock_attempts;
CREATE POLICY "Users can create their own live mock attempts"
ON public.live_mock_attempts FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own live mock attempts" ON public.live_mock_attempts;
CREATE POLICY "Users can update their own live mock attempts"
ON public.live_mock_attempts FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own live mock answers" ON public.live_mock_answers;
CREATE POLICY "Users can view their own live mock answers"
ON public.live_mock_answers FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own live mock answers" ON public.live_mock_answers;
CREATE POLICY "Users can create their own live mock answers"
ON public.live_mock_answers FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own live mock answers" ON public.live_mock_answers;
CREATE POLICY "Users can update their own live mock answers"
ON public.live_mock_answers FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own live mock integrity events" ON public.live_mock_integrity_events;
CREATE POLICY "Users can view their own live mock integrity events"
ON public.live_mock_integrity_events FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own live mock integrity events" ON public.live_mock_integrity_events;
CREATE POLICY "Users can create their own live mock integrity events"
ON public.live_mock_integrity_events FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

GRANT SELECT ON public.live_mock_papers, public.live_mock_sections, public.live_mock_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_mock_attempts, public.live_mock_answers TO authenticated;
GRANT SELECT, INSERT ON public.live_mock_integrity_events TO authenticated;


INSERT INTO public.live_mock_papers (slug, title, track, subject, starts_at, duration_minutes, question_count, status)
VALUES ('live-11plus-english-mock-2026-05-09-1700', '11+ English complete mock exam', '11plus', 'english', '2026-05-09 17:00:00+01', 50, 70, 'published')
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  track = EXCLUDED.track,
  subject = EXCLUDED.subject,
  starts_at = EXCLUDED.starts_at,
  duration_minutes = EXCLUDED.duration_minutes,
  question_count = EXCLUDED.question_count,
  status = EXCLUDED.status,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700')
INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions, passage_title, passage_blocks)
SELECT paper.id, 1, 'fiction_comprehension', 'Section 1: Fiction Comprehension', 'Read the following passage carefully before answering the questions.', 'The Watchmaker''s Apprentice', '[{"id": "f1", "text": "The shop occupied the narrowest premises on Calloway Street, wedged between a pawnbroker and a printer''s yard as though the city itself had forgotten to leave sufficient room for it. A single gas lamp burned in the window, illuminating a row of clocks whose faces stared outward with the blank authority of judges. It was here that Edmund Pell had spent the last fourteen months of his life, and here, on a Tuesday morning in November, that he began to understand what he had agreed to."}, {"id": "f2", "text": "Mr. Crabtree did not speak before ten o''clock. This was not a rule he had stated; it was simply a condition of the premises, like the smell of machine oil and the particular cold that came up through the floorboards regardless of the season. Edmund had learned this in his first week, as he had learned a great many things: that Mr. Crabtree''s hands, though gnarled at the knuckle, moved with a surgeon''s precision; that the magnifying glass was never to be set down on the workbench face-downward; that gratitude, when it came, arrived without announcement and was rarely repeated."}, {"id": "f3", "text": "On this particular morning, a woman entered the shop at twenty minutes past nine. She was dressed in mourning — black wool, black gloves, a veil so fine it seemed more like shadow than fabric — and she carried a clock in both hands as one might carry something that had once been alive. Edmund straightened at once. Mr. Crabtree did not move."}, {"id": "f4", "text": "“I was told,” the woman said, addressing Mr. Crabtree’s back, “that you are the only man in this part of the city who can repair a Viennese escapement.”"}, {"id": "f5", "text": "Mr. Crabtree continued to work. The silence stretched. Edmund felt the blood rise in his face."}, {"id": "f6", "text": "“My husband wound this clock on the morning he died,” she said, more quietly. “It has not been touched since.”"}, {"id": "f7", "text": "There was a pause — not an empty one, but weighted, as though the room were considering her words along with its inhabitants. Then Mr. Crabtree set down his instrument, turned on his stool, and looked at the woman fully for the first time."}, {"id": "f8", "text": "“Leave it,” he said. “Come back Thursday.”"}, {"id": "f9", "text": "The woman placed the clock on the counter with a care that Edmund found almost unbearable to watch. She left without another word. When the door had closed and the bell above it had ceased to shiver, Mr. Crabtree returned to his work without comment. Edmund waited for something — an explanation, a softening. Neither came."}, {"id": "f10", "text": "He looked at the clock. It was a beautiful object: dark walnut case, a face of cream enamel, and hands of such fine brass that they seemed hardly capable of bearing the weight of time. And it had stopped, he noticed, at seven minutes past four."}]'::jsonb
FROM paper
ON CONFLICT (paper_id, section_key) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  title = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  passage_title = EXCLUDED.passage_title,
  passage_blocks = EXCLUDED.passage_blocks,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700')
INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions, passage_title, passage_blocks)
SELECT paper.id, 2, 'non_fiction_comprehension', 'Section 2: Non-Fiction Comprehension', 'Read the following passage carefully before answering the questions.', 'The Deep Ocean: Earth''s Least Known Frontier', '[{"id": "nf1", "text": "Of all the environments on Earth, the deep ocean remains the least understood and the most difficult to reach. More than eighty percent of the world''s oceans have never been mapped in detail, and scientists estimate that the vast majority of deep-sea species have yet to be identified, let alone studied. In this respect, the ocean floor represents a more profound frontier than outer space: we have better maps of the surface of Mars than we do of the seabed beneath our own oceans."}, {"id": "nf2", "text": "The principal obstacle is pressure. At a depth of one thousand metres, the surrounding water exerts a force approximately one hundred times greater than atmospheric pressure at sea level. At the deepest point on Earth — the Challenger Deep in the Mariana Trench, which descends to nearly eleven thousand metres — the pressure is so extreme that only a handful of purpose-built submersibles have ever made the descent. The engineering demands alone are formidable: a vessel must be capable of withstanding pressures that would crush conventional steel hulls in seconds, while simultaneously housing sensitive scientific equipment and, in some cases, human crew members."}, {"id": "nf3", "text": "Despite these obstacles, the discoveries made in the deep ocean have repeatedly overturned what scientists believed to be fundamental biological principles. Until the 1970s, it was widely assumed that life could not exist in environments entirely devoid of sunlight, since photosynthesis — the process by which plants and other organisms convert light into energy — was considered the essential foundation of all food chains. The discovery of hydrothermal vents in 1977, however, challenged this assumption entirely. Located along the boundaries of tectonic plates, these vents release superheated water — sometimes exceeding four hundred degrees Celsius — along with dissolved minerals and chemicals. Entire ecosystems had evolved to thrive in these conditions, sustained not by sunlight but by a process called chemosynthesis, in which bacteria convert chemical energy from the vents into organic matter that supports the surrounding food chain."}, {"id": "nf4", "text": "The implications of this discovery extended far beyond marine biology. If complex life could sustain itself in complete darkness, at crushing pressures and near-boiling temperatures, scientists were forced to reconsider the conditions under which life might exist elsewhere in the solar system. Particular attention turned to Europa, one of Jupiter’s moons, which is believed to harbour a vast liquid ocean beneath its frozen surface. If hydrothermal activity occurs at the floor of Europa’s ocean — as some scientists believe it may — then the conditions necessary for chemosynthetic life might already be present."}, {"id": "nf5", "text": "The technological advances required to explore the deep ocean have also produced methods with broad applications beyond oceanography. Remotely operated vehicles, or ROVs, which were originally developed to service offshore oil infrastructure, have since been adapted for deep-sea scientific exploration. Modern ROVs can descend to depths of several kilometres, transmitting high-definition video footage and collecting biological and geological samples via robotic arms. The data gathered from these missions has not only expanded our knowledge of deep-sea biology but has also contributed to our understanding of plate tectonics, underwater geology, and the chemical composition of the ocean at depth."}, {"id": "nf6", "text": "Nevertheless, significant challenges remain. Deep-sea expeditions are extraordinarily expensive — a single research cruise can cost hundreds of thousands of pounds — and the inaccessibility of the environment means that even the most sophisticated equipment is prone to failure at extreme depths. Furthermore, the very act of exploration carries risks: the presence of submersibles and ROVs may disturb ecosystems that have evolved in conditions of almost complete stability over millions of years. Scientists are increasingly aware that the desire to understand the deep ocean must be balanced against the responsibility to protect it."}]'::jsonb
FROM paper
ON CONFLICT (paper_id, section_key) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  title = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  passage_title = EXCLUDED.passage_title,
  passage_blocks = EXCLUDED.passage_blocks,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700')
INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions, passage_title, passage_blocks)
SELECT paper.id, 3, 'spelling', 'Section 3: Spelling', 'Each question contains a sentence divided into four sections labelled A, B, C and D. One section may contain a spelling mistake. If there is no spelling mistake, choose N.', 'Spelling Questions', '[]'::jsonb
FROM paper
ON CONFLICT (paper_id, section_key) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  title = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  passage_title = EXCLUDED.passage_title,
  passage_blocks = EXCLUDED.passage_blocks,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700')
INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions, passage_title, passage_blocks)
SELECT paper.id, 4, 'punctuation', 'Section 4: Punctuation', 'Each question contains a sentence divided into four sections labelled A, B, C and D. One section may contain a punctuation mistake. If there is no punctuation mistake, choose N.', 'Punctuation Questions', '[]'::jsonb
FROM paper
ON CONFLICT (paper_id, section_key) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  title = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  passage_title = EXCLUDED.passage_title,
  passage_blocks = EXCLUDED.passage_blocks,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700')
INSERT INTO public.live_mock_sections (paper_id, section_order, section_key, title, instructions, passage_title, passage_blocks)
SELECT paper.id, 5, 'grammar', 'Section 5: Grammar', 'Choose the word or phrase from the options below that best completes the sentence.', 'Grammar Questions', '[]'::jsonb
FROM paper
ON CONFLICT (paper_id, section_key) DO UPDATE SET
  section_order = EXCLUDED.section_order,
  title = EXCLUDED.title,
  instructions = EXCLUDED.instructions,
  passage_title = EXCLUDED.passage_title,
  passage_blocks = EXCLUDED.passage_blocks,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 1, 'Comprehension', 'According to the passage, which of the following best describes the location of Mr. Crabtree''s shop?', '[{"id": "A", "text": "It was situated at the end of a busy commercial street near a market", "correct": false, "trap": null}, {"id": "B", "text": "It was uncomfortably narrow, positioned between two other businesses", "correct": true, "trap": null}, {"id": "C", "text": "It was a well-known landmark on Calloway Street, identifiable by its gas lamps", "correct": false, "trap": null}, {"id": "D", "text": "It was hidden from view, accessible only through the printer''s yard", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage states the shop was “wedged between a pawnbroker and a printer''s yard.” A invents a nearby market. C misreads the gas lamp as a landmark. D fabricates restricted access.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 2, 'Comprehension', 'What does the phrase “the blank authority of judges” (paragraph 1) suggest about the clocks in the window?', '[{"id": "A", "text": "That the clocks were old and their faces had faded with age", "correct": false, "trap": null}, {"id": "B", "text": "That the clocks appeared to observe and pass silent judgement on passers-by", "correct": true, "trap": null}, {"id": "C", "text": "That the clocks were arranged formally, as though prepared for inspection", "correct": false, "trap": null}, {"id": "D", "text": "That the clocks kept perfect time, as reliable as a court of law", "correct": false, "trap": null}]'::jsonb, 'B', '“Blank authority of judges” is a metaphor attributing silent, impassive judgement to the clocks. A focuses on age, which is not implied. C interprets “authority” too literally. D makes an unsupported leap to accuracy.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 3, 'Comprehension', 'The detail that Mr. Crabtree did not speak before ten o''clock is presented as:', '[{"id": "A", "text": "A strict rule he had communicated to Edmund on his first day", "correct": false, "trap": null}, {"id": "B", "text": "An unspoken condition of the workplace that Edmund had deduced himself", "correct": true, "trap": null}, {"id": "C", "text": "A habit Edmund found rude and difficult to accept", "correct": false, "trap": null}, {"id": "D", "text": "A professional custom common among craftsmen of Mr. Crabtree''s trade", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage explicitly states: “This was not a rule he had stated; it was simply a condition of the premises.” A directly contradicts this. C is a plausible emotional reading but unsupported. D imports a cultural assumption not mentioned.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 4, 'Comprehension', 'Which of the following best explains what Edmund learned about gratitude in Mr. Crabtree''s shop?', '[{"id": "A", "text": "That Mr. Crabtree expressed it only when a particularly difficult repair was completed", "correct": false, "trap": null}, {"id": "B", "text": "That it was offered occasionally but never elaborated upon or returned to", "correct": true, "trap": null}, {"id": "C", "text": "That Mr. Crabtree considered it an unnecessary distraction from precise work", "correct": false, "trap": null}, {"id": "D", "text": "That Edmund himself had learned to withhold it, following his employer''s example", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage says gratitude “arrived without announcement and was rarely repeated” — occasional and unrepeated. A adds the condition of difficult repairs, which is not stated. C is a tempting inference but unconfirmed. D is invented.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 5, 'Comprehension', 'The woman’s clock is described as being carried “as one might carry something that had once been alive.” What does this comparison most strongly imply?', '[{"id": "A", "text": "That the clock was extremely fragile and she feared dropping it", "correct": false, "trap": null}, {"id": "B", "text": "That the clock held deep personal significance and was associated with loss", "correct": true, "trap": null}, {"id": "C", "text": "That the woman was unaccustomed to carrying heavy or awkward objects", "correct": false, "trap": null}, {"id": "D", "text": "That the clock had once belonged to a person of great importance", "correct": false, "trap": null}]'::jsonb, 'B', 'The simile evokes death and personal loss, immediately reinforced by the revelation that her husband wound the clock on the morning he died. A focuses on fragility alone. C is irrelevant. D is too vague.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 6, 'Comprehension', 'What is the most likely reason Edmund’s “blood rose in his face” when Mr. Crabtree remained silent?', '[{"id": "A", "text": "He was embarrassed by the woman''s emotional display in a professional setting", "correct": false, "trap": null}, {"id": "B", "text": "He was frustrated that Mr. Crabtree had not yet permitted him to speak", "correct": false, "trap": null}, {"id": "C", "text": "He felt the discomfort of Mr. Crabtree''s apparent rudeness towards a grieving customer", "correct": true, "trap": null}, {"id": "D", "text": "He was anxious that the woman would leave before a repair could be agreed upon", "correct": false, "trap": null}]'::jsonb, 'C', 'Edmund “straightened at once” when the woman entered, showing social awareness. His discomfort arises from observing what reads as rudeness toward a grieving customer. A projects an unsupported judgement. B is plausible but Edmund is not described as wanting to speak. D introduces commercial anxiety not evidenced.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 7, 'Comprehension', 'What does the phrase “not an empty one, but weighted” suggest about the pause following the woman’s second statement?', '[{"id": "A", "text": "That the room had become uncomfortably silent after a period of noise", "correct": false, "trap": null}, {"id": "B", "text": "That the pause carried emotional and moral significance for those present", "correct": true, "trap": null}, {"id": "C", "text": "That Mr. Crabtree was calculating the cost of the repair before responding", "correct": false, "trap": null}, {"id": "D", "text": "That Edmund was uncertain whether the woman intended to speak again", "correct": false, "trap": null}]'::jsonb, 'B', 'The pause is described as “weighted” — explicitly contrasted with being empty — carrying moral and emotional significance. C is a plausible distractor but no calculation is indicated. D misidentifies whose uncertainty is described.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 8, 'Comprehension', 'Mr. Crabtree’s response — “Leave it. Come back Thursday.” — is best described as:', '[{"id": "A", "text": "dismissive and impatient", "correct": false, "trap": null}, {"id": "B", "text": "brief but quietly sympathetic", "correct": true, "trap": null}, {"id": "C", "text": "uncertain and hesitant", "correct": false, "trap": null}, {"id": "D", "text": "deliberately unfriendly", "correct": false, "trap": null}]'::jsonb, 'B', 'Despite its brevity, Crabtree’s response shows he has listened: he turns, looks at her “fully,” and agrees to take the clock. A is the most tempting wrong answer — brevity reads as dismissiveness — but the act of turning directly contradicts this. C adds malicious intent not evidenced. D adds uncertainty about repair not stated.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 9, 'Comprehension', 'Why does Edmund find the woman’s placing of the clock on the counter “almost unbearable to watch”?', '[{"id": "A", "text": "He was concerned the woman might damage the delicate mechanism", "correct": false, "trap": null}, {"id": "B", "text": "He was moved by the tenderness of the gesture and its association with grief", "correct": true, "trap": null}, {"id": "C", "text": "He found the entire encounter awkward and wished it to conclude", "correct": false, "trap": null}, {"id": "D", "text": "He was eager to examine the clock himself and found the delay frustrating", "correct": false, "trap": null}]'::jsonb, 'B', 'The gesture is described as “almost unbearable to watch” — an emotional response linked to the grief embodied in the action. A mistakes emotional unbearability for practical concern. C contradicts his attentive behaviour. D is possible but the text frames the moment in terms of grief.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 10, 'Comprehension', 'Which word is closest in meaning to “gnarled” as used in paragraph 2?', '[{"id": "A", "text": "Steady", "correct": false, "trap": null}, {"id": "B", "text": "Twisted", "correct": true, "trap": null}, {"id": "C", "text": "Slender", "correct": false, "trap": null}, {"id": "D", "text": "Scarred", "correct": false, "trap": null}]'::jsonb, 'B', '“Gnarled” means twisted or knotted, particularly of aged hands or wood. A (steady) is opposite. C (slender) contradicts it. D (scarred) relates to damage but is not the meaning.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 11, 'Comprehension', 'What does the passage suggest about Mr. Crabtree’s character through the detail of the magnifying glass?', '[{"id": "A", "text": "That he was possessive of his tools and distrustful of Edmund", "correct": false, "trap": null}, {"id": "B", "text": "That he maintained exacting standards of care in his workshop", "correct": true, "trap": null}, {"id": "C", "text": "That he had suffered a previous apprentice who had broken his equipment", "correct": false, "trap": null}, {"id": "D", "text": "That he was unable to work effectively without particular instruments", "correct": false, "trap": null}]'::jsonb, 'B', 'The rule about the magnifying glass — one of several precise instructions — collectively establishes rigorous standards. A adds distrust without evidence. C invents a backstory. D is partially true but misses the standards emphasis.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 12, 'Comprehension', 'The woman is described as wearing “a veil so fine it seemed more like shadow than fabric.” What effect does this description create?', '[{"id": "A", "text": "It emphasises the poor quality of the woman''s mourning dress", "correct": false, "trap": null}, {"id": "B", "text": "It creates an impression of the woman as barely present, almost ghostly", "correct": true, "trap": null}, {"id": "C", "text": "It suggests the woman was attempting to conceal her identity in the shop", "correct": false, "trap": null}, {"id": "D", "text": "It draws attention to the contrast between the woman and her surroundings", "correct": false, "trap": null}]'::jsonb, 'B', 'The simile of the veil as “shadow rather than fabric” creates an impression of the woman as insubstantial and half-present — consistent with grief’s effect. A judges quality, which is not suggested. C invents a concealment motivation. D is possible but secondary.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 13, 'Comprehension', 'Which of the following pieces of evidence best supports the idea that Edmund is still learning to navigate his employer’s expectations?', '[{"id": "A", "text": "“Edmund had learned this in his first week”", "correct": false, "trap": null}, {"id": "B", "text": "“Edmund straightened at once”", "correct": false, "trap": null}, {"id": "C", "text": "“Edmund waited for something — an explanation, a softening”", "correct": true, "trap": null}, {"id": "D", "text": "“He looked at the clock”", "correct": false, "trap": null}]'::jsonb, 'C', '“Edmund waited for something — an explanation, a softening. Neither came.” This directly shows ongoing navigation of unfamiliar expectations. A refers to past learning, not current difficulty. B shows alertness, not uncertainty. D is neutral observation.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 14, 'Comprehension', 'The narrator describes the shop’s cold as coming “up through the floorboards regardless of the season.” This detail primarily serves to:', '[{"id": "A", "text": "Suggest the shop is located in an unusually cold part of the city", "correct": false, "trap": null}, {"id": "B", "text": "Indicate that Mr. Crabtree is too frugal to heat his premises properly", "correct": false, "trap": null}, {"id": "C", "text": "Establish the shop as a place of permanent, unchanging austerity", "correct": true, "trap": null}, {"id": "D", "text": "Create sympathy for Edmund, who suffers physical discomfort during his apprenticeship", "correct": false, "trap": null}]'::jsonb, 'C', 'The cold “regardless of the season” makes it permanent and unvarying — characterising the shop as unchangingly austere. A introduces geography without basis. B infers miserliness, which is possible but not stated. D is secondary.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 15, 'Comprehension', 'Which of the following best describes the overall mood of the passage?', '[{"id": "A", "text": "Melancholy and oppressive, reflecting Edmund''s unhappiness in his position", "correct": false, "trap": null}, {"id": "B", "text": "Restrained and sombre, with grief and quiet dignity running beneath the surface", "correct": true, "trap": null}, {"id": "C", "text": "Tense and confrontational, building towards an unresolved conflict", "correct": false, "trap": null}, {"id": "D", "text": "Nostalgic and warm, evoking a lost world of traditional craftsmanship", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage maintains emotional restraint throughout — grief is present but never voiced dramatically. A (melancholy and oppressive) overstates. C (confrontational) misreads the encounter. D (nostalgic and warm) is wrong — the tone is too cool and spare.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 16, 'Comprehension', 'The clock is described as having “hands of such fine brass that they seemed hardly capable of bearing the weight of time.” This phrase is best understood as:', '[{"id": "A", "text": "A literal observation about the physical fragility of the clock''s mechanism", "correct": false, "trap": null}, {"id": "B", "text": "A figurative suggestion that the clock is too delicate to function reliably", "correct": false, "trap": null}, {"id": "C", "text": "A poetic expression linking the clock''s beauty to the burden of memory and time", "correct": true, "trap": null}, {"id": "D", "text": "An indication that the clock was poorly made despite its attractive appearance", "correct": false, "trap": null}]'::jsonb, 'C', 'The “weight of time” is metaphorical, linking the fragile hands to the burden of memory and loss. A and B take the phrase too literally. D introduces a negative judgement contradicted by the admiring description.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 17, 'Comprehension', 'Why does the writer choose to end the passage with the detail that the clock had stopped at seven minutes past four?', '[{"id": "A", "text": "To provide a clue about the time at which the woman''s husband died", "correct": true, "trap": null}, {"id": "B", "text": "To show that Edmund is more interested in the clock''s history than in his work", "correct": false, "trap": null}, {"id": "C", "text": "To highlight Edmund''s technical curiosity about the clock''s mechanism", "correct": false, "trap": null}, {"id": "D", "text": "To suggest that Mr. Crabtree will be able to identify the fault immediately", "correct": false, "trap": null}]'::jsonb, 'A', 'The stopped time is the passage’s final image, clearly linked to the husband’s death. B misreads Edmund’s gaze as self-interest. C focuses on technical curiosity, which the passage does not foreground here. D has no support.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 18, 'Comprehension', 'The phrase “as though the city itself had forgotten to leave sufficient room for it” is an example of which literary technique?', '[{"id": "A", "text": "Simile", "correct": false, "trap": null}, {"id": "B", "text": "Hyperbole", "correct": false, "trap": null}, {"id": "C", "text": "Personification", "correct": true, "trap": null}, {"id": "D", "text": "Pathetic fallacy", "correct": false, "trap": null}]'::jsonb, 'C', 'Attributing the act of “forgetting” to the city is personification — giving a non-human entity a human mental action. A (simile) requires “like” or “as” as a direct comparison marker. B (hyperbole) is exaggeration for effect. D (pathetic fallacy) involves emotion projected onto weather.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 19, 'Comprehension', 'What does the passage imply about the relationship between Edmund and Mr. Crabtree at this point in the story?', '[{"id": "A", "text": "Edmund respects Mr. Crabtree but finds his manner bewildering and sometimes painful", "correct": true, "trap": null}, {"id": "B", "text": "Edmund admires Mr. Crabtree unreservedly and models his own behaviour on him", "correct": false, "trap": null}, {"id": "C", "text": "Edmund resents Mr. Crabtree''s silences and is considering leaving the apprenticeship", "correct": false, "trap": null}, {"id": "D", "text": "Edmund and Mr. Crabtree have developed a quiet mutual understanding over time", "correct": false, "trap": null}]'::jsonb, 'A', 'Edmund respects and observes Crabtree carefully but also “waited for something — an explanation, a softening. Neither came” — capturing both respect and pained bewilderment. B is too straightforward. C introduces resentment not evidenced. D overstates mutual understanding.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 20, 'Comprehension', 'Which of the following statements about Mr. Crabtree is best supported by the passage as a whole?', '[{"id": "A", "text": "He is a man whose coldness conceals indifference to the suffering of others", "correct": false, "trap": null}, {"id": "B", "text": "He is a skilled craftsman whose unconventional manner masks a deeper sensitivity", "correct": true, "trap": null}, {"id": "C", "text": "He is a professional who separates his personal feelings entirely from his work", "correct": false, "trap": null}, {"id": "D", "text": "He is a private man who resents being disturbed by customers with emotional requests", "correct": false, "trap": null}]'::jsonb, 'B', 'Crabtree’s turning, looking “fully,” and agreeing to take the clock suggest quiet attentiveness beneath an austere exterior. A is the most tempting wrong answer — his silences read as coldness — but his response directly contradicts indifference. C is contradicted by his response. D is contradicted by his willingness to help.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 21, 'Comprehension', 'According to the first paragraph, which of the following comparisons does the writer make?', '[{"id": "A", "text": "The deep ocean is more dangerous to explore than the surface of Mars", "correct": false, "trap": null}, {"id": "B", "text": "We have more detailed maps of Mars than of the ocean floor", "correct": true, "trap": null}, {"id": "C", "text": "The ocean floor is larger in area than the surface of Mars", "correct": false, "trap": null}, {"id": "D", "text": "Outer space has been explored more recently than the deep ocean", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage states: “we have better maps of the surface of Mars than we do of the seabed beneath our own oceans.” A is not stated. C makes a claim about area not in the text. D reverses the implication.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 22, 'Comprehension', 'What is identified in the passage as the “principal obstacle” to deep-sea exploration?', '[{"id": "A", "text": "The absence of light at extreme depths", "correct": false, "trap": null}, {"id": "B", "text": "The cost of building and operating submersibles", "correct": false, "trap": null}, {"id": "C", "text": "The immense pressure exerted by water at depth", "correct": true, "trap": null}, {"id": "D", "text": "The instability of the ocean floor near tectonic boundaries", "correct": false, "trap": null}]'::jsonb, 'C', 'The passage explicitly names pressure as “the principal obstacle” in paragraph 2. A (absence of light) is real but not identified as principal. B (cost) is mentioned only in the final paragraph. D (tectonic instability) is not mentioned as an obstacle.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 23, 'Comprehension', 'According to the passage, what engineering challenge do deep-sea vessels face beyond withstanding pressure?', '[{"id": "A", "text": "Navigating the unpredictable currents near hydrothermal vents", "correct": false, "trap": null}, {"id": "B", "text": "Communicating with the surface through several kilometres of water", "correct": false, "trap": null}, {"id": "C", "text": "Housing scientific equipment and sometimes human crew members", "correct": true, "trap": null}, {"id": "D", "text": "Operating effectively in temperatures that exceed four hundred degrees", "correct": false, "trap": null}]'::jsonb, 'C', 'Paragraph 2 states a vessel must house “sensitive scientific equipment and, in some cases, human crew members.” A (currents) is not mentioned. B (communication) is not discussed. D misreads the temperature detail.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 24, 'Comprehension', 'Which word is closest in meaning to “devoid” as used in paragraph 3?', '[{"id": "A", "text": "Resistant", "correct": false, "trap": null}, {"id": "B", "text": "Deprived", "correct": false, "trap": null}, {"id": "C", "text": "Ignorant", "correct": false, "trap": null}, {"id": "D", "text": "Entirely lacking", "correct": true, "trap": null}]'::jsonb, 'D', '“Devoid” means entirely lacking or completely without. B (deprived) implies something has been taken away, whereas devoid describes an absolute absence. A and C are unrelated.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 25, 'Comprehension', 'What was the significance of the 1977 discovery of hydrothermal vents?', '[{"id": "A", "text": "It proved that photosynthesis could occur in deep-sea environments", "correct": false, "trap": null}, {"id": "B", "text": "It demonstrated that ecosystems could be sustained without sunlight", "correct": true, "trap": null}, {"id": "C", "text": "It confirmed that tectonic plate boundaries were biologically rich", "correct": false, "trap": null}, {"id": "D", "text": "It provided the first evidence that superheated water could support bacteria", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage states that entire ecosystems evolved to thrive without sunlight — directly overturning the assumption about photosynthesis. A is wrong — photosynthesis does not occur at vents. C overstates. D is too narrow.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 26, 'Comprehension', 'According to the passage, how do chemosynthetic bacteria sustain the ecosystems around hydrothermal vents?', '[{"id": "A", "text": "By absorbing heat energy directly from the vent water", "correct": false, "trap": null}, {"id": "B", "text": "By converting chemical energy from the vents into organic matter", "correct": true, "trap": null}, {"id": "C", "text": "By filtering dissolved minerals from the surrounding water", "correct": false, "trap": null}, {"id": "D", "text": "By photosynthesising at low light levels near the ocean floor", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage states explicitly that bacteria “convert chemical energy from the vents into organic matter that supports the surrounding food chain.” A is a misreading. C is not described. D directly contradicts the passage.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 27, 'Comprehension', 'The writer states that the discovery of hydrothermal vent ecosystems “extended far beyond marine biology.” What does this refer to?', '[{"id": "A", "text": "The discovery improved the engineering techniques used to build submersibles", "correct": false, "trap": null}, {"id": "B", "text": "It suggested that life might be possible in extreme environments elsewhere in the solar system", "correct": true, "trap": null}, {"id": "C", "text": "It prompted international cooperation in deep-sea conservation efforts", "correct": false, "trap": null}, {"id": "D", "text": "It established that tectonic plate activity could generate enough energy to support ecosystems", "correct": false, "trap": null}]'::jsonb, 'B', 'Paragraph 4 explains that the discovery prompted scientists to reconsider whether life might exist elsewhere in the solar system. A refers to engineering advances mentioned separately. C is not mentioned. D is a partial reading of vent conditions.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 28, 'Comprehension', 'Why does the writer draw attention to Europa in paragraph 4?', '[{"id": "A", "text": "To illustrate how deep-sea technology could be used in space exploration", "correct": false, "trap": null}, {"id": "B", "text": "To provide an example of a location where chemosynthetic life has been confirmed", "correct": false, "trap": null}, {"id": "C", "text": "To suggest a location where conditions similar to hydrothermal vents may exist", "correct": true, "trap": null}, {"id": "D", "text": "To contrast the conditions on Europa with those found in Earth’s deep oceans", "correct": false, "trap": null}]'::jsonb, 'C', 'Europa is introduced as a location where hydrothermal activity may produce conditions similar to deep-sea vents, potentially supporting chemosynthetic life. A reverses the direction. B is wrong — no life has been confirmed on Europa. D is wrong — the passage draws a parallel, not a contrast.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 29, 'Comprehension', 'According to the passage, what were ROVs originally developed to do?', '[{"id": "A", "text": "Collect biological samples from hydrothermal vent ecosystems", "correct": false, "trap": null}, {"id": "B", "text": "Service offshore oil infrastructure", "correct": true, "trap": null}, {"id": "C", "text": "Conduct deep-sea geological surveys", "correct": false, "trap": null}, {"id": "D", "text": "Map the seabed in regions inaccessible to crewed submersibles", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage states explicitly that ROVs “were originally developed to service offshore oil infrastructure.” A, C and D all describe subsequent scientific uses, not the original purpose.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 30, 'Comprehension', 'Which of the following best summarises the range of knowledge that ROV missions have contributed to, according to paragraph 5?', '[{"id": "A", "text": "Marine biology, plate tectonics, underwater geology, and ocean chemistry", "correct": true, "trap": null}, {"id": "B", "text": "Marine biology, hydrothermal vent ecology, and submersible design", "correct": false, "trap": null}, {"id": "C", "text": "Oceanography, offshore engineering, and space exploration technology", "correct": false, "trap": null}, {"id": "D", "text": "Plate tectonics, atmospheric science, and deep-sea conservation", "correct": false, "trap": null}]'::jsonb, 'A', 'Paragraph 5 states ROV missions contributed to knowledge of “deep-sea biology,” “plate tectonics,” “underwater geology,” and “the chemical composition of the ocean at depth.” B incorrectly includes submersible design. C incorrectly includes space exploration. D incorrectly includes atmospheric science.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 31, 'Comprehension', 'What does the word “formidable” mean as used in paragraph 2?', '[{"id": "A", "text": "Dangerous", "correct": false, "trap": null}, {"id": "B", "text": "Impressive", "correct": false, "trap": null}, {"id": "C", "text": "Extremely demanding", "correct": true, "trap": null}, {"id": "D", "text": "Largely unsolvable", "correct": false, "trap": null}]'::jsonb, 'C', '“Formidable” here means extremely demanding or imposing in scale. A (dangerous) is related but not the primary meaning. B (impressive) misses the sense of difficulty. D (largely unsolvable) overstates.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 32, 'Comprehension', 'According to the final paragraph, what concern do scientists increasingly hold about deep-sea exploration?', '[{"id": "A", "text": "That the cost of exploration makes it impossible to sustain long-term research programmes", "correct": false, "trap": null}, {"id": "B", "text": "That the presence of equipment may damage ecosystems evolved in conditions of great stability", "correct": true, "trap": null}, {"id": "C", "text": "That the data gathered by ROVs is insufficiently detailed to support meaningful conclusions", "correct": false, "trap": null}, {"id": "D", "text": "That the failure rate of deep-sea equipment undermines the reliability of scientific findings", "correct": false, "trap": null}]'::jsonb, 'B', 'The final paragraph states scientists are aware that exploration “may disturb ecosystems that have evolved in conditions of almost complete stability over millions of years.” A overstates. C and D are not stated as the concern scientists “increasingly hold.”', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 33, 'Comprehension', 'The writer describes the pressure at the Challenger Deep as capable of crushing “conventional steel hulls in seconds.” What is the purpose of this detail?', '[{"id": "A", "text": "To explain why the Mariana Trench has only been explored by ROVs rather than crewed vessels", "correct": false, "trap": null}, {"id": "B", "text": "To convey the extraordinary scale of the engineering challenge involved in deep-sea exploration", "correct": true, "trap": null}, {"id": "C", "text": "To demonstrate that current technology is entirely inadequate for reaching the deepest ocean points", "correct": false, "trap": null}, {"id": "D", "text": "To contrast the limitations of steel construction with newer materials used in modern submersibles", "correct": false, "trap": null}]'::jsonb, 'B', 'The detail about crushing steel hulls “in seconds” is a vivid measure conveying the extraordinary scale of the engineering challenge. A is too specific and not stated. C overstates — purpose-built vessels have made the descent. D invents a contrast not in the passage.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 34, 'Comprehension', 'Which of the following best describes the overall structure of the passage?', '[{"id": "A", "text": "A problem is introduced, followed by historical context, then recent discoveries, and finally a balanced conclusion", "correct": true, "trap": null}, {"id": "B", "text": "A series of arguments for and against deep-sea exploration, leading to a definitive conclusion", "correct": false, "trap": null}, {"id": "C", "text": "A chronological account of deep-sea exploration from the nineteenth century to the present day", "correct": false, "trap": null}, {"id": "D", "text": "An explanation of hydrothermal vents followed by an assessment of their biological importance", "correct": false, "trap": null}]'::jsonb, 'A', 'The passage opens with the scale of the unknown (problem), moves through historical context and the 1977 discovery, develops implications and technology, then ends with a balanced acknowledgement. B is wrong — it is not structured as argument and counter-argument. C is wrong — the structure is thematic, not strictly chronological. D is too narrow.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 35, 'Comprehension', 'The phrase “a more profound frontier than outer space” is used to suggest that the deep ocean is:', '[{"id": "A", "text": "More scientifically important than space exploration", "correct": false, "trap": null}, {"id": "B", "text": "More poorly understood and less accessible than is commonly assumed", "correct": true, "trap": null}, {"id": "C", "text": "More hostile to human life than the vacuum of space", "correct": false, "trap": null}, {"id": "D", "text": "More likely to yield significant scientific discoveries in future", "correct": false, "trap": null}]'::jsonb, 'B', 'The phrase argues that the ocean is a more profound frontier because it is less mapped and understood than space — contradicting the common assumption. A makes a value judgement not quite made in the text. C (more hostile) is not argued. D (more likely to yield discoveries) is not stated.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 36, 'Comprehension', 'According to the passage, what assumption did scientists hold before the 1970s regarding deep-sea life?', '[{"id": "A", "text": "That the deep ocean was entirely uninhabited due to its extreme conditions", "correct": false, "trap": null}, {"id": "B", "text": "That life without access to sunlight was biologically impossible", "correct": true, "trap": null}, {"id": "C", "text": "That deep-sea organisms relied on nutrients descending from shallower water", "correct": false, "trap": null}, {"id": "D", "text": "That photosynthesis could not function effectively below one thousand metres", "correct": false, "trap": null}]'::jsonb, 'B', 'Paragraph 3 states it was “widely assumed that life could not exist in environments entirely devoid of sunlight.” A overstates. C (nutrients descending) is not mentioned. D mislocates the assumption to a specific depth.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 37, 'Comprehension', 'Which of the following is NOT mentioned in the passage as a challenge facing deep-sea exploration?', '[{"id": "A", "text": "The extreme cost of research expeditions", "correct": false, "trap": null}, {"id": "B", "text": "The risk of damaging fragile ecosystems", "correct": false, "trap": null}, {"id": "C", "text": "The difficulty of recruiting trained crew for deep-sea missions", "correct": true, "trap": null}, {"id": "D", "text": "The unreliability of equipment at extreme depths", "correct": false, "trap": null}]'::jsonb, 'C', 'The passage mentions cost (A), ecosystem disturbance (B), and equipment failure (D) explicitly. The difficulty of recruiting trained crew (C) is never mentioned.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 38, 'Comprehension', 'What does the passage imply about the relationship between commercial technology and scientific research?', '[{"id": "A", "text": "Commercial pressures have consistently slowed the development of deep-sea research tools", "correct": false, "trap": null}, {"id": "B", "text": "Technology developed for industrial purposes can subsequently be adapted for scientific use", "correct": true, "trap": null}, {"id": "C", "text": "Scientific research has driven advances in offshore commercial engineering", "correct": false, "trap": null}, {"id": "D", "text": "The two fields have developed in isolation, with few shared technologies", "correct": false, "trap": null}]'::jsonb, 'B', 'The ROV example — developed for offshore oil, then adapted for science — directly illustrates how commercial technology can be repurposed. A is contradicted by this example. C reverses the direction. D is directly contradicted.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 39, 'Comprehension', 'Which of the following words best describes the tone of the passage as a whole?', '[{"id": "A", "text": "Enthusiastic and persuasive", "correct": false, "trap": null}, {"id": "B", "text": "Cautious and pessimistic", "correct": false, "trap": null}, {"id": "C", "text": "Informative and measured", "correct": true, "trap": null}, {"id": "D", "text": "Technical and inaccessible", "correct": false, "trap": null}]'::jsonb, 'C', 'The passage presents information clearly and objectively, acknowledging both discoveries and challenges without emotional advocacy. A overstates. B misreads the balance of the final paragraph. D is wrong — the passage is accessible to an educated general audience.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'non_fiction_comprehension')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 40, 'Comprehension', 'Which of the following statements is best supported by the passage as a whole?', '[{"id": "A", "text": "The deep ocean will remain beyond the reach of scientific study for the foreseeable future", "correct": false, "trap": null}, {"id": "B", "text": "The exploration of the deep ocean has transformed our understanding of life and carries significant responsibilities", "correct": true, "trap": null}, {"id": "C", "text": "Advances in ROV technology have made deep-sea exploration broadly affordable and routine", "correct": false, "trap": null}, {"id": "D", "text": "The primary motivation for deep-sea research is the search for life in the solar system", "correct": false, "trap": null}]'::jsonb, 'B', 'The passage demonstrates throughout that deep-sea exploration has transformed biology and ecology, while the final paragraph introduces the responsibility of protection. A is contradicted by the account of ongoing exploration. C is contradicted by the description of enormous cost. D overstates one implication as the primary motivation.', 'English', 'Comprehension', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 41, 'Spelling', 'Question 41: Identify the section with the spelling mistake, or choose N if there is no mistake. A: The professor had / B: dedicated his entire carreer / C: to the study of / D: ancient civilisations. / N: No mistake', '[{"id": "A", "text": "The professor had", "correct": false, "trap": null}, {"id": "B", "text": "dedicated his entire carreer", "correct": true, "trap": null}, {"id": "C", "text": "to the study of", "correct": false, "trap": null}, {"id": "D", "text": "ancient civilisations.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'B', 'carreer should be career. Single r only. The double-r mirrors words such as occur and misleads students who over-apply consonant-doubling rules.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 42, 'Spelling', 'Question 42: Identify the section with the spelling mistake, or choose N if there is no mistake. A: She arranged the documents / B: in alphabetical order / C: before submitting them / D: to the commitee. / N: No mistake', '[{"id": "A", "text": "She arranged the documents", "correct": false, "trap": null}, {"id": "B", "text": "in alphabetical order", "correct": false, "trap": null}, {"id": "C", "text": "before submitting them", "correct": false, "trap": null}, {"id": "D", "text": "to the commitee.", "correct": true, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'D', 'commitee should be committee. Requires double m AND double t. The misspelling retains one double and drops the other — a characteristically believable error.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 43, 'Spelling', 'Question 43: Identify the section with the spelling mistake, or choose N if there is no mistake. A: It was immediately / B: apparant that the bridge / C: had not been maintained / D: for several decades. / N: No mistake', '[{"id": "A", "text": "It was immediately", "correct": false, "trap": null}, {"id": "B", "text": "apparant that the bridge", "correct": true, "trap": null}, {"id": "C", "text": "had not been maintained", "correct": false, "trap": null}, {"id": "D", "text": "for several decades.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'B', 'apparant should be apparent. The -ent/-ant suffix confusion is among the most common errors at this level. Apparant looks entirely plausible at speed.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 44, 'Spelling', 'Question 44: Identify the section with the spelling mistake, or choose N if there is no mistake. A: The soldiers marched / B: in formation through / C: the narrow streets / D: of the ancient city. / N: No mistake', '[{"id": "A", "text": "The soldiers marched", "correct": false, "trap": null}, {"id": "B", "text": "in formation through", "correct": false, "trap": null}, {"id": "C", "text": "the narrow streets", "correct": false, "trap": null}, {"id": "D", "text": "of the ancient city.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": true, "trap": null}]'::jsonb, 'N', 'No mistake. All spellings are correct. Included to create hesitation — students may suspect formation or ancient and waste time rechecking.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 45, 'Spelling', 'Question 45: Identify the section with the spelling mistake, or choose N if there is no mistake. A: His conscience / B: would not permit him / C: to remain silient / D: in the face of such injustice. / N: No mistake', '[{"id": "A", "text": "His conscience", "correct": false, "trap": null}, {"id": "B", "text": "would not permit him", "correct": false, "trap": null}, {"id": "C", "text": "to remain silient", "correct": true, "trap": null}, {"id": "D", "text": "in the face of such injustice.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'C', 'silient should be silent. The insertion of an extra i is subtle enough to be missed at speed. Students scanning quickly may register the word shape without catching the error.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 46, 'Spelling', 'Question 46: Identify the section with the spelling mistake, or choose N if there is no mistake. A: The headteacher gave / B: a particularly / C: eloquent speech / D: at the anual prize-giving ceremony. / N: No mistake', '[{"id": "A", "text": "The headteacher gave", "correct": false, "trap": null}, {"id": "B", "text": "a particularly", "correct": false, "trap": null}, {"id": "C", "text": "eloquent speech", "correct": false, "trap": null}, {"id": "D", "text": "at the anual prize-giving ceremony.", "correct": true, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'D', 'anual should be annual. The surrounding longer words draw the eye away from this short word, making the missing n easy to overlook.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 47, 'Spelling', 'Question 47: Identify the section with the spelling mistake, or choose N if there is no mistake. A: Despite the difficulties, / B: she remained / C: remarkably persistant / D: throughout the investigation. / N: No mistake', '[{"id": "A", "text": "Despite the difficulties,", "correct": false, "trap": null}, {"id": "B", "text": "she remained", "correct": false, "trap": null}, {"id": "C", "text": "remarkably persistant", "correct": true, "trap": null}, {"id": "D", "text": "throughout the investigation.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'C', 'persistant should be persistent. The -ant/-ent trap is made harder because resistant ends in -ant, making persistant feel correct by analogy.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 48, 'Spelling', 'Question 48: Identify the section with the spelling mistake, or choose N if there is no mistake. A: The museum''s / B: newest aquisition / C: attracted considerable / D: attention from scholars worldwide. / N: No mistake', '[{"id": "A", "text": "The museum''s", "correct": false, "trap": null}, {"id": "B", "text": "newest aquisition", "correct": true, "trap": null}, {"id": "C", "text": "attracted considerable", "correct": false, "trap": null}, {"id": "D", "text": "attention from scholars worldwide.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'B', 'aquisition should be acquisition. The silent c is among the most frequently omitted letters in this word. The misspelling is visually convincing.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 49, 'Spelling', 'Question 49: Identify the section with the spelling mistake, or choose N if there is no mistake. A: The parliament / B: voted unanimously / C: to reccommend / D: a full public inquiry. / N: No mistake', '[{"id": "A", "text": "The parliament", "correct": false, "trap": null}, {"id": "B", "text": "voted unanimously", "correct": false, "trap": null}, {"id": "C", "text": "to reccommend", "correct": true, "trap": null}, {"id": "D", "text": "a full public inquiry.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'C', 'reccommend should be recommend. Only one c, double m. The misspelling doubles the wrong consonant — exactly the error students make when they know a word has a double letter but misplace it.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'spelling')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 50, 'Spelling', 'Question 50: Identify the section with the spelling mistake, or choose N if there is no mistake. A: The temperature / B: in the laboratory / C: must remain / D: consistent throughout the experiment. / N: No mistake', '[{"id": "A", "text": "The temperature", "correct": false, "trap": null}, {"id": "B", "text": "in the laboratory", "correct": false, "trap": null}, {"id": "C", "text": "must remain", "correct": false, "trap": null}, {"id": "D", "text": "consistent throughout the experiment.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": true, "trap": null}]'::jsonb, 'N', 'No mistake. Laboratory, consistent and temperature are all correctly spelled. Students under pressure frequently second-guess these words, wasting time on a clean sentence.', 'English', 'Spelling', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 51, 'Punctuation', 'Question 51: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: “I cannot believe / B: you have done this” / C: said Mr. Hartley, / D: turning sharply away. / N: No mistake', '[{"id": "A", "text": "“I cannot believe", "correct": false, "trap": null}, {"id": "B", "text": "you have done this”", "correct": true, "trap": null}, {"id": "C", "text": "said Mr. Hartley,", "correct": false, "trap": null}, {"id": "D", "text": "turning sharply away.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'B', 'The closing quotation mark should follow a comma, not stand alone: “I cannot believe you have done this,” said Mr. Hartley. The comma belongs inside the speech marks before the reporting clause.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 52, 'Punctuation', 'Question 52: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: The results however / B: were far more / C: significant than the / D: researchers had anticipated. / N: No mistake', '[{"id": "A", "text": "The results however", "correct": true, "trap": null}, {"id": "B", "text": "were far more", "correct": false, "trap": null}, {"id": "C", "text": "significant than the", "correct": false, "trap": null}, {"id": "D", "text": "researchers had anticipated.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'A', '“The results however” requires commas around however as a parenthetical adverb: The results, however, were… Students often miss the first comma while looking for the second.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 53, 'Punctuation', 'Question 53: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: After the long journey / B: the explorers set up camp / C: beside the river, / D: exhausted but determined. / N: No mistake', '[{"id": "A", "text": "After the long journey", "correct": true, "trap": null}, {"id": "B", "text": "the explorers set up camp", "correct": false, "trap": null}, {"id": "C", "text": "beside the river,", "correct": false, "trap": null}, {"id": "D", "text": "exhausted but determined.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'A', 'A comma is required after the fronted adverbial clause After the long journey: After the long journey, the explorers… The comma in section C is correctly placed, which distracts students into thinking the sentence is punctuated correctly overall.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 54, 'Punctuation', 'Question 54: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: It was Charles'' / B: responsibility to ensure / C: that the equipment / D: was secured before nightfall. / N: No mistake', '[{"id": "A", "text": "It was Charles''", "correct": true, "trap": null}, {"id": "B", "text": "responsibility to ensure", "correct": false, "trap": null}, {"id": "C", "text": "that the equipment", "correct": false, "trap": null}, {"id": "D", "text": "was secured before nightfall.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'A', 'Charless should be Charles’s. A possessive apostrophe is required. When a singular noun ends in s — whether a common noun such as bus or a proper name such as Charles — the possessive is formed by adding ’s: the bus’s engine, Charles’s responsibility. This differs from a plural possessive, where the apostrophe follows the existing s with no additional letter: the teachers’ staffroom (belonging to multiple teachers). Students who know that names ending in s are ‘tricky’ sometimes omit the apostrophe entirely or place it incorrectly after the final letter without the additional s.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 55, 'Punctuation', 'Question 55: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: The children’s coats / B: were hanging neatly / C: in the corridor however / D: their boots were missing. / N: No mistake', '[{"id": "A", "text": "The children’s coats", "correct": false, "trap": null}, {"id": "B", "text": "were hanging neatly", "correct": false, "trap": null}, {"id": "C", "text": "in the corridor however", "correct": true, "trap": null}, {"id": "D", "text": "their boots were missing.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'C', 'in the corridor however creates a comma splice between two independent clauses with no punctuation before however. Correct: in the corridor; however, or restructured. The adverb however cannot join two independent clauses on its own — a semicolon or full stop is required before it.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 56, 'Punctuation', 'Question 56: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: “We will depart / B: at dawn,” announced / C: the general, “and we / D: will not look back.” / N: No mistake', '[{"id": "A", "text": "“We will depart", "correct": false, "trap": null}, {"id": "B", "text": "at dawn,” announced", "correct": false, "trap": null}, {"id": "C", "text": "the general, “and we", "correct": false, "trap": null}, {"id": "D", "text": "will not look back.”", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": true, "trap": null}]'::jsonb, 'N', 'No mistake. The interrupted speech is correctly punctuated: comma after dawn, speech marks correctly placed, and the continuation begins with a lowercase letter. Included to reward students who confidently recognise correct speech punctuation under pressure.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 57, 'Punctuation', 'Question 57: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: Having reviewed / B: all of the evidence, / C: the judge concluded that / D: the verdict was unsafe. / N: No mistake', '[{"id": "A", "text": "Having reviewed", "correct": false, "trap": null}, {"id": "B", "text": "all of the evidence,", "correct": false, "trap": null}, {"id": "C", "text": "the judge concluded that", "correct": false, "trap": null}, {"id": "D", "text": "the verdict was unsafe.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": true, "trap": null}]'::jsonb, 'N', 'No mistake. The fronted participial phrase Having reviewed all of the evidence is correctly followed by a comma. Students may suspect section B or C, but both are entirely correct.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 58, 'Punctuation', 'Question 58: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: The three main rivers, / B: the Nile, the Amazon / C: and the Yangtze, / D: are among the worlds longest. / N: No mistake', '[{"id": "A", "text": "The three main rivers,", "correct": false, "trap": null}, {"id": "B", "text": "the Nile, the Amazon", "correct": false, "trap": null}, {"id": "C", "text": "and the Yangtze,", "correct": false, "trap": null}, {"id": "D", "text": "are among the worlds longest.", "correct": true, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'D', 'the worlds longest should be the world’s longest. Missing possessive apostrophe. Placed at the very end of the sentence, where tired students are least likely to scrutinise carefully.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 59, 'Punctuation', 'Question 59: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: The scientist who / B: had spent thirty years / C: on the project finally / D: published her findings. / N: No mistake', '[{"id": "A", "text": "The scientist who", "correct": true, "trap": null}, {"id": "B", "text": "had spent thirty years", "correct": false, "trap": null}, {"id": "C", "text": "on the project finally", "correct": false, "trap": null}, {"id": "D", "text": "published her findings.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": false, "trap": null}]'::jsonb, 'A', 'The non-defining relative clause who had spent thirty years on the project must be enclosed in commas. The opening comma is missing after scientist in section A. Correct: The scientist, who had spent thirty years on the project, finally published…', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'punctuation')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 60, 'Punctuation', 'Question 60: Identify the section with the punctuation mistake, or choose N if there is no mistake. A: It was an unusually / B: warm evening; the guests / C: gathered on the terrace / D: and waited for the announcement. / N: No mistake', '[{"id": "A", "text": "It was an unusually", "correct": false, "trap": null}, {"id": "B", "text": "warm evening; the guests", "correct": false, "trap": null}, {"id": "C", "text": "gathered on the terrace", "correct": false, "trap": null}, {"id": "D", "text": "and waited for the announcement.", "correct": false, "trap": null}, {"id": "N", "text": "No mistake", "correct": true, "trap": null}]'::jsonb, 'N', 'No mistake. The semicolon correctly joins two related independent clauses. Students uncertain about semicolons may flag section B, but the usage here is entirely correct.', 'English', 'Punctuation', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 61, 'Grammar', 'The committee, along with several independent advisors, _____ yet to reach a final decision.', '[{"id": "A", "text": "have", "correct": false, "trap": null}, {"id": "B", "text": "are", "correct": false, "trap": null}, {"id": "C", "text": "is", "correct": true, "trap": null}, {"id": "D", "text": "were", "correct": false, "trap": null}, {"id": "E", "text": "being", "correct": false, "trap": null}]'::jsonb, 'C', 'The subject is the committee — a singular collective noun. The phrase along with several independent advisors is parenthetical: it adds information but does not alter the grammatical subject of the sentence. Have and are are the most tempting distractors because the phrase makes the sentence feel plural, but the verb must agree with the main subject, not with the nearest noun.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 62, 'Grammar', 'By the time the rescue team arrived, the survivors _____ in the cave for over forty hours.', '[{"id": "A", "text": "waited", "correct": false, "trap": null}, {"id": "B", "text": "were waiting", "correct": false, "trap": null}, {"id": "C", "text": "have waited", "correct": false, "trap": null}, {"id": "D", "text": "had been waiting", "correct": true, "trap": null}, {"id": "E", "text": "would wait", "correct": false, "trap": null}]'::jsonb, 'D', 'The action began before the team’s arrival and continued up to that point, requiring the past perfect continuous. Were waiting sounds natural but does not capture the extended duration relative to the past reference point. Have waited uses the wrong tense entirely.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 63, 'Grammar', 'The new policy will affect not only the students _____ the teaching staff as well.', '[{"id": "A", "text": "but also", "correct": true, "trap": null}, {"id": "B", "text": "and also", "correct": false, "trap": null}, {"id": "C", "text": "but even", "correct": false, "trap": null}, {"id": "D", "text": "and too", "correct": false, "trap": null}, {"id": "E", "text": "as well as", "correct": false, "trap": null}]'::jsonb, 'A', 'This is the fixed correlative conjunction structure: not only… but also. And also sounds natural in speech and will catch students not alert to correlative pair logic. As well as cannot follow not only idiomatically in this structure.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 64, 'Grammar', 'He was the sort of man _____ presence could silence a room without a word being spoken.', '[{"id": "A", "text": "which", "correct": false, "trap": null}, {"id": "B", "text": "that", "correct": false, "trap": null}, {"id": "C", "text": "whom", "correct": false, "trap": null}, {"id": "D", "text": "whose", "correct": true, "trap": null}, {"id": "E", "text": "who", "correct": false, "trap": null}]'::jsonb, 'D', 'A possessive relative pronoun is needed to modify presence: a man whose presence. Who and whom are strong distractors — students must recognise that whose shows possession, not simply introduces a relative clause.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 65, 'Grammar', 'Hardly had the first shots been fired _____ the soldiers retreated to the ridge.', '[{"id": "A", "text": "than", "correct": false, "trap": null}, {"id": "B", "text": "when", "correct": true, "trap": null}, {"id": "C", "text": "then", "correct": false, "trap": null}, {"id": "D", "text": "before", "correct": false, "trap": null}, {"id": "E", "text": "as", "correct": false, "trap": null}]'::jsonb, 'B', 'The sentence uses the fixed correlative adverbial structure Hardly… when, which expresses that one event occurred almost immediately after another. Than (A) is the most tempting wrong answer because students confuse this construction with the no sooner… than pattern — but hardly and scarcely always pair with when, never with than. Then (C) is an adverb, not a conjunction, and cannot join clauses in this structure.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 66, 'Grammar', 'She found the second examination considerably _____ than the first.', '[{"id": "A", "text": "more difficult", "correct": true, "trap": null}, {"id": "B", "text": "difficulter", "correct": false, "trap": null}, {"id": "C", "text": "most difficult", "correct": false, "trap": null}, {"id": "D", "text": "much difficult", "correct": false, "trap": null}, {"id": "E", "text": "difficultly", "correct": false, "trap": null}]'::jsonb, 'A', 'The only correct comparative form of difficult in formal written English. Difficulter (B) is an over-regularisation error: English forms comparatives with -er only for short adjectives of one or two syllables. Most difficult (C) is superlative, not comparative. Much difficult (D) requires more to be grammatically complete. Note: difficulter does occasionally appear in informal spoken English, but in all formal written contexts and standardised examinations, more difficult is the unambiguous and required form.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 67, 'Grammar', 'The evidence suggested that neither of the suspects _____ in the building at the time.', '[{"id": "A", "text": "were", "correct": false, "trap": null}, {"id": "B", "text": "have been", "correct": false, "trap": null}, {"id": "C", "text": "are", "correct": false, "trap": null}, {"id": "D", "text": "was", "correct": true, "trap": null}, {"id": "E", "text": "had been", "correct": false, "trap": null}]'::jsonb, 'D', 'Neither of the suspects takes a singular verb. Were is the overwhelming instinctive choice and will catch the majority of students who do not pause. Had been (E) is a plausible distractor in the past narrative context, but the singular neither confirms was.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 68, 'Grammar', 'The bridge, _____ construction had taken six years, was officially opened last spring.', '[{"id": "A", "text": "which", "correct": false, "trap": null}, {"id": "B", "text": "whose", "correct": true, "trap": null}, {"id": "C", "text": "that", "correct": false, "trap": null}, {"id": "D", "text": "whom", "correct": false, "trap": null}, {"id": "E", "text": "of which", "correct": false, "trap": null}]'::jsonb, 'B', 'A possessive relative pronoun is needed: the bridge whose construction. Which (A) is the most tempting wrong answer — students may attempt the bridge, which construction by analogy with relative clauses, but this is grammatically impossible without a preposition. Of which would also work structurally (the construction of which) but is not one of the options as phrased.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 69, 'Grammar', '_____ the report was incomplete, the board decided to proceed with the vote.', '[{"id": "A", "text": "Despite", "correct": false, "trap": null}, {"id": "B", "text": "Although", "correct": true, "trap": null}, {"id": "C", "text": "Unless", "correct": false, "trap": null}, {"id": "D", "text": "Even so", "correct": false, "trap": null}, {"id": "E", "text": "Whereas", "correct": false, "trap": null}]'::jsonb, 'B', 'The sentence requires a subordinating conjunction signalling concession: despite the report being incomplete, the board proceeded. Although is the only option that functions as a subordinating conjunction linking two finite clauses (clauses with their own subject and conjugated verb). Despite (A) is grammatically impossible here: despite is a preposition, not a conjunction, and must be followed by a noun phrase or gerund — never by a finite clause. “Despite the report was incomplete” is ungrammatical because the report was incomplete is a finite clause, not a noun phrase. The correct preposition-based version would be: Despite the report being incomplete… Even so (D) is an adverb, not a conjunction, and cannot introduce a subordinate clause.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();


WITH paper AS (SELECT id FROM public.live_mock_papers WHERE slug = 'live-11plus-english-mock-2026-05-09-1700'),
section AS (SELECT s.id FROM public.live_mock_sections s JOIN paper p ON p.id = s.paper_id WHERE s.section_key = 'grammar')
INSERT INTO public.live_mock_questions (paper_id, section_id, question_number, question_type, stem, options, correct_answer, explanation, topic, subtopic, difficulty)
SELECT paper.id, section.id, 70, 'Grammar', 'The delegation arrived later _____ expected, having been delayed by severe weather conditions.', '[{"id": "A", "text": "as", "correct": false, "trap": null}, {"id": "B", "text": "like", "correct": false, "trap": null}, {"id": "C", "text": "than", "correct": true, "trap": null}, {"id": "D", "text": "from", "correct": false, "trap": null}, {"id": "E", "text": "then", "correct": false, "trap": null}]'::jsonb, 'C', 'Comparative structures require than. Then (E) is the most common wrong answer — a homophone confusion made when students are not reading the sentence as a comparison. As (A) would require an as… as construction.', 'English', 'Grammar', 3
FROM paper, section
ON CONFLICT (paper_id, question_number) DO UPDATE SET
  section_id = EXCLUDED.section_id,
  question_type = EXCLUDED.question_type,
  stem = EXCLUDED.stem,
  options = EXCLUDED.options,
  correct_answer = EXCLUDED.correct_answer,
  explanation = EXCLUDED.explanation,
  topic = EXCLUDED.topic,
  subtopic = EXCLUDED.subtopic,
  difficulty = EXCLUDED.difficulty,
  updated_at = now();
