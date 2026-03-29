import { supabase } from '@/integrations/supabase/client';

const PNG_BASE64_RE = /^iVBORw0KGgo/i;
const JPG_BASE64_RE = /^\/9j\//i;
const SVG_BASE64_RE = /^PHN2Zy/i;

const isSvgText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'));
};

const encodeSvgText = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const getDynamicGeometrySvg = (text: string, type: 'rectangle' | 'triangle' | 'cube' | 'parallelogram'): string | undefined => {
  let l = "Length", w = "Width", h = "Height", base = "Base";

  const dims: string[] = [];
  const regex = /(\d+(?:\.\d+)?)\s*(cm²|cm³|m²|m³|mm²|mm³|km²|km³|cm|m|mm|km)/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
     dims.push(match[1] + match[2]);
  }
  
  if (dims.length === 0) {
    const rawRegex = /(?:length|width|height|base|sides?|of)\s+(\d+(?:\.\d+)?)/gi;
    let raw;
    while ((raw = rawRegex.exec(text)) !== null) {
       dims.push(raw[1]);
    }
  }

  if (type === 'cube' && dims.length > 0) {
    if (dims.length >= 3) {
       l = dims[0]; w = dims[1]; h = dims[2];
    } else if (dims.length >= 1) {
       l = dims[0]; w = dims[0]; h = dims[0];
    }
  } else if ((type === 'rectangle' || type === 'parallelogram' || type === 'triangle') && dims.length >= 2) {
    if (dims[0].includes('²')) {
       // if area is the first dim, it usually doesn't label the base cleanly, so we swap or just use what we have
       w = dims[1]; l = "Length"; base = "Base"; h = dims[1]; 
       // Optionally we could deduce the missing value if we want, but keeping it simple:
    } else {
       l = dims[0]; w = dims[1]; base = dims[0]; h = dims[1];
    }
  } else if (dims.length === 1) {
    l = dims[0]; w = "Width"; base = dims[0]; h = "Height";
  }

  let svg = "";
  if (type === 'cube') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="100%" height="100%">
  <polygon points="80,40 170,40 170,130 80,130" fill="none" stroke="#2563eb" stroke-width="3" />
  <polygon points="40,80 130,80 130,170 40,170" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4,4" />
  <line x1="80" y1="40" x2="40" y2="80" stroke="#2563eb" stroke-width="3" />
  <line x1="170" y1="40" x2="130" y2="80" stroke="#2563eb" stroke-width="3" />
  <line x1="170" y1="130" x2="130" y2="170" stroke="#2563eb" stroke-width="3" />
  <line x1="80" y1="130" x2="40" y2="170" stroke="#94a3b8" stroke-width="3" stroke-dasharray="4,4" />
  <text x="85" y="190" font-family="Avenir, Arial" font-size="15" fill="#64748b" text-anchor="middle" font-weight="600">${l}</text>
  <text x="160" y="155" font-family="Avenir, Arial" font-size="15" fill="#64748b" text-anchor="middle" font-weight="600">${w}</text>
  <text x="32" y="125" font-family="Avenir, Arial" font-size="15" fill="#64748b" text-anchor="end" dominant-baseline="middle" font-weight="600">${h}</text>
</svg>`;
  } else if (type === 'rectangle') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 20 310 150" width="100%" height="100%">
  <rect x="40" y="40" width="200" height="100" fill="none" stroke="#2563eb" stroke-width="4" rx="4" />
  <text x="140" y="30" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="middle" font-weight="600">${l}</text>
  <text x="30" y="90" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="end" dominant-baseline="middle" font-weight="600">${w}</text>
</svg>`;
  } else if (type === 'triangle') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 20 310 160" width="100%" height="100%">
  <polygon points="40,140 240,140 140,40" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round" />
  <line x1="140" y1="40" x2="140" y2="140" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6,6" />
  <text x="140" y="160" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="middle" font-weight="600">${base}</text>
  <text x="130" y="95" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="end" dominant-baseline="middle" font-weight="600">${h}</text>
  <polyline points="140,130 150,130 150,140" fill="none" stroke="#94a3b8" stroke-width="2" />
</svg>`;
  } else if (type === 'parallelogram') {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 20 310 160" width="100%" height="100%">
  <polygon points="70,40 250,40 210,140 30,140" fill="none" stroke="#2563eb" stroke-width="4" stroke-linejoin="round" />
  <line x1="70" y1="40" x2="70" y2="140" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6,6" />
  <text x="120" y="160" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="middle" font-weight="600">${base}</text>
  <text x="60" y="95" font-family="Avenir, Arial" font-size="16" fill="#64748b" text-anchor="end" dominant-baseline="middle" font-weight="600">${h}</text>
  <polyline points="70,130 80,130 80,140" fill="none" stroke="#94a3b8" stroke-width="2" />
</svg>`;
  }

  if (svg) return encodeSvgText(svg);
  return undefined;
};

export const resolveQuestionImageUrl = (raw?: string | null, questionText?: string | null): string | undefined => {
  if (!raw) {
    if (questionText) {
      const text = questionText.toLowerCase();
      if (text.includes("cube") || text.includes("cuboid")) return getDynamicGeometrySvg(text, "cube");
      if (text.includes("parallelogram")) return getDynamicGeometrySvg(text, "parallelogram");
      if (text.includes("rectangle")) return getDynamicGeometrySvg(text, "rectangle");
      if (text.includes("triangle")) return getDynamicGeometrySvg(text, "triangle");
    }
    return undefined;
  }
  const url = String(raw).trim();
  if (!url) {
    if (questionText) {
      const text = questionText.toLowerCase();
      if (text.includes("cube") || text.includes("cuboid")) return getDynamicGeometrySvg(text, "cube");
      if (text.includes("parallelogram")) return getDynamicGeometrySvg(text, "parallelogram");
      if (text.includes("rectangle")) return getDynamicGeometrySvg(text, "rectangle");
      if (text.includes("triangle")) return getDynamicGeometrySvg(text, "triangle");
    }
    return undefined;
  }

  if (isSvgText(url)) {
    return encodeSvgText(url);
  }

  if (url.startsWith('data:image/svg+xml')) {
    const [, data = ''] = url.split(',', 2);
    if (data && data.includes('<svg')) {
      const prefix = url.split(',', 1)[0];
      return `${prefix},${encodeURIComponent(data)}`;
    }
    return url;
  }

  const compact = url.replace(/\s/g, '');
  if (SVG_BASE64_RE.test(compact)) return `data:image/svg+xml;base64,${compact}`;
  if (PNG_BASE64_RE.test(compact)) return `data:image/png;base64,${compact}`;
  if (JPG_BASE64_RE.test(compact)) return `data:image/jpeg;base64,${compact}`;

  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  // Serve local public images properly instead of routing them to Supabase
  if (url.startsWith('/images/') || url.startsWith('images/')) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  
  if (url.startsWith('http')) {
    return url.includes('?') ? `${url}&v=6` : `${url}?v=6`;
  }
  if (url.includes('/storage/v1/object/public/')) return url;

  const path = url.replace(/^\/+/, '').replace(/^questions\//, '');
  const publicUrl = supabase.storage.from('questions').getPublicUrl(path).data.publicUrl;
  return publicUrl.includes('?') ? `${publicUrl}&v=6` : `${publicUrl}?v=6`;
};
