'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/db/localDb';
import { useSync } from '@/hooks/useSync';
import {
  ArrowLeft,
  TrendingUp,
  Tag,
  Check,
  Info,
  Edit2,
  Trash2,
  Plus,
  X,
  Save,
  ExternalLink,
} from 'lucide-react';

const COMMON_UNITS = [
  'kg',
  'gram',
  'liter',
  'ml',
  'piece',
  'dozen',
  'packet',
  'bottle',
  'box',
  'hali',
  'bundle',
];

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();
  const { triggerSync } = useSync();

  // Product Edit Mode State
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodBangla, setProdBangla] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [prodUnit, setProdUnit] = useState('kg');
  const [prodAliases, setProdAliases] = useState<string[]>([]);
  const [newAliasInput, setNewAliasInput] = useState('');

  // Inline Category Creation State
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBangla, setNewCatBangla] = useState('');

  // Add New Purchase Record State
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecordDate, setNewRecordDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newRecordMarketId, setNewRecordMarketId] = useState<string>('');
  const [newRecordQty, setNewRecordQty] = useState<number | ''>('');
  const [newRecordUnit, setNewRecordUnit] = useState<string>('kg');
  const [newRecordUnitPrice, setNewRecordUnitPrice] = useState<number | ''>('');
  const [newRecordTotalPrice, setNewRecordTotalPrice] = useState<number | ''>('');

  // Inline Market Creation for Add Record
  const [showAddMarketInNewRecord, setShowAddMarketInNewRecord] = useState(false);
  const [newMarketNameInNewRecord, setNewMarketNameInNewRecord] = useState('');

  // Record Inline Edit State
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editRecordDate, setEditRecordDate] = useState<string>('');
  const [editRecordMarketId, setEditRecordMarketId] = useState<string>('');
  const [editRecordQty, setEditRecordQty] = useState<number | ''>('');
  const [editRecordUnit, setEditRecordUnit] = useState<string>('kg');
  const [editRecordUnitPrice, setEditRecordUnitPrice] = useState<number | ''>('');
  const [editRecordTotalPrice, setEditRecordTotalPrice] = useState<number | ''>('');
  const [showAddMarketInEditRecord, setShowAddMarketInEditRecord] = useState(false);
  const [newMarketNameInEditRecord, setNewMarketNameInEditRecord] = useState('');

  // Live Query
  const data = useLiveQuery(async () => {
    const product = await localDb.products.get(productId);
    if (!product || product.deleted === 1) return null;

    const category = await localDb.categories.get(product.categoryId);
    const allCategories = await localDb.categories.where('deleted').equals(0).toArray();
    const allMarkets = await localDb.markets.where('deleted').equals(0).toArray();

    const aliases = await localDb.productAliases.where('productId').equals(productId).toArray();
    const activeAliases = aliases.filter(a => a.deleted === 0).map(a => a.alias);

    // Get shopping items referencing this product
    const items = await localDb.shoppingItems
      .where('productId')
      .equals(productId)
      .toArray();

    const activeItems = items.filter(i => i.deleted === 0);

    // Fetch sessions associated with these items
    const sessions = await localDb.shoppingSessions.where('deleted').equals(0).toArray();
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    const marketMap = new Map(allMarkets.map(m => [m.id, m.name]));

    // Build history list
    const historyList = activeItems
      .map((item) => {
        const session = sessionMap.get(item.sessionId);
        // Home page style market name resolution
        const marketName = session?.marketId
          ? (marketMap.get(session.marketId) || session?.notes?.trim() || 'No Notes')
          : (session?.notes?.trim() || 'No Notes');

        return {
          itemId: item.id,
          sessionId: item.sessionId,
          date: session ? session.date : new Date(),
          marketId: session ? session.marketId : null,
          marketName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate statistics
    if (historyList.length === 0) {
      return {
        product,
        category,
        categories: allCategories,
        markets: allMarkets,
        aliases: activeAliases,
        historyList: [],
        stats: null,
      };
    }

    const prices = historyList.map(h => h.unitPrice);
    const latestPrice = historyList[0].unitPrice;
    const latestUnit = historyList[0].unit;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = Number((prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(2));

    return {
      product,
      category,
      categories: allCategories,
      markets: allMarkets,
      aliases: activeAliases,
      historyList,
      stats: {
        latestPrice,
        latestUnit,
        lowestPrice,
        highestPrice,
        averagePrice,
        count: historyList.length,
      },
    };
  }, [productId]);

  // Sync add-record unit default when product data is ready
  useEffect(() => {
    if (data?.product?.defaultUnit) {
      setNewRecordUnit(data.product.defaultUnit);
    }
  }, [data?.product?.defaultUnit]);

  // Handle Product Edit Start
  const handleStartEditingProduct = () => {
    if (!data?.product) return;
    setProdName(data.product.name);
    setProdBangla(data.product.banglaName || '');
    setProdCatId(data.product.categoryId);
    setProdUnit(data.product.defaultUnit || 'kg');
    setProdAliases([...data.aliases]);
    setNewAliasInput('');
    setIsEditingProduct(true);
  };

  // Add Alias Tag
  const handleAddAliasTag = () => {
    const trimmed = newAliasInput.trim().toLowerCase();
    if (trimmed && !prodAliases.includes(trimmed)) {
      setProdAliases([...prodAliases, trimmed]);
      setNewAliasInput('');
    }
  };

  // Remove Alias Tag
  const handleRemoveAliasTag = (aliasToRemove: string) => {
    setProdAliases(prodAliases.filter(a => a !== aliasToRemove));
  };

  // Create Inline Category
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
      setProdCatId(id);
      setNewCatName('');
      setNewCatBangla('');
      setShowAddCategory(false);
      triggerSync();
    } catch (err) {
      alert('Failed to create category or category already exists.');
    }
  };

  // Save Product Changes
  const handleSaveProduct = async () => {
    if (!prodName.trim()) {
      alert('Product name is required.');
      return;
    }
    if (!prodCatId) {
      alert('Please select a category.');
      return;
    }

    try {
      await localDb.transaction('rw', [localDb.products, localDb.productAliases], async () => {
        // 1. Update product
        await localDb.products.update(productId, {
          name: prodName.trim(),
          banglaName: prodBangla.trim() || null,
          categoryId: prodCatId,
          defaultUnit: prodUnit,
          updatedAt: new Date(),
          synced: 0,
        });

        // 2. Manage aliases
        const currentDbAliases = await localDb.productAliases.where('productId').equals(productId).toArray();
        const currentActiveAliases = currentDbAliases.filter(a => a.deleted === 0);

        // Soft delete removed aliases
        for (const cur of currentActiveAliases) {
          if (!prodAliases.includes(cur.alias.toLowerCase())) {
            await localDb.productAliases.update(cur.id, {
              deleted: 1,
              synced: 0,
              updatedAt: new Date(),
            });
          }
        }

        // Add or restore added aliases
        for (const aliasStr of prodAliases) {
          const normalized = aliasStr.trim().toLowerCase();
          const existingRecord = currentDbAliases.find(a => a.alias.toLowerCase() === normalized);
          if (existingRecord) {
            if (existingRecord.deleted === 1) {
              await localDb.productAliases.update(existingRecord.id, {
                deleted: 0,
                synced: 0,
                updatedAt: new Date(),
              });
            }
          } else {
            await localDb.productAliases.put({
              id: crypto.randomUUID(),
              productId,
              alias: normalized,
              createdAt: new Date(),
              updatedAt: new Date(),
              synced: 0,
              deleted: 0,
            });
          }
        }
      });

      setIsEditingProduct(false);
      triggerSync();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product changes.');
    }
  };

  // Delete Entire Product
  const handleDeleteProduct = async () => {
    if (!data?.product) return;
    if (!confirm(`Are you sure you want to delete "${data.product.name}"? This product will be removed from your catalog.`)) {
      return;
    }

    try {
      await localDb.transaction('rw', [localDb.products, localDb.productAliases], async () => {
        await localDb.products.update(productId, {
          deleted: 1,
          synced: 0,
          updatedAt: new Date(),
        });
        const currentDbAliases = await localDb.productAliases.where('productId').equals(productId).toArray();
        for (const a of currentDbAliases) {
          await localDb.productAliases.update(a.id, {
            deleted: 1,
            synced: 0,
            updatedAt: new Date(),
          });
        }
      });

      triggerSync();
      router.push('/products');
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product.');
    }
  };

  // --- Purchase Record Inline Editing ---
  const handleStartEditingRecord = (record: any) => {
    setEditingRecordId(record.itemId);
    setEditRecordDate(new Date(record.date).toISOString().split('T')[0]);
    setEditRecordMarketId(record.marketId || '');
    setEditRecordQty(record.quantity);
    setEditRecordUnit(record.unit);
    setEditRecordUnitPrice(record.unitPrice);
    setEditRecordTotalPrice(record.totalPrice);
    setShowAddMarketInEditRecord(false);
  };

  const handleEditRecordQtyChange = (val: number | '') => {
    setEditRecordQty(val);
    if (val !== '' && Number(val) > 0) {
      if (editRecordUnitPrice !== '' && Number(editRecordUnitPrice) >= 0) {
        setEditRecordTotalPrice(Number((Number(val) * Number(editRecordUnitPrice)).toFixed(2)));
      } else if (editRecordTotalPrice !== '' && Number(editRecordTotalPrice) > 0) {
        setEditRecordUnitPrice(Number((Number(editRecordTotalPrice) / Number(val)).toFixed(2)));
      }
    }
  };

  const handleEditRecordUnitPriceChange = (val: number | '') => {
    setEditRecordUnitPrice(val);
    if (val !== '' && Number(val) >= 0) {
      const q = editRecordQty !== '' && Number(editRecordQty) > 0 ? Number(editRecordQty) : 1;
      if (editRecordQty === '' || Number(editRecordQty) <= 0) {
        setEditRecordQty(1);
      }
      setEditRecordTotalPrice(Number((q * Number(val)).toFixed(2)));
    } else if (val === '') {
      setEditRecordTotalPrice('');
    }
  };

  const handleEditRecordTotalPriceChange = (val: number | '') => {
    setEditRecordTotalPrice(val);
    if (val !== '' && Number(val) >= 0) {
      const q = editRecordQty !== '' && Number(editRecordQty) > 0 ? Number(editRecordQty) : 1;
      if (editRecordQty === '' || Number(editRecordQty) <= 0) {
        setEditRecordQty(1);
      }
      setEditRecordUnitPrice(Number((Number(val) / q).toFixed(2)));
    } else if (val === '') {
      setEditRecordUnitPrice('');
    }
  };

  const handleCreateMarketInEditRecord = async () => {
    if (!newMarketNameInEditRecord.trim()) return;
    try {
      const id = crypto.randomUUID();
      await localDb.markets.put({
        id,
        name: newMarketNameInEditRecord.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });
      setEditRecordMarketId(id);
      setNewMarketNameInEditRecord('');
      setShowAddMarketInEditRecord(false);
      triggerSync();
    } catch (err) {
      alert('Failed to create market.');
    }
  };

  const handleSaveEditedRecord = async (record: any) => {
    let effectiveQty = editRecordQty !== '' ? Number(editRecordQty) : 1;
    let effectiveUnitPrice = editRecordUnitPrice !== '' ? Number(editRecordUnitPrice) : 0;
    let effectiveTotalPrice = editRecordTotalPrice !== '' ? Number(editRecordTotalPrice) : 0;

    if (effectiveTotalPrice > 0) {
      if (effectiveQty <= 0) effectiveQty = 1;
      if (effectiveUnitPrice <= 0) {
        effectiveUnitPrice = Number((effectiveTotalPrice / effectiveQty).toFixed(2));
      }
    } else if (effectiveUnitPrice > 0 && effectiveQty > 0) {
      effectiveTotalPrice = Number((effectiveQty * effectiveUnitPrice).toFixed(2));
    }

    if (effectiveQty <= 0 || effectiveTotalPrice <= 0) {
      alert('Please enter a valid price or quantity.');
      return;
    }

    try {
      await localDb.transaction('rw', [localDb.shoppingItems, localDb.shoppingSessions], async () => {
        // 1. Update item
        await localDb.shoppingItems.update(record.itemId, {
          quantity: effectiveQty,
          unit: editRecordUnit,
          unitPrice: effectiveUnitPrice,
          totalPrice: effectiveTotalPrice,
          updatedAt: new Date(),
          synced: 0,
        });

        // 2. Update session date & market
        await localDb.shoppingSessions.update(record.sessionId, {
          date: new Date(editRecordDate),
          marketId: editRecordMarketId || null,
          updatedAt: new Date(),
          synced: 0,
        });

        // 3. Recalculate session total
        const sessionItems = await localDb.shoppingItems.where('sessionId').equals(record.sessionId).toArray();
        const activeItems = sessionItems.filter(i => i.deleted === 0);
        const newSessionTotal = activeItems.reduce((acc, item) => {
          if (item.id === record.itemId) return acc + effectiveTotalPrice;
          return acc + item.totalPrice;
        }, 0);

        await localDb.shoppingSessions.update(record.sessionId, {
          total: Number(newSessionTotal.toFixed(2)),
          updatedAt: new Date(),
          synced: 0,
        });
      });

      setEditingRecordId(null);
      triggerSync();
    } catch (err) {
      console.error('Failed to update record:', err);
      alert('Failed to update purchase record.');
    }
  };

  const handleDeleteRecord = async (record: any) => {
    if (!confirm(`Are you sure you want to delete this purchase record (${record.quantity} ${record.unit} from ${record.marketName})?`)) {
      return;
    }

    try {
      await localDb.transaction('rw', [localDb.shoppingItems, localDb.shoppingSessions], async () => {
        await localDb.shoppingItems.update(record.itemId, {
          deleted: 1,
          synced: 0,
          updatedAt: new Date(),
        });

        const sessionItems = await localDb.shoppingItems.where('sessionId').equals(record.sessionId).toArray();
        const remainingItems = sessionItems.filter(i => i.deleted === 0 && i.id !== record.itemId);

        if (remainingItems.length === 0) {
          await localDb.shoppingSessions.update(record.sessionId, {
            deleted: 1,
            total: 0,
            synced: 0,
            updatedAt: new Date(),
          });
        } else {
          const newTotal = remainingItems.reduce((sum, i) => sum + i.totalPrice, 0);
          await localDb.shoppingSessions.update(record.sessionId, {
            total: Number(newTotal.toFixed(2)),
            synced: 0,
            updatedAt: new Date(),
          });
        }
      });

      triggerSync();
    } catch (err) {
      console.error('Failed to delete purchase record:', err);
      alert('Failed to delete purchase record.');
    }
  };

  // --- Add New Record Directly ---
  const handleNewRecordQtyChange = (val: number | '') => {
    setNewRecordQty(val);
    if (val !== '' && Number(val) > 0) {
      if (newRecordUnitPrice !== '' && Number(newRecordUnitPrice) >= 0) {
        setNewRecordTotalPrice(Number((Number(val) * Number(newRecordUnitPrice)).toFixed(2)));
      } else if (newRecordTotalPrice !== '' && Number(newRecordTotalPrice) > 0) {
        setNewRecordUnitPrice(Number((Number(newRecordTotalPrice) / Number(val)).toFixed(2)));
      }
    }
  };

  const handleNewRecordUnitPriceChange = (val: number | '') => {
    setNewRecordUnitPrice(val);
    if (val !== '' && Number(val) >= 0) {
      const q = newRecordQty !== '' && Number(newRecordQty) > 0 ? Number(newRecordQty) : 1;
      if (newRecordQty === '' || Number(newRecordQty) <= 0) {
        setNewRecordQty(1);
      }
      setNewRecordTotalPrice(Number((q * Number(val)).toFixed(2)));
    } else if (val === '') {
      setNewRecordTotalPrice('');
    }
  };

  const handleNewRecordTotalPriceChange = (val: number | '') => {
    setNewRecordTotalPrice(val);
    if (val !== '' && Number(val) >= 0) {
      const q = newRecordQty !== '' && Number(newRecordQty) > 0 ? Number(newRecordQty) : 1;
      if (newRecordQty === '' || Number(newRecordQty) <= 0) {
        setNewRecordQty(1);
      }
      setNewRecordUnitPrice(Number((Number(val) / q).toFixed(2)));
    } else if (val === '') {
      setNewRecordUnitPrice('');
    }
  };

  const handleCreateMarketInNewRecord = async () => {
    if (!newMarketNameInNewRecord.trim()) return;
    try {
      const id = crypto.randomUUID();
      await localDb.markets.put({
        id,
        name: newMarketNameInNewRecord.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });
      setNewRecordMarketId(id);
      setNewMarketNameInNewRecord('');
      setShowAddMarketInNewRecord(false);
      triggerSync();
    } catch (err) {
      alert('Failed to create market.');
    }
  };

  const handleCreateNewRecord = async () => {
    let effectiveQty = newRecordQty !== '' ? Number(newRecordQty) : 1;
    let effectiveUnitPrice = newRecordUnitPrice !== '' ? Number(newRecordUnitPrice) : 0;
    let effectiveTotalPrice = newRecordTotalPrice !== '' ? Number(newRecordTotalPrice) : 0;

    if (effectiveTotalPrice > 0) {
      if (effectiveQty <= 0) effectiveQty = 1;
      if (effectiveUnitPrice <= 0) {
        effectiveUnitPrice = Number((effectiveTotalPrice / effectiveQty).toFixed(2));
      }
    } else if (effectiveUnitPrice > 0 && effectiveQty > 0) {
      effectiveTotalPrice = Number((effectiveQty * effectiveUnitPrice).toFixed(2));
    }

    if (effectiveQty <= 0 || effectiveTotalPrice <= 0) {
      alert('Please enter a valid price or quantity.');
      return;
    }

    const finalTotal = effectiveTotalPrice;
    const newSessionId = crypto.randomUUID();
    const newItemId = crypto.randomUUID();

    try {
      await localDb.transaction('rw', [localDb.shoppingSessions, localDb.shoppingItems], async () => {
        await localDb.shoppingSessions.put({
          id: newSessionId,
          date: new Date(newRecordDate),
          marketId: newRecordMarketId || null,
          notes: null,
          total: finalTotal,
          createdAt: new Date(),
          updatedAt: new Date(),
          synced: 0,
          deleted: 0,
        });

        await localDb.shoppingItems.put({
          id: newItemId,
          sessionId: newSessionId,
          productId,
          quantity: Number(newRecordQty),
          unit: newRecordUnit,
          unitPrice: Number(newRecordUnitPrice),
          totalPrice: finalTotal,
          createdAt: new Date(),
          updatedAt: new Date(),
          synced: 0,
          deleted: 0,
        });
      });

      setShowAddRecord(false);
      setNewRecordQty('');
      setNewRecordUnitPrice('');
      setNewRecordTotalPrice('');
      triggerSync();
    } catch (err) {
      console.error('Failed to create purchase record:', err);
      alert('Failed to create purchase record.');
    }
  };

  if (data === null) {
    return (
      <div className="bg-red-50 p-4 rounded-xl text-center space-y-3">
        <Info className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 font-medium">Product not found.</p>
        <button onClick={() => router.back()} className="text-xs font-semibold text-red-600 underline">
          Go Back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading product details...</p>
      </div>
    );
  }

  const { product, category, categories, markets, aliases, historyList, stats } = data;

  return (
    <div className="space-y-5 pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-semibold">Back</span>
        </button>

        {!isEditingProduct && (
          <button
            onClick={handleStartEditingProduct}
            className="flex items-center space-x-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 transition-colors shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Product</span>
          </button>
        )}
      </div>

      {/* Product Details / Edit Card */}
      {isEditingProduct ? (
        <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-green-600" />
              Edit Product Details
            </h3>
            <button
              onClick={() => setIsEditingProduct(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* English & Bangla Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                  Product Name (English) *
                </label>
                <input
                  type="text"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
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
                  value={prodBangla}
                  onChange={(e) => setProdBangla(e.target.value)}
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
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2 mt-1">
                    <input
                      type="text"
                      placeholder="Category Name (e.g. Spices)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                    <input
                      type="text"
                      placeholder="Bangla Name (e.g. মশলা)"
                      value={newCatBangla}
                      onChange={(e) => setNewCatBangla(e.target.value)}
                      className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium"
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
                    value={prodCatId}
                    onChange={(e) => setProdCatId(e.target.value)}
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.banglaName ? `(${c.banglaName})` : ''}
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
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  className="w-full border border-gray-300 text-black bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/10 focus:border-green-600 transition-all font-semibold shadow-2xs"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Aliases / Tags */}
            <div className="flex flex-col space-y-1.5 pt-1">
              <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                Search Aliases (Banglish / Synonyms)
              </label>

              {/* Tag Chips */}
              <div className="flex flex-wrap gap-1.5 min-h-[30px] p-2 bg-gray-50 rounded-lg border border-gray-200">
                {prodAliases.length === 0 ? (
                  <span className="text-3xs text-gray-400 italic">No search aliases configured</span>
                ) : (
                  prodAliases.map((alias) => (
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

              {/* Add Alias Input */}
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
                  placeholder="Type an alias (e.g. pey, piaz, piyaz) and press Add"
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
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDeleteProduct}
                className="flex items-center space-x-1 text-2xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Product</span>
              </button>

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="text-xs font-semibold text-gray-600 bg-white border border-gray-300 px-3.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{product.banglaName || product.name}</h2>
              {product.banglaName && (
                <h3 className="text-sm text-gray-500 font-medium">{product.name}</h3>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs bg-green-50 text-green-700 font-semibold px-2.5 py-1 rounded-full border border-green-100">
                {category?.name || 'Category'}
              </span>
              <span className="text-3xs text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                Unit: {product.defaultUnit || 'kg'}
              </span>
            </div>
          </div>

          {aliases.length > 0 && (
            <div className="flex items-center space-x-1.5 flex-wrap pt-1">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-3xs text-gray-400 font-bold uppercase tracking-wider mr-1">
                Search terms:
              </span>
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="text-3xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium"
                >
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Statistics Grid */}
      {stats ? (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">
              Latest Price
            </span>
            <span className="text-2xl font-extrabold text-green-600 block">
              ৳{stats.latestPrice}{' '}
              <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">
              Average Price
            </span>
            <span className="text-2xl font-extrabold text-gray-800 block">
              ৳{stats.averagePrice}{' '}
              <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">
              Lowest Price
            </span>
            <span className="text-lg font-extrabold text-gray-800 block">
              ৳{stats.lowestPrice}{' '}
              <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1">
            <span className="text-3xs font-bold text-gray-400 uppercase tracking-wider block">
              Highest Price
            </span>
            <span className="text-lg font-extrabold text-gray-800 block">
              ৳{stats.highestPrice}{' '}
              <span className="text-xs font-medium text-gray-400">/ {stats.latestUnit}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl p-6 text-center shadow-2xs">
          <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">
            No purchase history recorded for this product yet.
          </p>
        </div>
      )}

      {/* Historical Purchases Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Purchase Price History ({historyList.length} records)
          </h4>

          <button
            onClick={() => setShowAddRecord(!showAddRecord)}
            className="flex items-center space-x-1 text-2xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg border border-green-200 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showAddRecord ? 'Cancel' : 'Add Record'}</span>
          </button>
        </div>

        {/* Add Record Form */}
        {showAddRecord && (
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm space-y-3 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-gray-800">Add Historical Purchase</span>
              <button
                onClick={() => setShowAddRecord(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Date */}
              <div className="flex flex-col space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                  Date
                </label>
                <input
                  type="date"
                  value={newRecordDate}
                  onChange={(e) => setNewRecordDate(e.target.value)}
                  className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium"
                />
              </div>

              {/* Market */}
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                    Bazar / Market
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddMarketInNewRecord(!showAddMarketInNewRecord)}
                    className="text-3xs font-bold text-green-600"
                  >
                    {showAddMarketInNewRecord ? 'Cancel' : '+ New Bazar'}
                  </button>
                </div>

                {showAddMarketInNewRecord ? (
                  <div className="flex space-x-1.5 mt-0.5">
                    <input
                      type="text"
                      placeholder="Market name"
                      value={newMarketNameInNewRecord}
                      onChange={(e) => setNewMarketNameInNewRecord(e.target.value)}
                      className="flex-1 border border-gray-300 text-black bg-white rounded-lg px-2 py-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateMarketInNewRecord}
                      className="bg-green-600 text-white text-2xs px-2.5 py-1 rounded-lg font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <select
                    value={newRecordMarketId}
                    onChange={(e) => setNewRecordMarketId(e.target.value)}
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  >
                    <option value="">Select Bazar</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity & Unit */}
              <div className="flex flex-col space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                  Quantity & Unit
                </label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    step="any"
                    placeholder="Qty"
                    value={newRecordQty}
                    onChange={(e) =>
                      handleNewRecordQtyChange(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="flex-1 border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  />
                  <select
                    value={newRecordUnit}
                    onChange={(e) => setNewRecordUnit(e.target.value)}
                    className="w-24 border border-gray-300 text-black bg-white rounded-lg px-2 py-1.5 text-xs font-medium"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit Price & Total Price */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                    Unit Price (৳)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 80"
                    value={newRecordUnitPrice}
                    onChange={(e) =>
                      handleNewRecordUnitPriceChange(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                    Total (৳)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Total"
                    value={newRecordTotalPrice}
                    onChange={(e) =>
                      handleNewRecordTotalPriceChange(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowAddRecord(false)}
                className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewRecord}
                className="text-xs font-semibold text-white bg-green-600 rounded-lg px-4 py-1.5 hover:bg-green-700 shadow-2xs"
              >
                Save Record
              </button>
            </div>
          </div>
        )}

        {/* Purchases List */}
        {historyList.length > 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
            {historyList.map((record) => {
              const isEditingThisRecord = editingRecordId === record.itemId;

              if (isEditingThisRecord) {
                return (
                  <div key={record.itemId} className="p-4 bg-green-50/20 space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-1.5">
                      <span className="text-xs font-bold text-gray-800">Edit Purchase Record</span>
                      <button
                        onClick={() => setEditingRecordId(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Date */}
                      <div className="flex flex-col space-y-1">
                        <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                          Date
                        </label>
                        <input
                          type="date"
                          value={editRecordDate}
                          onChange={(e) => setEditRecordDate(e.target.value)}
                          className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium"
                        />
                      </div>

                      {/* Market */}
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                            Bazar / Market
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddMarketInEditRecord(!showAddMarketInEditRecord)
                            }
                            className="text-3xs font-bold text-green-600"
                          >
                            {showAddMarketInEditRecord ? 'Cancel' : '+ New Bazar'}
                          </button>
                        </div>

                        {showAddMarketInEditRecord ? (
                          <div className="flex space-x-1.5 mt-0.5">
                            <input
                              type="text"
                              placeholder="Market name"
                              value={newMarketNameInEditRecord}
                              onChange={(e) => setNewMarketNameInEditRecord(e.target.value)}
                              className="flex-1 border border-gray-300 text-black bg-white rounded-lg px-2 py-1 text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleCreateMarketInEditRecord}
                              className="bg-green-600 text-white text-2xs px-2.5 py-1 rounded-lg font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <select
                            value={editRecordMarketId}
                            onChange={(e) => setEditRecordMarketId(e.target.value)}
                            className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium"
                          >
                            <option value="">Select Bazar</option>
                            {markets.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Quantity & Unit */}
                      <div className="flex flex-col space-y-1">
                        <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                          Quantity & Unit
                        </label>
                        <div className="flex space-x-1.5">
                          <input
                            type="number"
                            step="any"
                            value={editRecordQty}
                            onChange={(e) =>
                              handleEditRecordQtyChange(
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className="flex-1 border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                          />
                          <select
                            value={editRecordUnit}
                            onChange={(e) => setEditRecordUnit(e.target.value)}
                            className="w-24 border border-gray-300 text-black bg-white rounded-lg px-2 py-1.5 text-xs font-medium"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Unit Price & Total */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col space-y-1">
                          <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                            Unit Price (৳)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editRecordUnitPrice}
                            onChange={(e) =>
                              handleEditRecordUnitPriceChange(
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">
                            Total (৳)
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={editRecordTotalPrice}
                            onChange={(e) =>
                              handleEditRecordTotalPriceChange(
                                e.target.value === '' ? '' : Number(e.target.value)
                              )
                            }
                            className="w-full border border-gray-300 text-black bg-white rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setEditingRecordId(null)}
                        className="text-2xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditedRecord(record)}
                        className="text-2xs font-semibold text-white bg-green-600 rounded-lg px-3.5 py-1.5 hover:bg-green-700 shadow-2xs"
                      >
                        Save Record
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={record.itemId}
                  className="flex justify-between items-center px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-bold text-gray-800 block leading-tight">
                        {new Date(record.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <Link
                        href={`/market/${record.sessionId}`}
                        title="Open full shopping session"
                        className="text-gray-400 hover:text-green-600 transition-colors p-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <span className="text-gray-400 block" style={{ fontSize: '11px' }}>
                      {record.marketName} • Qty: {record.quantity} {record.unit}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-gray-900 block leading-tight">
                        ৳{record.unitPrice}{' '}
                        <span className="text-3xs font-medium text-gray-400">/ {record.unit}</span>
                      </span>
                      <span className="text-3xs text-gray-400 block font-medium">
                        Total: ৳{record.totalPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center space-x-0.5 border-l border-gray-100 pl-2">
                      <button
                        onClick={() => handleStartEditingRecord(record)}
                        title="Edit Record"
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record)}
                        title="Delete Record"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
