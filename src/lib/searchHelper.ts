import { localDb, type LocalProduct, type LocalProductAlias } from '@/db/localDb';

export interface SearchResultProduct extends LocalProduct {
  categoryName?: string;
  categoryBanglaName?: string | null;
  aliases: string[];
}

/**
 * Searches the local IndexedDB products database using English, Bangla, or Banglish terms.
 * Performs fast case-insensitive, partial matching.
 */
export async function searchProducts(query: string): Promise<SearchResultProduct[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  // Fetch all active products, aliases, and categories to do in-memory search
  const products = await localDb.products.where('deleted').equals(0).toArray();
  const aliases = await localDb.productAliases.where('deleted').equals(0).toArray();
  const categories = await localDb.categories.where('deleted').equals(0).toArray();

  const categoryMap = new Map(categories.map(c => [c.id, c]));
  const aliasMap = new Map<string, string[]>(); // productId -> aliases[]

  aliases.forEach((a) => {
    const list = aliasMap.get(a.productId) || [];
    list.push(a.alias.toLowerCase());
    aliasMap.set(a.productId, list);
  });

  const results: SearchResultProduct[] = [];

  for (const product of products) {
    const prodName = product.name.toLowerCase();
    const prodBangla = (product.banglaName || '').toLowerCase();
    const prodAliases = aliasMap.get(product.id) || [];

    // Check matches
    const isEnglishMatch = prodName.includes(normalizedQuery);
    const isBanglaMatch = prodBangla.includes(normalizedQuery);
    const isAliasMatch = prodAliases.some(alias => alias.includes(normalizedQuery));

    if (isEnglishMatch || isBanglaMatch || isAliasMatch) {
      const cat = categoryMap.get(product.categoryId);
      results.push({
        ...product,
        categoryName: cat?.name,
        categoryBanglaName: cat?.banglaName,
        aliases: prodAliases,
      });
    }
  }

  // Rank results: prefix matches first, then partial matches
  return results.sort((a, b) => {
    const aNamePref = a.name.toLowerCase().startsWith(normalizedQuery) || (a.banglaName || '').startsWith(normalizedQuery);
    const bNamePref = b.name.toLowerCase().startsWith(normalizedQuery) || (b.banglaName || '').startsWith(normalizedQuery);

    if (aNamePref && !bNamePref) return -1;
    if (!aNamePref && bNamePref) return 1;
    return a.name.localeCompare(b.name);
  });
}
