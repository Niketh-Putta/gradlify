
import sys
import re

def find_unbalanced(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'//.*', '', content)
    
    # We need to track the current position and look for tags
    # while ignoring tags inside strings or template literals
    
    stack = []
    i = 0
    n = len(content)
    
    line_starts = [0]
    for m in re.finditer('\n', content):
        line_starts.append(m.end())
        
    def get_line(pos):
        for idx, start in enumerate(line_starts):
            if start > pos:
                return idx
        return len(line_starts)

    while i < n:
        # Skip strings
        if content[i] in ['"', "'", '`']:
            quote = content[i]
            i += 1
            while i < n and content[i] != quote:
                if content[i] == '\\': i += 1
                i += 1
            i += 1
            continue
            
        # Look for tag
        if content[i:i+4] == '<div':
            start_pos = i
            i += 4
            # Find end of this opening tag
            is_self_closing = False
            while i < n and content[i] != '>':
                if content[i:i+2] == '/>':
                    is_self_closing = True
                    i += 1
                    break
                if content[i] in ['"', "'", '`']: # Skip strings inside attributes
                    q = content[i]
                    i += 1
                    while i < n and content[i] != q:
                        if content[i] == '\\': i += 1
                        i += 1
                i += 1
            
            if not is_self_closing:
                line_num = get_line(start_pos)
                stack.append((line_num, "DIV"))
            i += 1
            continue
            
        if content[i:i+6] == '</div>':
            if stack:
                stack.pop()
            else:
                line_num = get_line(i)
                print(f"ERROR: Stray </div> at line {line_num}")
            i += 6
            continue
            
        i += 1
                
    if stack:
        print("\nUNCLOSED TAGS:")
        for ln, tag in stack:
            print(f"Line {ln}: {tag}")
    else:
        print("\nAll tags balanced.")

if __name__ == "__main__":
    find_unbalanced(sys.argv[1])
