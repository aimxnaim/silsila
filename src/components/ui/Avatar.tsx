/**
 * Initials in a circle. No photographs exist in an HR export, and inventing
 * faces for synthetic people would be both dishonest and unnecessary.
 *
 * The colour is a hash of the name, so it is stable across every view a person
 * appears in. That is the whole value of it: the eye follows the same coloured
 * disc down a 67-row table and across into a drawer without re-reading a name
 * each time. It draws from the same eight identity hues as departments and
 * charts, through the same hash — an avatar identifies, it does not rank.
 */

import { catIndex } from './vocabulary.tsx';

function initials(name: string): string {
  const parts = name
    .replace(/\b(bin|binti|a\/l|a\/p|Dato’|Dato'|Datuk|Dr\.?|Ustaz)\b/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      className={`avatar avatar--c${catIndex(name)} ${large ? 'avatar--lg' : ''}`.trim()}
      aria-hidden="true"
      title={name}
    >
      {initials(name)}
    </span>
  );
}
