/**
 * Initials in a circle. No photographs exist in an HR export, and inventing
 * faces for synthetic people would be both dishonest and unnecessary.
 */

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
    <span className={`avatar ${large ? 'avatar--lg' : ''}`} aria-hidden="true" title={name}>
      {initials(name)}
    </span>
  );
}
