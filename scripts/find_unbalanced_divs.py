
import sys
import re

def find_unbalanced_divs(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    
    # We want to keep line numbers, so we'll replace matches with spaces but keep newlines
    
    # 1. Identify all self-closing tags and replace with spaces
    # This is rough but handles <div ... />
    def hide_self_closing(match):
        return " " * (match.end() - match.start())
    
    content = re.sub(r'<div\b[^>]*?/>', hide_self_closing, content, flags=re.DOTALL)
    
    # 2. Find all opening <div ... > and closing </div>
    tokens = []
    for match in re.finditer(r'<(div\b[^>]*?>|/div>)', content, flags=re.DOTALL):
        tag = match.group(0)
        line_num = content.count('\n', 0, match.start()) + 1
        if tag.startswith('</'):
            tokens.append(('close', line_num))
        else:
            tokens.append(('open', line_num))
            
    stack = []
    for type, line in tokens:
        if type == 'open':
            stack.append(line)
        else:
            if not stack:
                print(f"Unexpected </div> at line {line}")
            else:
                stack.pop()
                
    for line in stack:
        print(f"Unclosed <div> from line {line}")

if __name__ == "__main__":
    find_unbalanced_divs(sys.argv[1])
