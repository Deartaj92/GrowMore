/**
 * Utility functions for class-related operations
 */

/**
 * Extracts the leading number from a class name (e.g., "1st" -> 1, "10th" -> 10)
 */
export const extractLeadingNumber = (name: string): number | null => {
  const match = name.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Determines if a class name is one of the special pre-primary classes
 */
export const isSpecialClass = (name: string): boolean => {
  const specialClasses = ['Play Group', 'Nursery', 'K.G'];
  return specialClasses.includes(name);
};

/**
 * Gets the sort order for special classes
 */
export const getSpecialClassOrder = (name: string): number => {
  const specialClassOrder: { [key: string]: number } = {
    'Play Group': 1,
    'Nursery': 2,
    'K.G': 3
  };
  return specialClassOrder[name] || 999;
};

/**
 * Universal class sorting function that handles:
 * 1. Numbered classes (1st, 2nd, 3rd, etc.) - sorted numerically
 * 2. Special classes (Play Group, Nursery, K.G) - sorted in specific order after numbered classes
 * 3. Other classes - sorted alphabetically after special classes
 */
export const sortClasses = <T extends { name: string }>(classes: T[]): T[] => {
  return [...classes].sort((a, b) => {
    const aNum = extractLeadingNumber(a.name);
    const bNum = extractLeadingNumber(b.name);
    const aIsSpecial = isSpecialClass(a.name);
    const bIsSpecial = isSpecialClass(b.name);

    // Both are numbered classes - sort numerically
    if (aNum !== null && bNum !== null) {
      return aNum - bNum;
    }

    // One is numbered, one is not - numbered classes come first
    if (aNum !== null && !bIsSpecial) return -1;
    if (bNum !== null && !aIsSpecial) return 1;

    // Both are special classes - sort by predefined order
    if (aIsSpecial && bIsSpecial) {
      return getSpecialClassOrder(a.name) - getSpecialClassOrder(b.name);
    }

    // One is numbered, one is special - numbered comes first
    if (aNum !== null && bIsSpecial) return -1;
    if (bNum !== null && aIsSpecial) return 1;

    // One is special, one is other - special comes first
    if (aIsSpecial && !bIsSpecial) return -1;
    if (bIsSpecial && !aIsSpecial) return 1;

    // Both are other classes - sort alphabetically
    return a.name.localeCompare(b.name);
  });
};
