export function normalizeVietnamese(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .trim();
}

/**
 * Checks if search text matches target text, ignoring Vietnamese accents and case.
 */
export function fuzzyMatch(target: string, search: string): boolean {
    if (!search) return true;
    if (!target) return false;

    // Check direct inclusion first
    if (target.toLowerCase().includes(search.toLowerCase())) return true;

    // Then check normalized (no accents)
    const normalizedTarget = normalizeVietnamese(target);
    const normalizedSearch = normalizeVietnamese(search);

    return normalizedTarget.includes(normalizedSearch);
}
