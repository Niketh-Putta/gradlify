with open("src/pages/RevisionNotesTopic.tsx") as f:
    text = f.read()
lines = text.split('\n')
for i, line in enumerate(lines):
    if line.count(')') > line.count('('):
        print(f"Line {i+1}: {line}")
