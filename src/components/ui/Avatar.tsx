/**
 * Initials in a circle. No photographs exist in an HR export, and inventing
 * faces for synthetic people would be both dishonest and unnecessary.
 *
 * The colour is a hash of the name, so it is stable across every view a person
 * appears in. That is the whole value of it: the eye follows the same coloured
 * disc down a 67-row table and across into a drawer without re-reading a name
 * each time. Six hues, all desaturated, none of them the brand red at full
 * strength — an avatar identifies, it does not rank.
 */

const PALETTE_SIZE = 6;

function initials(name: string): string {
  const parts = name
    .replace(/\b(bin|binti|a\/l|a\/p|Dato’|Dato'|Datuk|Dr\.?|Ustaz)\b/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Cheap, deterministic, and stable across reloads — which is all it needs. */
function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return (h % PALETTE_SIZE) + 1;
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      className={`avatar avatar--c${hue(name)} ${large ? 'avatar--lg' : ''}`.trim()}
      aria-hidden="true"
      title={name}
    >
      {initials(name)}
    </span>
  );
}
