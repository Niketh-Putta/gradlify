import re
with open("src/pages/RevisionNotesTopic.tsx") as f: text = f.read()

stack = []
for i, char in enumerate(text):
    if char in "({[":
        stack.append((char, i))
    elif char in ")}]":
        if not stack:
            print(f"Extra closing {char} at index {i}")
            break
        top_char = stack[-1][0]
        if (top_char == '(' and char == ')') or \
           (top_char == '{' and char == '}') or \
           (top_char == '[' and char == ']'):
            stack.pop()
        else:
            print(f"Mismatched closing {char} for {top_char} at index {i}")
            break

for s in stack:
    # Get line number
    line_no = text[:s[1]].count('\n') + 1
    print(f"Unclosed {s[0]} at line {line_no}")
