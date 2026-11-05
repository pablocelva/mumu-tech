import { describe, it, expect } from 'vitest';
import { normalizeTag, resolveNextActiveTag, cardMatchesTag } from '../src/lib/tag-filter';

describe('Tag Filter Utilities', () => {
  it('normalizes whitespace and case consistently in Spanish locale', () => {
    expect(normalizeTag('  Reparación  ')).toBe('reparación');
    expect(normalizeTag('FUZZ FACE')).toBe('fuzz face');
  });

  it('activates, switches, toggles off, and resets active tag state', () => {
    expect(resolveNextActiveTag(null, 'Fuzz Face')).toBe('Fuzz Face');
    expect(resolveNextActiveTag('Fuzz Face', 'fuzz face')).toBeNull();
    expect(resolveNextActiveTag('Fuzz Face', '  Pedales DIY ')).toBe('Pedales DIY');
    expect(resolveNextActiveTag('Pedales DIY', null)).toBeNull();
    expect(resolveNextActiveTag('Pedales DIY', '   ')).toBeNull();
  });

  it('matches card tags case-insensitively and shows all when activeTag is null or blank', () => {
    const tags = ['Electra Distortion', 'Pedales DIY', 'Nivel Inicial'];

    expect(cardMatchesTag(tags, null)).toBe(true);
    expect(cardMatchesTag(tags, '')).toBe(true);
    expect(cardMatchesTag(tags, 'pedales diy')).toBe(true);
    expect(cardMatchesTag(tags, 'NIVEL INICIAL')).toBe(true);
    expect(cardMatchesTag(tags, 'Fuzz Face')).toBe(false);
  });
});

