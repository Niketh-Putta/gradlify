-- Create topic catalog table
CREATE TABLE public.topic_catalog (
  topic_key text NOT NULL,
  subtopic_key text NOT NULL,
  title text NOT NULL,
  order_index integer NOT NULL,
  PRIMARY KEY (topic_key, subtopic_key)
);

-- Create subtopic progress table
CREATE TABLE public.subtopic_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  topic_key text NOT NULL,
  subtopic_key text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_key, subtopic_key)
);

-- Enable Row Level Security
ALTER TABLE public.subtopic_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subtopic_progress
CREATE POLICY "Users can view their own progress" 
ON public.subtopic_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" 
ON public.subtopic_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" 
ON public.subtopic_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on subtopic_progress
CREATE TRIGGER update_subtopic_progress_updated_at
BEFORE UPDATE ON public.subtopic_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert topic catalog data for Edexcel GCSE Mathematics
INSERT INTO public.topic_catalog (topic_key, subtopic_key, title, order_index) VALUES
-- Number
('number', 'integers_place_value', 'Integers & place value', 1),
('number', 'fractions_decimals_percentages', 'Fractions, decimals & percentages', 2),
('number', 'indices_powers_roots', 'Indices, powers & roots', 3),
('number', 'standard_form', 'Standard form', 4),
('number', 'surds_higher', 'Surds (Higher)', 5),
('number', 'bounds_estimations', 'Bounds & estimation', 6),

-- Algebra
('algebra', 'algebra_basics', 'Expressions, collecting like terms', 1),
('algebra', 'substitution_expansion_factorising', 'Substitution, expand, factorise', 2),
('algebra', 'equations_inequalities', 'Linear equations & inequalities', 3),
('algebra', 'simultaneous_equations', 'Simultaneous equations', 4),
('algebra', 'quadratics_factorise', 'Quadratics (factorise)', 5),
('algebra', 'quadratics_complete_square', 'Quadratics (complete the square)', 6),
('algebra', 'quadratic_formula', 'Quadratic formula', 7),
('algebra', 'sequences', 'Sequences & nth term', 8),
('algebra', 'graphs_linear_quadratic_other', 'Graphs (linear, quadratic, others)', 9),

-- Ratio
('ratio', 'ratio_sharing', 'Ratio & sharing', 1),
('ratio', 'proportion_direct_inverse', 'Direct & inverse proportion', 2),
('ratio', 'percentages_change_growth', 'Percentages (change, growth/decay)', 3),
('ratio', 'rates_of_change', 'Rates of change', 4),

-- Geometry
('geometry', 'perimeter_area_volume', 'Perimeter, area & volume', 1),
('geometry', 'pythagoras', 'Pythagoras', 2),
('geometry', 'trigonometry_sohcahtoa', 'Trigonometry (SOHCAHTOA)', 3),
('geometry', 'trig_graphs_identities_higher', 'Trig graphs/identities (Higher)', 4),
('geometry', 'angles_parallel_polygons', 'Angles (parallel lines, polygons)', 5),
('geometry', 'transformations', 'Transformations', 6),
('geometry', 'vectors', 'Vectors', 7),
('geometry', 'circle_theorems', 'Circle theorems', 8),
('geometry', 'constructions_loci', 'Constructions & loci', 9),

-- Probability
('probability', 'basic_probability', 'Basic probability & lists', 1),
('probability', 'venn_sets', 'Venn diagrams & sets', 2),
('probability', 'two_way_tables', 'Two-way tables', 3),
('probability', 'tree_diagrams', 'Tree diagrams (with/without replacement)', 4),

-- Statistics
('statistics', 'averages_spread', 'Averages & spread', 1),
('statistics', 'charts_pie_bar_line', 'Charts (pie/bar/line)', 2),
('statistics', 'cumulative_frequency_boxplots', 'Cumulative frequency & box plots', 3),
('statistics', 'histograms', 'Histograms', 4),
('statistics', 'scatter_correlation', 'Scatter & correlation', 5);;
