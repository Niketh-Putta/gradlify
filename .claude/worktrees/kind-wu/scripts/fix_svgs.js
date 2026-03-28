#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function allSvgs(dir){
  const base = path.resolve(dir);
  return fs.readdirSync(base).filter(f=>f.endsWith('.svg')).map(f=>path.join(base,f));
}

function read(p){return fs.readFileSync(p,'utf8');}
function write(p,c){fs.writeFileSync(p,c,'utf8');}

function ensurePreserve(svg){
  return svg.replace(/<svg([^>]*)>/i, (m, attrs)=>{
    if(/preserveAspectRatio\s*=\s*"[^"]+"/i.test(attrs)) return m; // already
    return `<svg${attrs} preserveAspectRatio="xMidYMid meet">`;
  });
}

function expandViewBox(svg){
  return svg.replace(/<svg[^>]*viewBox\s*=\s*"([^"]+)"([^>]*)>/i, (m, vb, rest)=>{
    try{
      const parts = vb.trim().split(/[ ,]+/).map(Number);
      if(parts.length!==4 || parts.some(isNaN)) return m;
      let [minX,minY,w,h]=parts;
      // Add 12% padding around canvas
      const padW = w * 0.12;
      const padH = h * 0.12;
      const newMinX = Math.floor(minX - padW);
      const newMinY = Math.floor(minY - padH);
      const newW = Math.ceil(w + padW*2);
      const newH = Math.ceil(h + padH*2);
      return m.replace(vb, `${newMinX} ${newMinY} ${newW} ${newH}`);
    }catch(e){return m}
  });
}

function runOnDir(dir){
  const files = allSvgs(dir);
  files.forEach(f=>{
    let s = read(f);
    const before = s;
    if(!/viewBox\s*=\s*"[^"]+"/i.test(s)){
      // If missing viewBox, try to infer from width/height attributes
      const m = s.match(/<svg[^>]*width\s*=\s*"([0-9.]+)"[^>]*height\s*=\s*"([0-9.]+)"/i);
      if(m){
        const w = Math.round(Number(m[1]));
        const h = Math.round(Number(m[2]));
        s = s.replace(/<svg([^>]*)>/i, `<svg$1 viewBox="0 0 ${w} ${h}">`);
      }
    }

    s = ensurePreserve(s);
    s = expandViewBox(s);

    // Make root svg allow visible overflow (so labels outside viewBox aren't clipped)
    s = s.replace(/<svg([^>]*)>/i, (m, attrs)=>{
      if(/overflow\s*=\s*"[^"]+"/i.test(attrs)) return m;
      return `<svg${attrs} style="overflow:visible">`;
    });

    if(s!==before){ write(f,s); console.log('patched', f); }
  });
}

const roots = [
  'public/notes-diagrams/algebra',
  'public/notes-diagrams/geometry'
];

roots.forEach(r=>{
  if(fs.existsSync(r)) runOnDir(r);
  else console.warn('missing', r);
});

console.log('SVG fix script finished');
