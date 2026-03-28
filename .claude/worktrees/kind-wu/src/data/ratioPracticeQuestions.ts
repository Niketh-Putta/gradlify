export type PracticeQA = { question: string; answer: string };

export const ratioPracticeQuestions: Record<string, PracticeQA[]> = {
  ratios: [
    {
      question:
        "Simplify the ratio 84 : 126. Give your answer in the form a:b.",
      answer:
        "HCF(84,126) = 42 → 84 ÷ 42 : 126 ÷ 42 = **2 : 3**.",
    },
    {
      question:
        "A paint is mixed red:blue in the ratio 5:2. If 350 ml of red paint is used, how much blue paint is needed?",
      answer:
        "5 parts = 350 ml → 1 part = 350 ÷ 5 = 70 ml → blue is 2 parts = 2×70 = **140 ml**.",
    },
    {
      question:
        "Convert 2.4 m : 90 cm into its simplest ratio.",
      answer:
        "Convert to same units: 2.4 m = 240 cm. Ratio = 240 : 90. Divide by 30 → **8 : 3**.",
    },
    {
      question:
        "In a class, the ratio of boys to girls is 3:5. The number of girls is 16 more than the number of boys. How many students are in the class?",
      answer:
        "Difference in parts = 5−3 = 2 parts. 2 parts = 16 → 1 part = 8. Total parts = 8 → total students = 8×8 = **64** (boys 24, girls 40).",
    },
    {
      question:
        "The ratio of boys to girls is 3:5. If the class has 40 students, how many are girls?",
      answer:
        "Total parts = 3+5=8. 1 part = 40 ÷ 8 = 5. Girls = 5 parts = 5×5 = **25**.",
    },
  ],

  "ratio-proportion": [
    {
      question:
        "Share £180 in the ratio 2:7:1.",
      answer:
        "Total parts = 2+7+1 = 10 → 1 part = 180 ÷ 10 = 18 → shares: **£36, £126, £18**.",
    },
    {
      question:
        "Alex and Priya share some money in the ratio 4:3. Priya gets £51. How much money is shared altogether?",
      answer:
        "Priya is 3 parts = £51 → 1 part = 51 ÷ 3 = 17 → total parts = 7 → total = 7×17 = **£119**.",
    },
    {
      question:
        "A recipe uses flour:sugar in the ratio 5:2. You have 260 g of flour. How much sugar is needed?",
      answer:
        "5 parts = 260 g → 1 part = 52 g → sugar is 2 parts = 2×52 = **104 g**.",
    },
    {
      question:
        "Divide 96 in the ratio 7:1. Then find the difference between the two shares.",
      answer:
        "Total parts = 8 → 1 part = 96 ÷ 8 = 12 → shares: 7×12 = 84 and 1×12 = 12 → difference = 84−12 = **72**.",
    },
    {
      question:
        "A total is shared in the ratio 3:2. The larger share is £84. Find the total.",
      answer:
        "Larger share = 3 parts = £84 → 1 part = 28 → total parts = 5 → total = 5×28 = **£140**.",
    },
  ],

  "direct-inverse-proportion": [
    {
      question:
        "y is directly proportional to x. When x = 6, y = 15. Find y when x = 10.",
      answer:
        "y = kx. 15 = 6k → k = 15/6 = 2.5. When x = 10: y = 2.5×10 = **25**.",
    },
    {
      question:
        "y is directly proportional to x². When x = 3, y = 27. Find y when x = 5.",
      answer:
        "y = kx². 27 = k×9 → k = 3. Then y = 3×25 = **75**.",
    },
    {
      question:
        "y is inversely proportional to x. When x = 4, y = 18. Find y when x = 12.",
      answer:
        "y = k/x. 18 = k/4 → k = 72. When x = 12: y = 72/12 = **6**.",
    },
    {
      question:
        "y is inversely proportional to x. When x = 2.5, y = 40. Find x when y = 25.",
      answer:
        "xy = k. k = 2.5×40 = 100. If y = 25, then x = 100/25 = **4**.",
    },
    {
      question:
        "A quantity y is directly proportional to x. When x increases by 30%, what percentage change happens to y?",
      answer:
        "Direct proportion means y changes by the same factor. Increase by 30% means ×1.30, so y also **increases by 30%**.",
    },
    {
      question:
        "A quantity y is inversely proportional to x. When x doubles, what happens to y?",
      answer:
        "Inverse proportion means y is multiplied by the reciprocal factor. If x ×2, then y is **halved (×1/2)**.",
    },
  ],

  "speed-distance-time": [
    {
      question:
        "A car travels 156 km in 2 hours 24 minutes. Find its average speed in km/h.",
      answer:
        "Time = 2 h 24 min = 2 + 24/60 = 2.4 h. Speed = 156 ÷ 2.4 = **65 km/h**.",
    },
    {
      question:
        "A runner’s speed is 4.8 m/s. How far do they run in 7 minutes 30 seconds?",
      answer:
        "Time = 7 min 30 s = 450 s. Distance = speed×time = 4.8×450 = **2160 m** ( = 2.16 km ).",
    },
    {
      question:
        "A train travels 90 miles at an average speed of 60 mph. How long does it take?",
      answer:
        "Time = distance ÷ speed = 90 ÷ 60 = 1.5 hours = **1 h 30 min**.",
    },
    {
      question:
        "A cyclist rides 18 km at 12 km/h, then 12 km at 8 km/h. Find the cyclist’s average speed for the whole journey.",
      answer:
        "Total distance = 30 km. Time = 18/12 + 12/8 = 1.5 + 1.5 = 3 hours. Average speed = 30 ÷ 3 = **10 km/h**.",
    },
    {
      question:
        "Convert 72 km/h to m/s.",
      answer:
        "72 km/h = 72,000 m / 3600 s = 20 m/s → **20 m/s**.",
    },
  ],

  "density-mass-volume": [
    {
      question:
        "A metal block has mass 540 g and volume 200 cm³. Find its density.",
      answer:
        "Density = mass ÷ volume = 540 ÷ 200 = **2.7 g/cm³**.",
    },
    {
      question:
        "A liquid has density 0.8 g/cm³. Find the mass of 350 cm³ of the liquid.",
      answer:
        "Mass = density×volume = 0.8×350 = **280 g**.",
    },
    {
      question:
        "A solid has density 3.2 g/cm³ and mass 640 g. Find its volume.",
      answer:
        "Volume = mass ÷ density = 640 ÷ 3.2 = **200 cm³**.",
    },
    {
      question:
        "A material has density 1200 kg/m³. Find its density in g/cm³.",
      answer:
        "1 g/cm³ = 1000 kg/m³. So 1200 kg/m³ = 1200/1000 = **1.2 g/cm³**.",
    },
    {
      question:
        "A cube has side length 5 cm and mass 625 g. Find its density.",
      answer:
        "Volume = 5³ = 125 cm³. Density = 625 ÷ 125 = **5 g/cm³**.",
    },
  ],

  pressure: [
    {
      question:
        "A force of 360 N acts on an area of 0.12 m². Find the pressure.",
      answer:
        "Pressure = force ÷ area = 360 ÷ 0.12 = **3000 N/m² (Pa)**.",
    },
    {
      question:
        "A pressure of 2500 Pa acts on an area of 0.8 m². Find the force.",
      answer:
        "Force = pressure×area = 2500×0.8 = **2000 N**.",
    },
    {
      question:
        "A force of 90 N acts on an area of 30 cm². Find the pressure in Pa.",
      answer:
        "Convert area: 30 cm² = 30/10,000 = 0.003 m². Pressure = 90 ÷ 0.003 = **30,000 Pa**.",
    },
    {
      question:
        "Why do snowshoes help someone walk on snow? (One sentence using the formula.)",
      answer:
        "They increase the area, so for the same force the pressure **decreases** (P = F/A), making you sink less.",
    },
  ],

  "growth-decay": [
    {
      question:
        "A phone costs £480 and is reduced by 12%. Find the sale price.",
      answer:
        "Multiplier = 1 − 0.12 = 0.88. Sale price = 480×0.88 = **£422.40**.",
    },
    {
      question:
        "A population of bacteria is 18,000 and increases by 7% each hour. Find the population after 3 hours.",
      answer:
        "Multiplier = 1.07. After 3 hours: 18,000×1.07³ ≈ 18,000×1.225043 = **22,050.8** ≈ **22,051**.",
    },
    {
      question:
        "A car value is £9,500 and depreciates by 18% each year. Find the value after 2 years.",
      answer:
        "Multiplier = 0.82. Value = 9500×0.82² = 9500×0.6724 = **£6,387.80**.",
    },
    {
      question:
        "A price increases from £80 to £92. Find the percentage increase.",
      answer:
        "Increase = 92−80 = 12. Percentage increase = 12/80 = 0.15 = **15%**.",
    },
    {
      question:
        "An investment grows by 4% then falls by 4%. Is the final amount the same as the start? Explain briefly.",
      answer:
        "No. Multipliers: ×1.04 then ×0.96 gives ×(1.04×0.96)=×0.9984, so it’s **0.16% lower** than the start.",
    },
  ],

  "unit-conversions": [
    {
      question:
        "Convert 0.75 litres to cm³.",
      answer:
        "1 litre = 1000 cm³. So 0.75 L = 0.75×1000 = **750 cm³**.",
    },
    {
      question:
        "Convert 3.6 km to metres.",
      answer: "3.6×1000 = **3600 m**.",
    },
    {
      question:
        "Convert 2500 cm² to m².",
      answer:
        "1 m² = 10,000 cm². So 2500 cm² = 2500/10,000 = **0.25 m²**.",
    },
    {
      question:
        "A cuboid has volume 2.5 m³. Convert this to cm³.",
      answer:
        "1 m = 100 cm so 1 m³ = 100³ = 1,000,000 cm³. Therefore 2.5 m³ = 2.5×1,000,000 = **2,500,000 cm³**.",
    },
    {
      question:
        "Convert 1 hour 18 minutes to seconds.",
      answer:
        "1 h = 3600 s; 18 min = 18×60 = 1080 s; total = **4680 s**.",
    },
  ],

  "best-buys": [
    {
      question:
        "Pack A: 600 g for £3.30. Pack B: 750 g for £3.90. Which is better value?",
      answer:
        "Unit price per 100 g: A = 3.30/6 = **£0.55**, B = 3.90/7.5 = **£0.52**. Pack **B** is better value.",
    },
    {
      question:
        "A 1.5 L bottle costs £2.10. A 500 ml bottle costs £0.78. Which is better value per litre?",
      answer:
        "Per litre: 1.5 L bottle = 2.10/1.5 = **£1.40/L**. 500 ml = 0.5 L so 0.78/0.5 = **£1.56/L**. Better value: **1.5 L bottle**.",
    },
    {
      question:
        "A shop offers: 3 for £5.40 or £1.95 each. Which is cheaper per item, and by how much?",
      answer:
        "3 for £5.40 → per item = 5.40/3 = **£1.80**. Single = £1.95. Difference = 1.95−1.80 = **£0.15** per item.",
    },
    {
      question:
        "Option A gives 20% extra free (same price). What is the new unit price factor compared to the original?",
      answer:
        "Quantity factor is ×1.2, price unchanged. Unit price factor = 1/1.2 = **0.833…** so it’s **16.7% cheaper** per unit.",
    },
  ],

  "exchange-rates": [
    {
      question:
        "The exchange rate is £1 = €1.18. How many euros do you get for £325?",
      answer: "€ = £×rate = 325×1.18 = **€383.50**.",
    },
    {
      question:
        "The exchange rate is £1 = $1.25. How many pounds is $460?",
      answer: "£ = $ ÷ rate = 460 ÷ 1.25 = **£368**.",
    },
    {
      question:
        "£1 = €1.20. A bureau charges a 3% commission on the pounds you exchange. If you exchange £200, how many euros do you receive?",
      answer:
        "Commission means you effectively exchange 97% of £200: 200×0.97 = £194. Euros = 194×1.20 = **€232.80**.",
    },
    {
      question:
        "£1 = €1.16. You have €580. The bureau charges €6 fixed fee. How many pounds do you receive?",
      answer:
        "First subtract the fee: 580−6 = €574. Convert to pounds: 574 ÷ 1.16 = **£494.83** (to 2 d.p.).",
    },
  ],
};
