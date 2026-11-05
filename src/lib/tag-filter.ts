/**
 * Normalizes a tag label for case-insensitive comparison.
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLocaleLowerCase('es-CL');
}

/**
 * Toggles an active tag filter:
 * - Passing null/empty resets the filter to null (show all).
 * - Clicking the already active tag toggles it off (returns null).
 * - Clicking a different tag activates that tag.
 */
export function resolveNextActiveTag(
  currentActiveTag: string | null,
  clickedTag: string | null
): string | null {
  if (!clickedTag || clickedTag.trim().length === 0) {
    return null;
  }

  const trimmedClicked = clickedTag.trim();
  if (currentActiveTag && normalizeTag(currentActiveTag) === normalizeTag(trimmedClicked)) {
    return null;
  }

  return trimmedClicked;
}

/**
 * Checks whether a card's tag list matches the currently active filter tag.
 */
export function cardMatchesTag(
  cardTags: readonly string[],
  activeTag: string | null
): boolean {
  if (!activeTag || activeTag.trim().length === 0) {
    return true;
  }

  const target = normalizeTag(activeTag);
  return cardTags.some((tag) => normalizeTag(tag) === target);
}

