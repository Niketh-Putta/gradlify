import random
import json
import math
from .utils import get_base

def generate_geometry_questions():
    questions = []

    # 1. geometry|2d-3d-shapes
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            shapes = [("triangle", 3), ("square", 4), ("pentagon", 5), ("hexagon", 6), ("octagon", 8), ("decagon", 10)]
            s_name, s_sides = random.choice(shapes)
            q = f"What is the sum of the interior angles of a {s_name}?"
            ans = str((s_sides - 2) * 180) + "°"
            exp = f"[VISUAL: Interior Angles]\nStep 1: The formula for the sum of interior angles is (n - 2) × 180°, where n is the number of sides.\nStep 2: A {s_name} has {s_sides} sides.\nStep 3: Subtract 2 from the number of sides: {s_sides} - 2 = {s_sides - 2}.\nStep 4: Multiply by 180°: {s_sides - 2} × 180° = {ans}.\nFinal answer: {ans}"
        elif t == 2:
            s_sides = random.choice([5, 6, 8, 9, 10, 12, 15, 18, 20])
            ext = 360 // s_sides
            q = f"A regular polygon has {s_sides} sides. What is the size of each exterior angle?"
            ans = str(ext) + "°"
            exp = f"[VISUAL: Exterior Angles]\nStep 1: The sum of all exterior angles for ANY convex polygon is always exactly 360°.\nStep 2: Because it is a 'regular' polygon, all {s_sides} exterior angles are the exact same size.\nStep 3: Divide the total by the number of sides: 360° ÷ {s_sides}.\nStep 4: 360 ÷ {s_sides} = {ext}°.\nFinal answer: {ans}"
        elif t == 3:
            s_sides = random.choice([5, 6, 8, 9, 10, 12])
            int_angle = 180 - (360 // s_sides)
            q = f"A regular polygon has {s_sides} sides. What is the size of one interior angle?"
            ans = str(int_angle) + "°"
            exp = f"[VISUAL: Interior and Exterior Relationship]\nStep 1: A great shortcut is finding the exterior angle first.\nStep 2: Exterior angle = 360° ÷ {s_sides} sides = {360//s_sides}°.\nStep 3: Interior and exterior angles lie on a straight line and therefore add up to 180°.\nStep 4: Subtract the exterior angle from 180°: 180° - {360//s_sides}° = {int_angle}°.\nFinal answer: {ans}"
        else:
            shapes3d = [("cube", 6, 12, 8), ("cuboid", 6, 12, 8), ("square-based pyramid", 5, 8, 5), ("triangular prism", 5, 9, 6), ("tetrahedron", 4, 6, 4)]
            s_name, faces, edges, verts = random.choice(shapes3d)
            q = f"How many edges does a {s_name} have?"
            ans = str(edges)
            exp = f"[VISUAL: 3D Properties]\nStep 1: Visualise a {s_name} in your mind.\nStep 2: Faces are the flat surfaces ({faces}), vertices are the corners ({verts}).\nStep 3: Edges are the straight lines where two faces meet.\nStep 4: By counting them carefully, a {s_name} has {edges} edges.\nFinal answer: {ans}"
        
        img = ""
        if t == 4 and s_name == "cube": img = "/images/geometry/cube.svg"
        if t == 1 and s_name == "triangle": img = "/images/geometry/triangle.svg"
        questions.append(get_base("geometry|2d-3d-shapes", q, ans, exp, diff=2, marks=1, image_url=img))

    # 2. geometry|angles
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            a = random.randint(30, 80)
            b = random.randint(20, 70)
            c = 180 - a - b
            q = f"Two angles in a triangle are {a}° and {b}°. What is the size of the third angle?"
            ans = f"{c}°"
            exp = f"[VISUAL: Triangle Angles]\nStep 1: All interior angles in a triangle must add up to exactly 180°.\nStep 2: Add the two known angles together: {a}° + {b}° = {a+b}°.\nStep 3: Subtract this sum from 180° to find the missing angle.\nStep 4: 180° - {a+b}° = {c}°.\nFinal answer: {ans}"
        elif t == 2:
            a = random.randint(50, 130)
            c = 180 - a
            q = f"Two angles lie on a straight line. If one angle is {a}°, what is the size of the other angle?"
            ans = f"{c}°"
            exp = f"[VISUAL: Straight Line Rule]\nStep 1: Angles on a straight line always add up to 180°.\nStep 2: To find the missing angle, subtract the known angle from 180°.\nStep 3: 180° - {a}° = {c}°.\nFinal answer: {ans}"
        elif t == 3:
            a = random.randint(40, 80)
            q = f"An isosceles triangle has a top angle of {a}°. What is the size of one of its base angles?"
            ans = f"{(180 - a) // 2}°" if (180 - a) % 2 == 0 else f"{(180 - a) / 2}°"
            exp = f"[VISUAL: Isosceles Triangle]\nStep 1: Angles in a triangle add to 180°.\nStep 2: An isosceles triangle has two identical base angles.\nStep 3: Subtract the top angle from 180°: 180° - {a}° = {180-a}°.\nStep 4: Since the two base angles are identical, divide the remainder by 2.\nStep 5: {180-a}° ÷ 2 = {ans}.\nFinal answer: {ans}"
        else:
            q = "Are vertically opposite angles equal, supplementary, or complementary?"
            ans = "Equal"
            exp = "[VISUAL: Vertically Opposite]\nStep 1: When two straight lines intersect, they form four angles.\nStep 2: The angles opposite each other at the intersection (the 'X' shape) are called vertically opposite angles.\nStep 3: A fundamental rule of geometry states that vertically opposite angles are always exactly equal to each other.\nFinal answer: Equal"
        img = "/images/geometry/triangle.svg" if t in [1, 3] else ""
        questions.append(get_base("geometry|angles", q, ans, exp, diff=2, marks=1, image_url=img))

    # 3. geometry|coordinates
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            x, y = random.randint(-5, 5), random.randint(-5, 5)
            q = f"A point is located at ({x}, {y}). It is translated 3 units right and 4 units down. What are its new coordinates?"
            ans = f"({x+3}, {y-4})"
            exp = f"[VISUAL: Translation]\nStep 1: The first number in a coordinate represents the horizontal (x-axis) position.\nStep 2: Moving right means adding to the x-coordinate: {x} + 3 = {x+3}.\nStep 3: The second number represents the vertical (y-axis) position.\nStep 4: Moving down means subtracting from the y-coordinate: {y} - 4 = {y-4}.\nFinal answer: {ans}"
        elif t == 2:
            x, y = random.randint(-5, 5), random.randint(1, 5)
            q = f"What happens to the coordinate ({x}, {y}) when it is reflected in the x-axis?"
            ans = f"({x}, {-y})"
            exp = f"[VISUAL: Reflection]\nStep 1: The x-axis is the horizontal line across the middle of the graph.\nStep 2: When you reflect across the x-axis, the horizontal position (x-coordinate) stays exactly the same.\nStep 3: The vertical position (y-coordinate) flips below the line, so its sign changes from {y} to {-y}.\nFinal answer: {ans}"
        elif t == 3:
            x1, y1 = random.randint(1, 4), random.randint(1, 4)
            x2, y2 = x1 + random.randint(2, 6), y1 + random.randint(2, 6)
            mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
            mid_x_str = f"{int(mid_x)}" if mid_x.is_integer() else f"{mid_x}"
            mid_y_str = f"{int(mid_y)}" if mid_y.is_integer() else f"{mid_y}"
            q = f"Find the midpoint between ({x1}, {y1}) and ({x2}, {y2})."
            ans = f"({mid_x_str}, {mid_y_str})"
            exp = f"[VISUAL: Midpoint Formula]\nStep 1: The midpoint is literally the average of the x-coordinates and the average of the y-coordinates.\nStep 2: Find the middle x: ({x1} + {x2}) ÷ 2 = {mid_x_str}.\nStep 3: Find the middle y: ({y1} + {y2}) ÷ 2 = {mid_y_str}.\nFinal answer: {ans}"
        else:
            x, y = random.randint(1, 5), random.randint(1, 5)
            q = f"Which quadrant does the point ({-x}, {-y}) lie in?"
            ans = "Bottom Left (Quadrants III)"
            exp = f"[VISUAL: The 4 Quadrants]\nStep 1: Top Right (Quadrant I) has positive x and positive y.\nStep 2: Top Left (Quadrant II) has negative x and positive y.\nStep 3: Bottom Left (Quadrant III) has both negative x and negative y.\nStep 4: Bottom Right (Quadrant IV) has positive x and negative y.\nFinal answer: Bottom Left (Quadrants III)"
        questions.append(get_base("geometry|coordinates", q, ans, exp, diff=2, marks=2))

    # 4. geometry|measures
    for i in range(60):
        t = random.randint(1, 3)
        if t == 1:
            dist = random.randint(60, 240)
            speed = random.choice([30, 40, 50, 60])
            time = dist / speed
            time_str = f"{int(time)} hours" if time.is_integer() else f"{time} hours"
            q = f"A car travels at an average speed of {speed} mph. How long will it take to travel {dist} miles?"
            ans = time_str
            exp = f"[VISUAL: Speed Distance Time]\nStep 1: Use the DST formula triangle. Time = Distance ÷ Speed.\nStep 2: The distance is {dist} miles. The speed is {speed} mph.\nStep 3: Calculate {dist} ÷ {speed}.\nStep 4: {dist} ÷ {speed} = {time_str}.\nFinal answer: {ans}"
        elif t == 2:
            km = random.randint(5, 50) * 8
            miles = km * 0.625 # 8km = 5miles approx
            q = f"Using the approximation 8km ≈ 5 miles, convert {km}km into miles."
            ans = f"{int(km * 5/8)} miles"
            exp = f"[VISUAL: Measure Conversions]\nStep 1: Find out how many 'blocks' of 8km fit into {km}km.\nStep 2: {km} ÷ 8 = {km // 8}.\nStep 3: Each of those blocks represents 5 miles.\nStep 4: Multiply by 5. {km // 8} × 5 = {int(km * 5/8)} miles.\nFinal answer: {ans}"
        else:
            time1 = random.choice(["08:30", "09:15", "10:45", "14:20"])
            duration = random.randint(45, 125)
            hr, mn = int(time1.split(":")[0]), int(time1.split(":")[1])
            th = (hr + (mn + duration) // 60) % 24
            tm = (mn + duration) % 60
            ans = f"{th:02d}:{tm:02d}"
            q = f"A train departs at {time1} and the journey takes {duration} minutes. What time does it arrive?"
            exp = f"[VISUAL: Elapsed Time]\nStep 1: Break the {duration} minutes into hours and minutes. {duration} mins = {duration // 60} hour(s) and {duration % 60} minute(s).\nStep 2: Add the hours to the starting time. {time1} + {duration // 60} hours = {(hr + duration//60)%24:02d}:{mn:02d}.\nStep 3: Add the remaining minutes. {timedelta(mn, duration%60)} (careful to roll over past 60!).\nFinal answer: {ans}"
        questions.append(get_base("geometry|measures", q, ans, exp, diff=2, marks=2))

    # 5. geometry|perimeter-area
    for i in range(60):
        t = random.randint(1, 4)
        if t == 1:
            l, w = random.randint(5, 12), random.randint(3, 8)
            q = f"Find the area of a rectangle with length {l}cm and width {w}cm."
            ans = f"{l*w}cm²"
            exp = f"[VISUAL: Area of a Rectangle]\nStep 1: The formula for the Area of a rectangle is Length × Width.\nStep 2: Substitute the known values: Area = {l} × {w}.\nStep 3: Multiply them together to find the space inside the shape.\nStep 4: {l} × {w} = {l*w}.\nFinal answer: {ans}"
        elif t == 2:
            base, h = random.randint(4, 12), random.randint(5, 10)
            q = f"Find the area of a triangle with a base of {base}cm and a perpendicular height of {h}cm."
            ans = f"{(base * h) / 2}cm²" if (base * h) % 2 != 0 else f"{(base * h) // 2}cm²"
            exp = f"[VISUAL: Area of a Triangle]\nStep 1: The formula for the Area of a triangle is (Base × Height) ÷ 2.\nStep 2: Multiply the base by the height: {base} × {h} = {base*h}.\nStep 3: Do not forget to halve it! This is the most common mistake.\nStep 4: {base*h} ÷ 2 = {ans}.\nFinal answer: {ans}"
        elif t == 3:
            w = random.randint(2, 8)
            l = random.randint(4, 15)
            area = l * w
            q = f"A rectangle has an area of {area}cm² and a width of {w}cm. What is its perimeter?"
            ans = f"{2*(l+w)}cm"
            exp = f"[VISUAL: Working Backwards]\nStep 1: Use the Area formula to find the missing Length. Area = Length × Width, so {area} = Length × {w}.\nStep 2: Divide the area by the width. {area} ÷ {w} = {l}cm.\nStep 3: The perimeter is the total distance around the outside. Add all 4 sides: {l} + {w} + {l} + {w}.\nStep 4: Total perimeter = {2*(l+w)}cm.\nFinal answer: {ans}"
        else:
            w1 = random.randint(3, 6)
            h1 = random.randint(4, 8)
            w2 = random.randint(2, 5)
            h2 = random.randint(2, 4)
            area = (w1 * h1) + (w2 * h2)
            q = f"An L-shaped room is made of two joined rectangles: one is {w1}m by {h1}m, and the other is {w2}m by {h2}m. What is the total area?"
            ans = f"{area}m²"
            exp = f"[VISUAL: Compound Shapes]\nStep 1: Split the compound shape into two separate rectangles.\nStep 2: Find the area of the first rectangle. {w1} × {h1} = {w1*h1}m².\nStep 3: Find the area of the second rectangle. {w2} × {h2} = {w2*h2}m².\nStep 4: Add both areas together to find the total area. {w1*h1} + {w2*h2} = {area}m².\nFinal answer: {ans}"
        img = ""
        if t == 1 or t == 3: img = "/images/geometry/rectangle.svg"
        if t == 2: img = "/images/geometry/triangle.svg"
        
        questions.append(get_base("geometry|perimeter-area", q, ans, exp, diff=3, marks=2, image_url=img))

    # 6. geometry|volume-surface-area
    for i in range(60):
        t = random.randint(1, 3)
        if t == 1:
            l, w, h = random.randint(3, 8), random.randint(2, 6), random.randint(4, 10)
            q = f"What is the volume of a cuboid measuring {l}cm by {w}cm by {h}cm?"
            ans = f"{l*w*h}cm³"
            exp = f"[VISUAL: Volume of a Cuboid]\nStep 1: The formula for Volume is Length × Width × Height.\nStep 2: Multiply the length and width to find the area of the base. {l} × {w} = {l*w}.\nStep 3: Multiply the base area by the height. {l*w} × {h} = {l*w*h}.\nStep 4: Include the correct 3D unit (cm³).\nFinal answer: {ans}"
        elif t == 2:
            s = random.randint(3, 8)
            q = f"Find the surface area of a cube with side length {s}cm."
            ans = f"{6 * (s**2)}cm²"
            exp = f"[VISUAL: Surface Area of a Cube]\nStep 1: Surface Area is the total area of all the faces on the outside of the 3D shape.\nStep 2: A cube has 6 identical square faces.\nStep 3: Find the area of ONE face. {s} × {s} = {s**2}cm².\nStep 4: Multiply that area by 6. {s**2} × 6 = {6*(s**2)}cm².\nFinal answer: {ans}"
        else:
            base_area = random.randint(10, 40)
            h = random.randint(4, 15)
            vol = base_area * h
            q = f"A triangular prism has a volume of {vol}cm³. If its cross-sectional area is {base_area}cm², what is its length?"
            ans = f"{h}cm"
            exp = f"[VISUAL: Volume of Prisms]\nStep 1: The standard volume formula for ANY prism is Cross-sectional Area × Length.\nStep 2: We must work backwards. We know {vol} = {base_area} × Length.\nStep 3: Divide the Volume by the Cross-sectional Area to find the Length.\nStep 4: {vol} ÷ {base_area} = {h}cm.\nFinal answer: {ans}"
        img = ""
        if t == 2: img = "/images/geometry/cube.svg"
        if t == 1: img = "/images/geometry/rectangle.svg" 
        questions.append(get_base("geometry|volume-surface-area", q, ans, exp, diff=3, marks=2, image_url=img))

    return questions

def timedelta(mn, extra):
    return "" # dummy
