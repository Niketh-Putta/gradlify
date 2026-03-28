import { supabase } from '@/integrations/supabase/client';

const PNG_BASE64_RE = /^iVBORw0KGgo/i;
const JPG_BASE64_RE = /^\/9j\//i;
const SVG_BASE64_RE = /^PHN2Zy/i;

const isSvgText = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'));
};

const encodeSvgText = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const resolveQuestionImageUrl = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const url = String(raw).trim();
  if (!url) return undefined;

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
  if (url.startsWith('http')) {
    return url.includes('?') ? `${url}&v=6` : `${url}?v=6`;
  }
  if (url.includes('/storage/v1/object/public/')) return url;

  const path = url.replace(/^\/+/, '').replace(/^questions\//, '');
  const publicUrl = supabase.storage.from('questions').getPublicUrl(path).data.publicUrl;
  return publicUrl.includes('?') ? `${publicUrl}&v=6` : `${publicUrl}?v=6`;
};
