export type PracticeQA = { question: string; answer: string };

export const statisticsPracticeQuestions: Record<string, PracticeQA[]> = {
  "mean-median-mode-range": [
    {
      question: "Find the mean of 4, 6, 7, 7, 9, 10.",
      answer: "Total = 43, n = 6 → mean = 43 ÷ 6 = **7.17** (to 2 d.p.).",
    },
    {
      question: "Find the median of 2, 6, 9, 12, 15, 18.",
      answer: "n = 6 (even) → median = (3rd + 4th) ÷ 2 = (9 + 12) ÷ 2 = **10.5**.",
    },
    {
      question:
        "For the data 3, 4, 4, 5, 50, find the mean and the median; which is a better typical value and why?",
      answer:
        "Mean = (3 + 4 + 4 + 5 + 50) ÷ 5 = 66 ÷ 5 = **13.2**\n\nMedian = **4**\n\nMedian is better because **50 is an outlier** and pulls the mean up.",
    },
    {
      question:
        "A data set is bimodal with modes 6 and 9. What does this tell you about the data?",
      answer:
        "It has **two most common values** (6 and 9). This can happen when the data comes from two different ‘groups’.",
    },
    {
      question:
        "A test has scores with minimum 12 and maximum 19. Find the range and state one limitation of range.",
      answer:
        "Range = 19 − 12 = **7**\n\nLimitation: it uses only min and max, so **an outlier can make it misleading**.",
    },
  ],

  "frequency-tables": [
    {
      question:
        "A grouped table has classes 0-10 (f=3), 10-20 (f=5), 20-30 (f=2). Find the midpoints and the estimated mean.",
      answer:
        "Midpoints: 5, 15, 25\n\nsum(f) = 3 + 5 + 2 = 10\n\nsum(fx) = 3×5 + 5×15 + 2×25 = 15 + 75 + 50 = 140\n\nEstimated mean = 140 ÷ 10 = **14**",
    },
    {
      question:
        "A grouped table has sum(f) = 50 and sum(fx) = 1400. Find the estimated mean.",
      answer: "Estimated mean = 1400 ÷ 50 = **28**.",
    },
    {
      question:
        "The cumulative frequencies are 4, 11, 18, 25 (so n = 25). Which class is the median class?",
      answer:
        "Median position is n ÷ 2 = 25 ÷ 2 = 12.5.\n\nThe median class is where CF first reaches/passes 12.5 → the class that takes CF from **11 to 18**.",
    },
    {
      question:
        "A frequency table has values 2, 3, 4 with frequencies 5, 2, 5. Find the mode and the median.",
      answer:
        "Mode: **2 and 4** (both have frequency 5).\n\nTotal n = 12 → median is the average of the 6th and 7th values.\n\nPositions 1-5 are 2s, positions 6-7 are 3s → median = **3**.",
    },
    {
      question:
        "Explain in one sentence why the mean from grouped data is an estimate.",
      answer:
        "Because you don’t know the exact values inside each class, so you **assume** values are spread evenly and use midpoints.",
    },
  ],

  "box-plots-cumulative-frequency": [
    {
      question:
        "A data set has min 12, Q1 18, median 25, Q3 32, max 45. Find the range and the IQR.",
      answer: "Range = 45 − 12 = **33**\n\nIQR = 32 − 18 = **14**",
    },
    {
      question:
        "For n = 80, what cumulative frequencies give Q1, the median and Q3 on a cumulative frequency graph?",
      answer:
        "Q1: n ÷ 4 = 80 ÷ 4 = **20**\n\nMedian: n ÷ 2 = 80 ÷ 2 = **40**\n\nQ3: 3n ÷ 4 = 3×80 ÷ 4 = **60**",
    },
    {
      question:
        "Two box plots have medians 50 and 46. Their IQRs are 12 and 20. Compare the distributions.",
      answer:
        "Centre: the first has the higher typical value (median 50 > 46).\n\nSpread: the first is more consistent (IQR 12 < 20).",
    },
    {
      question:
        "On a cumulative frequency graph with n = 60, what cumulative frequency should you use to read Q3?",
      answer: "Q3 is at 3n ÷ 4 = 3×60 ÷ 4 = **45**.",
    },
    {
      question:
        "State one reason why median and IQR are often preferred when there are outliers.",
      answer:
        "They are **less affected by extreme values**, so they better represent the typical centre/spread.",
    },
  ],

  histograms: [
    {
      question:
        "A class interval 10-30 has frequency 40. Find the frequency density.",
      answer: "Class width = 20 → density = 40 ÷ 20 = **2**.",
    },
    {
      question:
        "A histogram bar has class width 8 and frequency density 2.5. Find the frequency for that class.",
      answer: "Frequency = area = width × height = 8 × 2.5 = **20**.",
    },
    {
      question:
        "Two classes have: A width 10, density 3; B width 5, density 4. Which class has the larger frequency?",
      answer:
        "Compare areas: A frequency = 10×3 = 30; B frequency = 5×4 = 20 → **A** has the larger frequency.",
    },
    {
      question:
        "Frequency density is 3 and class width is 5. Find the frequency.",
      answer: "Frequency = 3 × 5 = **15**.",
    },
    {
      question:
        "Explain in one sentence why you can’t compare bars by height if class widths are different.",
      answer:
        "Because frequency is shown by **area**, so a narrower class can be taller without having the bigger frequency.",
    },
  ],

  "scatter-graphs": [
    {
      question:
        "Shoe size vs height: what type of correlation is likely, and why?",
      answer:
        "Likely **positive correlation**: generally, taller people tend to have larger shoe sizes.",
    },
    {
      question:
        "Does correlation prove causation? Give a one-sentence explanation.",
      answer:
        "No - it shows a relationship, but a **third factor** could affect both variables.",
    },
    {
      question:
        "You predict y when x = 8, but the largest x-value on the graph is 6. Is this interpolation or extrapolation?",
      answer: "**Extrapolation** (beyond the data range).",
    },
    {
      question:
        "A scatter graph shows a weak positive correlation. What does “weak” mean?",
      answer:
        "The points are **quite spread out**, so the trend exists but doesn’t fit closely to a straight line.",
    },
    {
      question:
        "One point is far from the others (an outlier). Give one sensible reason you might not include it when drawing a line of best fit.",
      answer:
        "It may be a measurement/recording error or an unusual case; including it could **distort** the overall trend.",
    },
  ],

  "pie-charts": [
    {
      question: "25% choose blue. What is the angle?",
      answer: "0.25 × 360 = **90°**",
    },
    {
      question:
        "A sector is 72° from a survey of 200. How many responses is that?",
      answer: "(72 ÷ 360) × 200 = (1 ÷ 5) × 200 = **40**",
    },
    {
      question:
        "A survey has total 60. One sector is 150°. How many people chose that option?",
      answer: "Frequency = (150 ÷ 360) × 60 = (5 ÷ 12) × 60 = **25**",
    },
    {
      question:
        "A pie chart has sector angles 120°, 90° and 90°. What fraction of the data is in the 120° sector?",
      answer: "Fraction = 120 ÷ 360 = **1/3**",
    },
    {
      question:
        "After calculating angles, what total should you check for, and why?",
      answer:
        "Check the angles add to **360°** because that confirms you used the correct total frequency.",
    },
  ],

  "comparing-distributions": [
    {
      question:
        "Two groups have medians 18 and 21. Their IQRs are 6 and 10. Which group has the higher typical value, and which is more consistent?",
      answer:
        "Higher typical value: median **21**.\n\nMore consistent: IQR **6** (smaller spread).",
    },
    {
      question:
        "A data set has an extreme outlier. Which is usually better to compare centre: mean or median?",
      answer: "**Median**, because it is less affected by outliers.",
    },
    {
      question:
        "In one sentence, what does a smaller IQR tell you?",
      answer:
        "The middle 50% of values are closer together, so the results are **more consistent**.",
    },
    {
      question:
        "Group A has mean 45 and range 20; Group B has mean 42 and range 35. Write a two-sentence comparison.",
      answer:
        "Centre: A has the higher typical score (mean 45 > 42).\n\nSpread: A is more consistent (range 20 < 35).",
    },
  ],

  sampling: [
    {
      question:
        "If there are 150 girls out of 500 students and the total sample size is 60, how many girls should be chosen in a stratified sample?",
      answer: "(150 ÷ 500) × 60 = 0.3 × 60 = **18**",
    },
    {
      question:
        "A sample is chosen by asking people leaving a gym at 6pm. Give one reason this could be biased.",
      answer:
        "It over-represents gym-goers (and people available at 6pm), so it may not represent the whole population.",
    },
    {
      question:
        "Name the sampling method: “Choose every 10th student on an alphabetical list after a random start.”",
      answer: "**Systematic sampling**.",
    },
    {
      question: "Give one advantage of stratified sampling.",
      answer:
        "It keeps the sample proportional across groups, so it is more representative.",
    },
    {
      question:
        "Give one disadvantage of systematic sampling.",
      answer:
        "If there is a hidden pattern in the list, systematic sampling can be biased.",
    },
  ],
};
