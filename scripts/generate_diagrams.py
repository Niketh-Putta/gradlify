import os

def write_svg(name, content):
    os.makedirs('public/images/geometry', exist_ok=True)
    with open(f'public/images/geometry/{name}', 'w') as f:
        f.write(content)

rectangle = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <rect x="50" y="50" width="200" height="100" fill="none" stroke="#2563eb" stroke-width="4" rx="4" />
  <text x="150" y="40" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="middle">Length</text>
  <text x="35" y="105" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="end" dominant-baseline="middle">Width</text>
</svg>'''

triangle = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <polygon points="50,150 250,150 150,50" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round" />
  <line x1="150" y1="50" x2="150" y2="150" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6,6" />
  <text x="150" y="170" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="middle">Base</text>
  <text x="160" y="105" font-family="Avenir, Arial" font-size="16" fill="#64748b" dominant-baseline="middle">Height</text>
  <!-- right angle symbol -->
  <polyline points="150,140 160,140 160,150" fill="none" stroke="#94a3b8" stroke-width="2" />
</svg>'''

cube = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <polygon points="40,80 120,80 120,160 40,160" fill="none" stroke="#2563eb" stroke-width="3" />
  <polygon points="80,40 160,40 160,120 80,120" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4,4" />
  <line x1="40" y1="80" x2="80" y2="40" stroke="#2563eb" stroke-width="3" />
  <line x1="120" y1="80" x2="160" y2="40" stroke="#2563eb" stroke-width="3" />
  <line x1="120" y1="160" x2="160" y2="120" stroke="#2563eb" stroke-width="3" />
  <line x1="40" y1="160" x2="80" y2="120" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4,4" />
</svg>'''

parallelogram = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <polygon points="80,50 260,50 220,150 40,150" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round" />
  <line x1="80" y1="50" x2="80" y2="150" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6,6" />
  <text x="130" y="170" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="middle">Base</text>
  <text x="90" y="105" font-family="Avenir, Arial" font-size="16" fill="#64748b" dominant-baseline="middle">Height</text>
  <polyline points="80,140 90,140 90,150" fill="none" stroke="#94a3b8" stroke-width="2" />
</svg>'''

write_svg('rectangle.svg', rectangle)
write_svg('triangle.svg', triangle)
write_svg('cube.svg', cube)
write_svg('parallelogram.svg', parallelogram)

print("Generated beautiful geometry diagrams!")
