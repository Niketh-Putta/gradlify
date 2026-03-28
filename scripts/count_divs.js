const fs = require('fs');

const content = fs.readFileSync('src/pages/RevisionNotesTopic.tsx', 'utf-8');
const lines = content.split('\n');

let level = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const divs = (line.match(/<div/g) || []).length;
  const endDivs = (line.match(/<\/div>/g) || []).length;
  
  if (divs > 0 || endDivs > 0) {
    level += (divs - endDivs);
    console.log(`${String(i + 1).padStart(4, ' ')}: Lvl ${String(level).padStart(2, ' ')} | ${line.trim()}`);
  }
}
