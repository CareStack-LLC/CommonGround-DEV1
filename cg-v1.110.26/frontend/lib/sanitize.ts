/**
 * Sanitize HTML to prevent XSS.
 *
 * Backed by DOMPurify (via isomorphic-dompurify so it works in both server and
 * client components). The previous implementation was a hand-rolled regex
 * stripper, which is a known-bypassable approach — e.g. unclosed <script> tags
 * and entity-encoded `javascript:` URIs slipped through. DOMPurify parses the
 * HTML and applies an allowlist, which is the only robust approach for a
 * messaging/CMS product handling attacker-influenceable content.
 */
import DOMPurify from 'isomorphic-dompurify';

// Allowlist tuned for our CMS/markdown-rendered content: formatting, links,
// lists, tables, images. No <script>/<iframe>/<object>/<embed>/<form>/<style>,
// no event handlers, only safe URL schemes.
const CONFIG = {
  ALLOWED_TAGS: [
    'a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span', 'strong',
    'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'colspan', 'rowspan'],
  // Only http(s)/mailto/tel and relative URLs; blocks javascript:, data:text/html, etc.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
};

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, CONFIG) as unknown as string;
  // Force a safe rel on any link that opens a new tab.
  return clean.replace(
    /<a\b([^>]*?)target="_blank"([^>]*)>/gi,
    (m: string, pre: string, post: string) =>
      /rel=/i.test(m) ? m : `<a ${pre}target="_blank" rel="noopener noreferrer"${post}>`,
  );
}
