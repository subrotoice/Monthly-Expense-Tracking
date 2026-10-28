'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import Link from 'next/link';
import { Search, ArrowRight, X, Plus, Save } from 'lucide-react';
import { searchProducts } from '@/lib/searchHelper';

const COMMON_UNITS = [
  'kg', 'gram', 'liter', 'ml', 'piece', 'dozen',
  'packet', 'bottle', 'box', 'hali', 'bundle',
];

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Add Product Panel State
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBangla, setNewProdBangla] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('kg');
  const [newProdAliases, setNewProdAliases] = useState<string[]>([]);
  const [newAliasInput, setNewAliasInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Inline New Category State (inside Add Panel)
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBangla, setNewCatBangla] = useState('');

  const resetAddPanel = () => {
    setNewProdName('');
    setNewProdBangla('');
    setNewProdCatId('');
    setNewProdUnit('kg');
    setNewProdAliases([]);
    setNewAliasInput('');
    setShowAddCategory(false);
    setNewCatName('');
    setNewCatBangla('');
    setShowAddPanel(false);
  };

  const handleAddAliasTag = () => {
    const trimmed = newAliasInput.trim().toLowerCase();
    if (trimmed && !newProdAliases.includes(trimmed)) {
      setNewProdAliases([...newProdAliases, trimmed]);
      setNewAliasInput('');
    }
  };

  const handleRemoveAliasTag = (alias: string) => {
    setNewProdAliases(newProdAliases.filter((a) => a !== alias));
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const id = crypto.randomUUID();
      await localDb.categories.put({
        id,
        name: newCatName.trim(),
        banglaName: newCatBangla.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });
      setNewProdCatId(id);
      setNewCatName('');
      setNewCatBangla('');
      setShowAddCategory(false);
    } catch {
      alert('Failed to create category.');
    }
  };

  const handleSaveProduct = async () => {
    if (!newProdName.trim()) {
      alert('Product name is required.');
      return;
    }
    if (!newProdCatId) {
      alert('Please select a category.');
      return;
    }
    setIsSaving(true);
    try {
      const productId = crypto.randomUUID();
      await localDb.transaction('rw', [localDb.products, localDb.productAliases], async () => {
        await localDb.products.put({
          id: productId,
          name: newProdName.trim(),
          banglaName: newProdBangla.trim() || null,
          categoryId: newProdCatId,
          defaultUnit: newProdUnit,
          createdAt: new Date(),
          updatedAt: new Date(),
          synced: 0,
          deleted: 0,
        });
        for (const alias of newProdAliases) {
          await localDb.productAliases.put({
            id: crypto.randomUUID(),
            productId,
            alias: alias.trim().toLowerCase(),
            createdAt: new Date(),
            updatedAt: new Date(),
            synced: 0,
            deleted: 0,
          });
        }
      });
      resetAddPanel();
    } catch (err) {
      console.error('Failed to add product:', err);
      alert('Failed to add product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch and group products + all categories for the add-product form
  const data = useLiveQuery(async () => {
    const allCategories = await localDb.categories.where('deleted').equals(0).toArray();
    const catMap = new Map(allCategories.map(c => [c.id, c]));

    let productsList;
    if (searchQuery.trim().length >= 1) {
      // Use our fuzzy search helper
      productsList = await searchProducts(searchQuery);
    } else {
      // Just fetch all active products
      const prods = await localDb.products.where('deleted').equals(0).toArray();
      const aliases = await localDb.productAliases.where('deleted').equals(0).toArray();
      const aliasMap = new Map<string, string[]>();
      aliases.forEach((a) => {
        const list = aliasMap.get(a.productId) || [];
        list.push(a.alias);
        aliasMap.set(a.productId, list);
      });

      productsList = prods.map(p => {
        const cat = catMap.get(p.categoryId);
        return {
          ...p,
          categoryName: cat?.name,
          categoryBanglaName: cat?.banglaName,
          aliases: aliasMap.get(p.id) || [],
        };
      });
    }

    // Group by category
    const grouped: Record<string, { catName: string; catBangla: string | null; list: typeof productsList }> = {};

    productsList.forEach((p) => {
      const catId = p.categoryId;
      const catName = p.categoryName || 'Other';
      const catBangla = p.categoryBanglaName || 'অন্যান্য';

      if (!grouped[catId]) {
        grouped[catId] = { catName, catBangla, list: [] };
      }
      grouped[catId].list.push(p);
    });

    // Sort categories by name
    const grouped_entries = Object.entries(grouped).sort((a, b) => a[1].catName.localeCompare(b[1].catName));
    return { grouped: grouped_entries, categories: allCategories };
  }, [searchQuery]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading products...</p>
      </div>
    );
  }

  const { grouped, categories } = data;

  return (
    <div className="space-y-4 pb-24">
      {/* Title row with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Products Master Catalog</h2>
          <p className="text-xs text-gray-500">View and track historical prices of grocery items</p>
        </div>
        <button
          onClick={() => setShowAddPanel(true)}
          className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center border border-gray-300 bg-white rounded-xl px-3.5 py-2.5 focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-600/10 transition-all shadow-2xs">
        <Search className="w-4.5 h-4.5 text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search products (e.g. Rice, পেঁয়াজ, alu)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-black placeholder-gray-400 font-semibold focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-0.5 text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Products list grouped by category */}
      {grouped.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center text-xs text-gray-500 font-medium">
          No matching products found.
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([catId, group]) => (
            <div key={catId} className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                {group.catName} <span className="text-3xs font-normal">({group.catBangla})</span>
              </h4>

              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
                {group.list.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.id}`}
                    className="flex justify-between items-center px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold text-gray-800 block">
                        {prod.banglaName ? (
                          <>{prod.banglaName}{' '}<span className="text-gray-400 font-normal">({prod.name})</span></>
                        ) : prod.name}
                      </span>
                      {prod.aliases && prod.aliases.length > 0 && (
                        <span className="text-3xs text-gray-400 block max-w-[280px] truncate">
                          Aliases: {prod.aliases.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-3xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                        {prod.defaultUnit || 'unit'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Product Bottom Sheet ── */}
      {showAddPanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={resetAddPanel}
          />

          {/* Panel */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90dvh] overflow-y-auto">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-4 pb-8 pt-2 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-green-600" />
                  Add New Product
                </h3>
                <button onClick={resetAddPanel} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* English & Bangla Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                    Product Name (English) *
                  </label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. Onion, Milk"
                    className="w-full border border-gray-300 text-black bg-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                    Bangla Name
                  </label>
                  <input
                    type="text"
                    value={newProdBangla}
                    onChange={(e) => setNewProdBangla(e.target.value)}
                    placeholder="e.g. পেঁয়াজ, দুধ"
                    className="w-full border border-gray-300 text-black bg-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
                  />
                </div>
              </div>

              {/* Category & Default Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-3xs font-bold text-green-600 hover:text-green-700"
                    >
                      {showAddCategory ? 'Cancel' : '+ New Category'}
                    </button>
                  </div>

                  {showAddCategory ? (
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <input
                        type="text"
                        placeholder="Category Name (e.g. Spices)"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600"
                      />
                      <input
                        type="text"
                        placeholder="Bangla Name (e.g. মশলা)"
                        value={newCatBangla}
                        onChange={(e) => setNewCatBangla(e.target.value)}
                        className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600"
                      />
                      <div className="flex justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setShowAddCategory(false)}
                          className="text-2xs px-2.5 py-1 border border-gray-200 rounded-md text-gray-500 bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="text-2xs px-2.5 py-1 bg-green-600 text-white rounded-md font-semibold"
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={newProdCatId}
                      onChange={(e) => setNewProdCatId(e.target.value)}
                      className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.banglaName ? ` (${c.banglaName})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                    Default Unit
                  </label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Aliases */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                  Search Aliases (Banglish / Synonyms)
                </label>

                {/* Tag Chips */}
                <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {newProdAliases.length === 0 ? (
                    <span className="text-3xs text-gray-400 italic">No aliases yet — add some below</span>
                  ) : (
                    newProdAliases.map((alias) => (
                      <span
                        key={alias}
                        className="inline-flex items-center space-x-1 text-2xs bg-white text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md font-medium shadow-2xs"
                      >
                        <span>{alias}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAliasTag(alias)}
                          className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Alias Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newAliasInput}
                    onChange={(e) => setNewAliasInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAliasTag();
                      }
                    }}
                    placeholder="Type an alias (e.g. pey, piaz, onion) and press Add"
                    className="flex-1 border border-gray-300 text-black bg-white placeholder-gray-400 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-medium shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddAliasTag}
                    disabled={!newAliasInput.trim()}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetAddPanel}
                  className="flex-1 text-sm font-semibold text-gray-600 bg-white border border-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center space-x-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Saving…' : 'Save Product'}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
