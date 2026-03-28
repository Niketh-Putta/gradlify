export type MultipartPartId = 'a' | 'b' | 'c';

export interface MultipartPart {
  partId: MultipartPartId;
  prompt: string;
  expectedAnswer: string;
  solution: string[];
}

export type MultipartEnvironment = 'local-only' | 'production-enabled';

export interface MultipartQuestionLocal {
  id: string;
  tier: 'Foundation' | 'Higher';
  question_type: 'multipart';
  status: 'experimental';
  environment: MultipartEnvironment;
  parts: MultipartPart[];
}

export const multipartQuestionsLocal: MultipartQuestionLocal[] = [
  {
    id: 'mp-foundation-rect-01',
    tier: 'Foundation',
    question_type: 'multipart',
    status: 'experimental',
    environment: 'production-enabled',
    parts: [
      {
        partId: 'a',
        prompt:
          'A rectangle has length 3x + 2 cm and width x + 1 cm. The perimeter is 38 cm. Find x.',
        expectedAnswer: '4',
        solution: [
          'Perimeter = 2(length + width).',
          '2((3x + 2) + (x + 1)) = 38.',
          '2(4x + 3) = 38 → 8x + 6 = 38.',
          '8x = 32 → x = 4.',
        ],
      },
      {
        partId: 'b',
        prompt:
          'Using your value of x from part (a), find the area of the rectangle.',
        expectedAnswer: '70 cm^2',
        solution: [
          'Substitute x = 4 into length and width.',
          'Length = 3(4) + 2 = 14 cm.',
          'Width = 4 + 1 = 5 cm.',
          'Area = 14 × 5 = 70 cm^2.',
        ],
      },
    ],
  },
  {
    id: 'mp-higher-line-02',
    tier: 'Higher',
    question_type: 'multipart',
    status: 'experimental',
    environment: 'production-enabled',
    parts: [
      {
        partId: 'a',
        prompt: 'A line passes through (2, -1) and (8, 11). Find the gradient of the line.',
        expectedAnswer: '2',
        solution: [
          'Gradient = (change in y) ÷ (change in x).',
          '(11 - (-1)) ÷ (8 - 2) = 12 ÷ 6 = 2.',
        ],
      },
      {
        partId: 'b',
        prompt:
          'Use your gradient from part (a) to find the equation of the line in the form y = mx + c.',
        expectedAnswer: 'y = 2x - 5',
        solution: [
          'Use y = mx + c with m = 2.',
          'Substitute (2, -1): -1 = 2(2) + c.',
          'So c = -5 and the equation is y = 2x - 5.',
        ],
      },
      {
        partId: 'c',
        prompt:
          'Using your equation from part (b), find the x-intercept of the line.',
        expectedAnswer: 'x = 2.5',
        solution: [
          'Set y = 0 in y = 2x - 5.',
          '0 = 2x - 5 → 2x = 5 → x = 2.5.',
        ],
      },
    ],
  },
  {
    id: 'mp-foundation-tank-03',
    tier: 'Foundation',
    question_type: 'multipart',
    status: 'experimental',
    environment: 'production-enabled',
    parts: [
      {
        partId: 'a',
        prompt:
          'A tank holds 240 litres of water. It is drained at a constant rate of 8 litres per minute. How long does it take to empty?',
        expectedAnswer: '30 minutes',
        solution: [
          'Time = volume ÷ rate.',
          '240 ÷ 8 = 30.',
        ],
      },
      {
        partId: 'b',
        prompt:
          'Using your time from part (a), how much water is drained in the first 12 minutes?',
        expectedAnswer: '96 litres',
        solution: [
          'Rate = 8 litres per minute.',
          'In 12 minutes, volume drained = 8 × 12 = 96 litres.',
        ],
      },
    ],
  },
];
