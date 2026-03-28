export type PracticeQA = { question: string; answer: string };

export const geometryPracticeQuestions: Record<string, PracticeQA[]> = {
  "angles-parallel-lines": [
    {
      question:
        "Two parallel lines are cut by a transversal. One acute angle is 62°. Find the three other acute angles.",
      answer:
        "Corresponding/alternate angles are equal, so all acute angles are **62°** (there are four acute angles in total).",
    },
    {
      question:
        "Two parallel lines are cut by a transversal. One obtuse angle is 118°. Find the corresponding angle and the adjacent (linear pair) angle.",
      answer:
        "Corresponding angles are equal → corresponding angle = **118°**. Adjacent on a straight line sum to 180° → 180−118 = **62°**.",
    },
    {
      question:
        "In a diagram with parallel lines, an angle is x and its co-interior partner is (3x−20). Find x.",
      answer:
        "Co-interior sum to 180°: x + (3x−20) = 180 → 4x = 200 → **x = 50°**.",
    },
    {
      question:
        "A transversal crosses two parallel lines. An alternate angle is (2y + 15)°. The matching angle is 89°. Find y.",
      answer:
        "Alternate angles are equal: 2y + 15 = 89 → 2y = 74 → **y = 37**.",
    },
    {
      question:
        "A triangle sits between two parallel lines. One angle at the top line is 73° (corresponding). Another triangle angle is 41°. Find the third triangle angle.",
      answer:
        "Angle in triangle: sum 180°. Third = 180 − 73 − 41 = **66°**.",
    },
  ],

  "angles-in-polygons": [
    {
      question:
        "Find the sum of interior angles of a 9-sided polygon.",
      answer:
        "Sum = (n−2)×180 = (9−2)×180 = 7×180 = **1260°**.",
    },
    {
      question:
        "A regular polygon has each exterior angle 24°. How many sides does it have?",
      answer:
        "Regular exterior = 360°/n. So 24 = 360/n → n = 360/24 = **15** sides.",
    },
    {
      question:
        "A regular polygon has each interior angle 156°. Find the number of sides.",
      answer:
        "Interior + exterior = 180°, so exterior = 180−156 = 24°. Then n = 360/24 = **15**.",
    },
    {
      question:
        "The sum of interior angles of a polygon is 1980°. Find the number of sides.",
      answer:
        "(n−2)×180 = 1980 → n−2 = 11 → **n = 13**.",
    },
    {
      question:
        "A regular hexagon: find each interior angle and each exterior angle.",
      answer:
        "Exterior = 360/6 = **60°**. Interior = 180−60 = **120°**.",
    },
  ],

  "pythagoras-theorem": [
    {
      question:
        "A right triangle has legs 7 cm and 24 cm. Find the hypotenuse.",
      answer:
        "c² = 7² + 24² = 49 + 576 = 625 → c = √625 = **25 cm**.",
    },
    {
      question:
        "A right triangle has hypotenuse 13 cm and one leg 5 cm. Find the other leg.",
      answer:
        "a² = 13² − 5² = 169 − 25 = 144 → a = √144 = **12 cm**.",
    },
    {
      question:
        "Does a triangle with sides 9, 40, 41 form a right angle?",
      answer:
        "Check: 9² + 40² = 81 + 1600 = 1681 and 41² = 1681 → **Yes (right-angled)**.",
    },
    {
      question:
        "A rectangle is 8 cm by 15 cm. Find the diagonal length.",
      answer:
        "Diagonal is hypotenuse: √(8²+15²) = √(64+225) = √289 = **17 cm**.",
    },
    {
      question:
        "A ladder is 10 m long and reaches 8 m up a wall. How far is the foot from the wall?",
      answer:
        "10² = 8² + d² → d² = 100 − 64 = 36 → d = **6 m**.",
    },
  ],

  "trigonometry-sohcahtoa": [
    {
      question:
        "In a right triangle, θ = 35° and the adjacent side is 12 cm. Find the hypotenuse.",
      answer:
        "cos θ = adj/hyp → hyp = 12 / cos35° ≈ 12 / 0.819 = **14.7 cm** (3 s.f.).",
    },
    {
      question:
        "In a right triangle, θ = 28° and the hypotenuse is 18 cm. Find the opposite side.",
      answer:
        "sin θ = opp/hyp → opp = 18·sin28° ≈ 18·0.469 = **8.44 cm** (3 s.f.).",
    },
    {
      question:
        "A right triangle has opposite 9 cm and adjacent 12 cm. Find θ.",
      answer:
        "tan θ = opp/adj = 9/12 = 0.75 → θ = tan⁻¹(0.75) ≈ **36.9°**.",
    },
    {
      question:
        "A 5 m ladder makes a 68° angle with the ground. How high up the wall does it reach?",
      answer:
        "Height is opposite: opp = 5·sin68° ≈ 5·0.927 = **4.64 m**.",
    },
    {
      question:
        "A slope rises 3 m for every 8 m horizontally. Find the angle of elevation.",
      answer:
        "tan θ = 3/8 → θ = tan⁻¹(0.375) ≈ **20.6°**.",
    },
  ],

  "sine-cosine-rules": [
    {
      question:
        "In triangle ABC, a = 9, b = 12, and A = 35°. Find angle B (use sine rule).",
      answer:
        "Sine rule: a/sinA = b/sinB → sinB = (b·sinA)/a = 12·sin35°/9 ≈ 0.765 → B ≈ **49.9°** (take the acute solution if the diagram shows it).",
    },
    {
      question:
        "In triangle ABC, A = 48°, B = 67°, and a = 11 cm. Find side b.",
      answer:
        "Sine rule: b/sinB = a/sinA → b = a·sinB/sinA = 11·sin67°/sin48° ≈ **13.6 cm** (3 s.f.).",
    },
    {
      question:
        "A triangle has sides b = 8, c = 13 and included angle A = 52°. Find side a.",
      answer:
        "Cosine rule: a² = b² + c² − 2bc cosA = 8² + 13² − 2·8·13·cos52° ≈ 64 + 169 − 208·0.616 = 104.9 → a ≈ **10.2**.",
    },
    {
      question:
        "A triangle has sides a = 7, b = 10, c = 13. Find angle A.",
      answer:
        "Rearrange cosine rule: cosA = (b² + c² − a²)/(2bc) = (100 + 169 − 49)/(2·10·13) = 220/260 = 0.846 → A ≈ **32.2°**.",
    },
    {
      question:
        "Explain when cosine rule is the correct choice.",
      answer:
        "Use cosine rule when you have **SSS** (3 sides) to find an angle, or **SAS** (2 sides + included angle) to find the opposite side.",
    },
  ],

  "area-perimeter": [
    {
      question:
        "A rectangle is 6 cm by 4 cm. Find its area and perimeter.",
      answer:
        "Area = 6×4 = **24 cm²**. Perimeter = 2(6+4) = **20 cm**.",
    },
    {
      question:
        "A triangle has base 14 cm and height 9 cm. Find its area.",
      answer:
        "Area = ½×b×h = ½×14×9 = **63 cm²**.",
    },
    {
      question:
        "A circle has diameter 12 cm. Find the circumference and area (exact form).",
      answer:
        "Radius r = 6. Circumference = 2πr = **12π cm**. Area = πr² = **36π cm²**.",
    },
    {
      question:
        "A trapezium has parallel sides 8 cm and 14 cm, height 5 cm. Find its area.",
      answer:
        "Area = ½(a+b)h = ½(8+14)·5 = 11·5 = **55 cm²**.",
    },
    {
      question:
        "A rectangle has perimeter 54 cm and length 17 cm. Find the width.",
      answer:
        "2(l+w)=54 → l+w=27 → w=27−17= **10 cm**.",
    },
  ],

  "volume-surface-area": [
    {
      question:
        "A cuboid is 8 cm by 5 cm by 3 cm. Find its volume.",
      answer:
        "V = lwh = 8×5×3 = **120 cm³**.",
    },
    {
      question:
        "A cuboid is 8 cm by 5 cm by 3 cm. Find its surface area.",
      answer:
        "SA = 2(lw+lh+wh) = 2(40+24+15)=2×79= **158 cm²**.",
    },
    {
      question:
        "A cylinder has radius 4 cm and height 11 cm. Find its volume (3 s.f.).",
      answer:
        "V = πr²h = π·16·11 = 176π ≈ **553 cm³**.",
    },
    {
      question:
        "A cylinder has radius 4 cm and height 11 cm. Find its total surface area (3 s.f.).",
      answer:
        "SA = 2πr² + 2πrh = 2π·16 + 2π·4·11 = 32π + 88π = 120π ≈ **377 cm²**.",
    },
    {
      question:
        "A sphere has radius 6 cm. Find its surface area (exact form).",
      answer:
        "SA = 4πr² = 4π·36 = **144π cm²**.",
    },
  ],

  "circle-theorems": [
    {
      question:
        "Angle at the centre is 94°. Find the angle at the circumference standing on the same arc.",
      answer:
        "Centre angle is double: circumference angle = 94÷2 = **47°**.",
    },
    {
      question:
        "Find the angle in a semicircle.",
      answer:
        "Angle in a semicircle is always **90°**.",
    },
    {
      question:
        "In a cyclic quadrilateral, one angle is 112°. Find the opposite angle.",
      answer:
        "Opposite angles in a cyclic quadrilateral sum to 180° → 180−112 = **68°**.",
    },
    {
      question:
        "A tangent touches a circle at T. OT is a radius. What is ∠(OT, tangent)?",
      answer:
        "Tangent is perpendicular to radius at the point of contact → **90°**.",
    },
    {
      question:
        "Angles in the same segment are equal. What does “same segment” mean?",
      answer:
        "Angles at the circumference subtended by the **same chord/arc** are equal.",
    },
  ],

  transformations: [
    {
      question:
        "A point (3, −2) is translated by the vector (−5, 4). Find the image.",
      answer:
        "Add components: (3−5, −2+4) = **(−2, 2)**.",
    },
    {
      question:
        "Describe fully a rotation of 90° clockwise about the origin.",
      answer:
        "You must give **centre**, **angle**, **direction**: rotation **90° clockwise about (0,0)**.",
    },
    {
      question:
        "A shape is reflected in the line x = 2. What stays the same?",
      answer:
        "The mirror line is the perpendicular bisector between each point and its image; **distances and angles are preserved**.",
    },
    {
      question:
        "A point (4, 1) is enlarged about the origin with scale factor 3. Find the image.",
      answer:
        "Multiply coordinates by 3: **(12, 3)**.",
    },
    {
      question:
        "What information is required to describe an enlargement fully?",
      answer:
        "You must state the **centre of enlargement** and the **scale factor**.",
    },
  ],

  "similar-shapes": [
    {
      question:
        "Two similar triangles have corresponding sides 6 cm and 15 cm. Find the linear scale factor from small to large.",
      answer:
        "k = 15/6 = **2.5**.",
    },
    {
      question:
        "Linear scale factor is 3. A small area is 18 cm². Find the large area.",
      answer:
        "Area scales by k²: 18×3² = 18×9 = **162 cm²**.",
    },
    {
      question:
        "Linear scale factor is 1/2. A large volume is 96 cm³. Find the small volume.",
      answer:
        "Volume scales by k³: small = 96×(1/2)³ = 96×1/8 = **12 cm³**.",
    },
    {
      question:
        "Two similar shapes have areas 50 cm² and 200 cm². Find the linear scale factor from smaller to larger.",
      answer:
        "Area factor = 200/50 = 4. Linear factor k = √4 = **2**.",
    },
    {
      question:
        "Two similar shapes have volumes 27 cm³ and 216 cm³. Find the linear scale factor from smaller to larger.",
      answer:
        "Volume factor = 216/27 = 8. Linear factor k = ³√8 = **2**.",
    },
  ],

  bearings: [
    {
      question:
        "Write the bearing of East.",
      answer:
        "Bearings are clockwise from North: East is **090°**.",
    },
    {
      question:
        "The bearing of B from A is 073°. Find the bearing of A from B.",
      answer:
        "Back bearing differs by 180°: 073 + 180 = **253°**.",
    },
    {
      question:
        "A boat travels on a bearing of 140°. Which quadrant is this direction in?",
      answer:
        "Between 090° and 180° → **south-east** quadrant.",
    },
    {
      question:
        "A bearing is written as 5°. Explain the correction.",
      answer:
        "Bearings must be three figures: **005°**.",
    },
    {
      question:
        "A person walks 3 km due East then 4 km due North. Find the bearing of their final position from the start.",
      answer:
        "Angle east of north: tan θ = 3/4 → θ ≈ 36.9°. Bearing = 360 − 36.9? Careful: measured clockwise from North towards East → **036.9° ≈ 037°**.",
    },
  ],

  vectors: [
    {
      question:
        "Compute (3, −5) + (−7, 2).",
      answer:
        "Add components: (3−7, −5+2) = **(−4, −3)**.",
    },
    {
      question:
        "Compute 4×(2, −1).",
      answer:
        "Scalar multiply: (8, −4) → **(8, −4)**.",
    },
    {
      question:
        "A vector v = (6, 8). Find its magnitude.",
      answer:
        "|v| = √(6²+8²) = √(36+64) = √100 = **10**.",
    },
    {
      question:
        "If A = (2, 3) and B = (9, 1), find vector AB.",
      answer:
        "AB = B − A = (9−2, 1−3) = **(7, −2)**.",
    },
    {
      question:
        "A midpoint M of AB where A=(1,4) and B=(7,−2). Find M.",
      answer:
        "Midpoint = ((1+7)/2, (4+−2)/2) = (4, 1) → **(4, 1)**.",
    },
  ],

  "congruent-shapes": [
    {
      question:
        "Name the congruence test for: three sides match.",
      answer:
        "That is **SSS**.",
    },
    {
      question:
        "Name the congruence test for: two sides and the included angle match.",
      answer:
        "That is **SAS**.",
    },
    {
      question:
        "Two right triangles have equal hypotenuse and one equal shorter side. What test is this?",
      answer:
        "Right angle + hypotenuse + side → **RHS**.",
    },
    {
      question:
        "Explain the difference between congruent and similar.",
      answer:
        "Congruent: **same size and shape**. Similar: **same shape**, possibly different sizes (scale factor).",
    },
    {
      question:
        "Triangles ABC and DEF are congruent. If ∠A = 52°, what is ∠D?",
      answer:
        "Corresponding angles are equal in congruent triangles → **∠D = 52°**.",
    },
  ],

  "constructions-loci": [
    {
      question:
        "Describe the locus of points 4 cm from a point P.",
      answer:
        "A **circle** with centre P and radius 4 cm.",
    },
    {
      question:
        "Describe the locus of points equidistant from points A and B.",
      answer:
        "The **perpendicular bisector** of AB.",
    },
    {
      question:
        "Describe the locus of points equidistant from two intersecting lines.",
      answer:
        "The **angle bisectors** of the two lines (two bisectors).",
    },
    {
      question:
        "Why should construction arcs be left visible?",
      answer:
        "Because examiners award method marks for correct construction steps; arcs show you used compasses.",
    },
    {
      question:
        "What tools are allowed for standard constructions?",
      answer:
        "A **ruler (straightedge)** and **compasses** only.",
    },
  ],

  "arc-sector-segment": [
    {
      question:
        "Find the arc length of a sector with radius 10 cm and angle 72°.",
      answer:
        "Arc = (θ/360)·2πr = (72/360)·2π·10 = (1/5)·20π = **4π cm ≈ 12.6 cm**.",
    },
    {
      question:
        "Find the area of a sector with radius 6 cm and angle 150° (exact form).",
      answer:
        "Area = (150/360)·π·6² = (5/12)·36π = **15π cm²**.",
    },
    {
      question:
        "A sector has area 40π cm² and radius 10 cm. Find θ.",
      answer:
        "40π = (θ/360)·π·100 → 40 = (θ/360)·100 → θ = 40·360/100 = **144°**.",
    },
    {
      question:
        "Explain how to find the area of a segment.",
      answer:
        "Segment area = **sector area − triangle area** (the triangle formed by the two radii and the chord).",
    },
    {
      question:
        "A sector has radius 8 cm and angle 90°. Find its area (3 s.f.).",
      answer:
        "Area = (90/360)·π·8² = (1/4)·64π = 16π ≈ **50.3 cm²**.",
    },
  ],

  "angles-triangles-quadrilaterals": [
    {
      question:
        "Angles in a triangle are (x+20)°, (2x−10)°, and 70°. Find x.",
      answer:
        "Sum to 180: (x+20) + (2x−10) + 70 = 180 → 3x + 80 = 180 → **x = 100/3 ≈ 33.3**.",
    },
    {
      question:
        "In an isosceles triangle, the equal angles are 48° each. Find the third angle.",
      answer:
        "Third = 180 − 48 − 48 = **84°**.",
    },
    {
      question:
        "A quadrilateral has angles 92°, 101°, 88° and x°. Find x.",
      answer:
        "Sum is 360: x = 360 − (92+101+88) = 360 − 281 = **79°**.",
    },
    {
      question:
        "Exterior angle of a triangle at a vertex is 133°. The two remote interior angles are 58° and x°. Find x.",
      answer:
        "Exterior angle equals sum of two remote interior angles: 133 = 58 + x → **x = 75°**.",
    },
    {
      question:
        "In an equilateral triangle, find each angle.",
      answer:
        "All equal and sum to 180 → each = **60°**.",
    },
  ],

  "prisms-cylinders": [
    {
      question:
        "A prism has cross-sectional area 18 cm² and length 11 cm. Find the volume.",
      answer:
        "V = area × length = 18×11 = **198 cm³**.",
    },
    {
      question:
        "A triangular prism has a cross-section with base 10 cm and height 6 cm. The prism length is 12 cm. Find the volume.",
      answer:
        "Cross-section area = ½×10×6 = 30 cm². Volume = 30×12 = **360 cm³**.",
    },
    {
      question:
        "A cylinder has radius 3.5 cm and height 9 cm. Find its volume (3 s.f.).",
      answer:
        "V = πr²h = π·(3.5²)·9 = π·12.25·9 = 110.25π ≈ **346 cm³**.",
    },
    {
      question:
        "A cylinder has radius 5 cm and height 10 cm. Find the curved surface area (exact form).",
      answer:
        "Curved SA = 2πrh = 2π·5·10 = **100π cm²**.",
    },
    {
      question:
        "A cylinder has radius 5 cm and height 10 cm. Find total surface area (exact form).",
      answer:
        "Total SA = 2πr² + 2πrh = 2π·25 + 100π = **150π cm²**.",
    },
  ],

  "3d-pythagoras-trig": [
    {
      question:
        "A cuboid is 6 cm by 8 cm by 10 cm. Find the space diagonal.",
      answer:
        "Base diagonal = √(6²+8²)=√(36+64)=10. Space diagonal = √(10²+10²)=√200= **10√2 ≈ 14.1 cm**.",
    },
    {
      question:
        "A cube has side 7 cm. Find the space diagonal.",
      answer:
        "Space diagonal = 7√3 ≈ **12.1 cm**.",
    },
    {
      question:
        "A vertical pole is 9 m high. A wire from the top meets the ground 4 m from the base. Find the wire length.",
      answer:
        "Right triangle: √(9²+4²)=√(81+16)=√97 ≈ **9.85 m**.",
    },
    {
      question:
        "A ramp is 4.5 m long and rises 1.2 m. Find the angle of elevation.",
      answer:
        "sin θ = opp/hyp = 1.2/4.5 = 0.2667 → θ ≈ **15.5°**.",
    },
    {
      question:
        "Explain the standard method for 3D problems.",
      answer:
        "Draw/identify a **right-angled triangle** inside the 3D shape. Often you find an intermediate diagonal first, then apply Pythagoras/trig again.",
    },
  ],
};
