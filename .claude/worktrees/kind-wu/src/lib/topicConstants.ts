export const TOPIC_SUBTOPICS = {
  number: {
    name: 'Number',
    subtopics: [
      { key: 'integers', name: 'Integers and place value' },
      { key: 'decimals', name: 'Decimals' },
      { key: 'fractions', name: 'Fractions' },
      { key: 'fractions_decimals_percent', name: 'Fractions, decimals and percentages conversions' },
      { key: 'percentages', name: 'Percentages' },
      { key: 'powers', name: 'Powers and roots' },
      { key: 'factors_multiples', name: 'Factors, multiples and primes' },
      { key: 'hcf_lcm', name: 'HCF and LCM' },
      { key: 'negative_numbers', name: 'Negative numbers' },
      { key: 'bidmas', name: 'Order of operations (BIDMAS)' },
      { key: 'rounding_bounds', name: 'Rounding, estimation and bounds' },
      { key: 'standard_form', name: 'Standard form' },
      { key: 'surds', name: 'Surds' },
      { key: 'recurring_decimals', name: 'Recurring decimals' },
      { key: 'unit_conversions', name: 'Unit conversions' }
    ]
  },
  algebra: {
    name: 'Algebra',
    subtopics: [
      { key: 'expressions', name: 'Algebraic expressions' },
      { key: 'expand', name: 'Expanding brackets' },
      { key: 'factorise', name: 'Factorising' },
      { key: 'substitution', name: 'Substitution' },
      { key: 'rearranging', name: 'Rearranging formulae' },
      { key: 'equations', name: 'Linear equations' },
      { key: 'inequalities', name: 'Inequalities' },
      { key: 'simultaneous', name: 'Simultaneous equations' },
      { key: 'sequences', name: 'Sequences' },
      { key: 'nth_term', name: 'Nth term' },
      { key: 'graphs', name: 'Graphs and functions' },
      { key: 'gradients', name: 'Gradients and intercepts' },
      { key: 'quadratics', name: 'Quadratic equations' },
      { key: 'algebraic_fractions', name: 'Algebraic fractions' }
    ]
  },
  ratio: {
    name: 'Ratio & Proportion',
    subtopics: [
      { key: 'ratio', name: 'Ratio & Proportion' },
      { key: 'proportion', name: 'Direct proportion' },
      { key: 'percentage_change', name: 'Percentage change' },
      { key: 'reverse_percentages', name: 'Reverse percentages' },
      { key: 'ratio_share', name: 'Sharing in a ratio' },
      { key: 'rates', name: 'Rates (speed, density, pressure)' },
      { key: 'speed', name: 'Speed = distance / time' },
      { key: 'best_buys', name: 'Best buys' },
      { key: 'growth_decay', name: 'Repeated percentage change' },
      { key: 'compound_interest', name: 'Compound interest' },
      { key: 'direct_inverse', name: 'Direct and inverse proportion' },
      { key: 'similarity_scale', name: 'Scale factors and similarity' }
    ]
  },
  geometry: {
    name: 'Geometry & Measures',
    subtopics: [
      { key: 'shapes', name: '2D and 3D shapes' },
      { key: 'perimeter_area', name: 'Perimeter and area' },
      { key: 'area_volume', name: 'Area and volume' },
      { key: 'angles', name: 'Angles and triangles' },
      { key: 'polygons', name: 'Polygons' },
      { key: 'trigonometry', name: 'Trigonometry' },
      { key: 'pythagoras', name: 'Pythagoras theorem' },
      { key: 'circles', name: 'Circles' },
      { key: 'arcs_sectors', name: 'Arcs and sectors' },
      { key: 'surface_area', name: 'Surface area' },
      { key: 'volume', name: 'Volume' },
      { key: 'bearings', name: 'Bearings' },
      { key: 'transformations', name: 'Transformations' },
      { key: 'constructions_loci', name: 'Constructions and loci' },
      { key: 'congruence', name: 'Congruence' },
      { key: 'vectors', name: 'Vectors' },
      { key: 'circle_theorems', name: 'Circle theorems' }
    ]
  },
  probability: {
    name: 'Probability',
    subtopics: [
      { key: 'basic', name: 'Basic probability' },
      { key: 'combined', name: 'Combined events' },
      { key: 'tree_diagrams', name: 'Tree diagrams' },
      { key: 'conditional', name: 'Conditional probability' },
      { key: 'relative_frequency', name: 'Relative frequency' },
      { key: 'venn_diagrams', name: 'Venn diagrams' },
      { key: 'expected_frequency', name: 'Expected frequency' },
      { key: 'independence', name: 'Independence' },
      { key: 'mutually_exclusive', name: 'Mutually exclusive events' }
    ]
  },
  statistics: {
    name: 'Statistics',
    subtopics: [
      { key: 'data', name: 'Data collection' },
      { key: 'averages', name: 'Averages and spread' },
      { key: 'charts', name: 'Charts and graphs' },
      { key: 'correlation', name: 'Correlation' },
      { key: 'sampling', name: 'Sampling' },
      { key: 'frequency_tables', name: 'Frequency tables' },
      { key: 'spread', name: 'Range and IQR' },
      { key: 'scatter', name: 'Scatter graphs' },
      { key: 'histograms', name: 'Histograms' },
      { key: 'cumulative_frequency', name: 'Cumulative frequency' },
      { key: 'box_plots', name: 'Box plots' },
      { key: 'two_way_tables', name: 'Two-way tables' }
    ]
  }
};

export const TOPIC_CONFIG = {
  number: { name: 'Number', color: '#3b82f6' },
  algebra: { name: 'Algebra', color: '#8b5cf6' },
  ratio: { name: 'Ratio & Proportion', color: '#10b981' },
  geometry: { name: 'Geometry & Measures', color: '#f59e0b' },
  probability: { name: 'Probability', color: '#ef4444' },
  statistics: { name: 'Statistics', color: '#06b6d4' }
};

// Get all subtopic keys for accurate calculations
export const getAllSubtopicKeys = (): string[] => {
  const keys: string[] = [];
  Object.entries(TOPIC_SUBTOPICS).forEach(([topicKey, topic]) => {
    topic.subtopics.forEach(subtopic => {
      keys.push(`${topicKey}|${subtopic.key}`);
    });
  });
  return keys;
};

// Get subtopic keys for a specific topic
export const getTopicSubtopicKeys = (topicKey: string): string[] => {
  const topic = TOPIC_SUBTOPICS[topicKey as keyof typeof TOPIC_SUBTOPICS];
  if (!topic) return [];
  return topic.subtopics.map(subtopic => `${topicKey}|${subtopic.key}`);
};