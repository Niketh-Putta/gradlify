// Mapping between UI topic.subtopic keys and database subtopic UUIDs  
// Based on actual database structure
export const SUBTOPIC_UUID_MAP: Record<string, string> = {
  // Number
  'number.integers': '52875ee7-5ef8-4da5-8e12-2a029cebe2f4',
  'number.decimals': '4301a4c8-fea0-41b6-b1a2-444b246e53e7', 
  'number.fractions': '4301a4c8-fea0-41b6-b1a2-444b246e53e7',
  'number.percentages': '4301a4c8-fea0-41b6-b1a2-444b246e53e7', 
  'number.powers': '7c1bdee1-098b-49e3-9a6e-465fb31ba05e',

  // Algebra  
  'algebra.expressions': 'cf0e1218-20a0-460d-a7cd-cf518c3b3547',
  'algebra.equations': '14a8f343-380b-49a3-a470-23e1ff06c8cf',
  'algebra.sequences': '881d0c3c-4a22-419f-8699-a5a28767de9a',
  'algebra.graphs': '1b295aa3-f44f-48bd-a625-93b558401933',
  'algebra.quadratics': 'ff18ee07-fc91-404e-84b2-ea93ba2aa90a',

  // Ratio & Proportion (maps to actual ratio topic in DB)
  'ratio.ratio': '237f233c-ed42-4515-8152-0885c04ce213',
  'ratio.proportion': '3e810d4c-43ea-40ba-9c35-33993b4192bd',
  'ratio.percentage_change': '83f0cc83-04ea-4d03-b91b-24f47d6dc9be',
  'ratio.compound_interest': '83f0cc83-04ea-4d03-b91b-24f47d6dc9be',

  // Geometry & Measures
  'geometry.shapes': 'a0e02eb3-3878-451c-8283-e15fbf5bb173',
  'geometry.area_volume': '5be7393b-463d-4a38-ad4e-0242e544dd42',
  'geometry.angles': 'bb5ec3b6-05da-4a04-9be3-533bb3e2748d',
  'geometry.trigonometry': '1fa40c7b-5a05-4273-863a-35afe5c80e71',
  'geometry.pythagoras': '440909cd-4722-431e-8b90-f746ac6c649e',

  // Probability
  'probability.basic': '6e4c3ddf-411e-4042-86b4-7253331f10e6',
  'probability.combined': 'ec8e660f-2450-4a10-b0b3-d6e567351e95',
  'probability.tree_diagrams': 'c0aa3a2a-0e57-4c91-8934-cdee971e3eb3',
  'probability.conditional': 'b268fb40-25e6-44ae-b428-ba98ebc1a862',

  // Statistics  
  'statistics.data': '9365db1f-5cd8-4da0-ae6b-39f8b52c8ca1',
  'statistics.averages': '96dac19a-82b1-435d-8692-10dbacb6eaa5',
  'statistics.charts': 'c5eec0a9-7ae1-4033-9bed-ab6631e6ae11',
  'statistics.correlation': 'c5eec0a9-7ae1-4033-9bed-ab6631e6ae11'
};

// Reverse mapping for converting UUIDs back to UI keys
export const UUID_SUBTOPIC_MAP: Record<string, string[]> = {};
Object.entries(SUBTOPIC_UUID_MAP).forEach(([key, uuid]) => {
  if (!UUID_SUBTOPIC_MAP[uuid]) {
    UUID_SUBTOPIC_MAP[uuid] = [];
  }
  UUID_SUBTOPIC_MAP[uuid].push(key);
});

export function getSubtopicUUID(topicKey: string, subtopicKey: string): string | null {
  return SUBTOPIC_UUID_MAP[`${topicKey}.${subtopicKey}`] || null;
}

export function getSubtopicKeys(uuid: string): string[] {
  return UUID_SUBTOPIC_MAP[uuid] || [];
}