/**
 * Commercial Intent Detection for SmartChoose
 * 
 * Only generates content for high-commercial-value queries.
 * Blocks generic informational content that won't drive affiliate conversions.
 */

// ── Commercial Intent Patterns (ALLOW) ─────────────────────────────────────
const COMMERCIAL_PATTERNS = [
  // "Best X under ₹Y" patterns
  /^best[\s-].+under[\s-][₹rs]?\d/i,
  /^top[\s-]\d+[\s-].+under[\s-][₹rs]?\d/i,
  /^best[\s-].+for[\s-](india|indian|gaming|office|home|students?|professionals?)/i,
  /^cheapest[\s-].+under[\s-][₹rs]?\d/i,
  /^budget[\s-].+under[\s-][₹rs]?\d/i,

  // Product vs Product comparison
  /vs[\s-]/i,
  /[\s-]vs[\s-]/i,
  /compare[\s-]/i,
  /comparison[\s-]/i,

  // Reviews
  /[\s-]review[\s-]?(\d{4})?$/i,
  /[\s-]reviews?[\s-]/i,
  /is[\s-].+worth[\s-](it|buying)/i,

  // Buying guides
  /buying[\s-]guide/i,
  /how[\s-]to[\s-](choose|pick|select|buy)/i,
  /which[\s-].+(should[\s-]i[\s-]buy|is[\s-]better)/i,

  // Specific commercial categories
  /best[\s-](gate|upsc|jee|neet)[\s-](books?|study[\s-]material)/i,
  /best[\s-](noise[\s-]cancell|wireless|bluetooth|gaming|mechanical)/i,

  // Price-specific patterns
  /under[\s-][₹rs]?\d{3,6}/i,
  /below[\s-][₹rs]?\d{3,6}/i,
  /within[\s-][₹rs]?\d{3,6}/i,
  /[₹rs]\d{3,6}[\s-]budget/i,
];

// ── Generic/Informational Patterns (BLOCK) ──────────────────────────────────
const BLOCKED_PATTERNS = [
  /^what[\s-]is[\s-]/i,
  /^how[\s-](does|do)[\s-]/i,
  /^why[\s-](is|are|do)[\s-]/i,
  /^history[\s-]of[\s-]/i,
  /^types[\s-]of[\s-]/i,
  /^advantages[\s-](of|and)[\s-]/i,
  /^disadvantages[\s-]of[\s-]/i,
  /^introduction[\s-]to[\s-]/i,
  /^explain[\s-]/i,
  /^definition[\s-]of[\s-]/i,
];

/**
 * Check if a query/slug has commercial intent worth generating content for.
 * @param query - The search query or URL slug
 * @returns { allowed: boolean; reason: string }
 */
export function hasCommercialIntent(query: string): { allowed: boolean; reason: string } {
  const normalized = query.toLowerCase().trim().replace(/-/g, ' ');

  // Check blocked patterns first
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: false,
        reason: `Generic informational content blocked: "${normalized}". SmartChoose only covers product recommendations and comparisons.`,
      };
    }
  }

  // Check commercial patterns
  for (const pattern of COMMERCIAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return { allowed: true, reason: 'Commercial intent detected' };
    }
  }

  // If query contains product-like keywords, allow it
  const productKeywords = [
    'keyboard', 'laptop', 'phone', 'earbuds', 'headphones', 'trimmer', 'router',
    'monitor', 'mouse', 'charger', 'powerbank', 'camera', 'smartwatch', 'tablet',
    'speaker', 'tv', 'refrigerator', 'washing machine', 'ac', 'mixer', 'grinder',
    'book', 'course', 'material', 'pen', 'notebook', 'bag', 'shoes', 'jacket',
    'protein', 'supplement', 'vitamin', 'oil', 'cream', 'serum',
  ];

  for (const kw of productKeywords) {
    if (normalized.includes(kw)) {
      return { allowed: true, reason: `Product keyword detected: ${kw}` };
    }
  }

  // Default: block unknown patterns (conservative)
  return {
    allowed: false,
    reason: `No commercial intent detected for: "${normalized}". Add specific product or price to generate content.`,
  };
}

/**
 * Extract product names from a comparison slug like "iphone-18-vs-samsung-s26"
 */
export function parseComparisonSlug(slug: string): { productA: string; productB: string } | null {
  const normalized = slug.toLowerCase().replace(/-/g, ' ');
  const vsIndex = normalized.indexOf(' vs ');
  if (vsIndex === -1) return null;

  const productA = slug.substring(0, vsIndex).replace(/-/g, ' ').trim();
  const productB = slug.substring(vsIndex + 4).replace(/-/g, ' ').trim();

  return { productA, productB };
}

/**
 * Normalize a search query into a Firestore-safe cache key
 */
export function normalizeCacheKey(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/[₹rs]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}
