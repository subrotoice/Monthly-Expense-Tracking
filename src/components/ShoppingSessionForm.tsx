'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, type LocalShoppingSession, type LocalShoppingItem, type LocalProduct, type LocalMarket, type LocalCategory } from '@/db/localDb';
import { searchProducts, type SearchResultProduct } from '@/lib/searchHelper';
import { ArrowLeft, Plus, Trash2, Edit2, Search, Check, AlertCircle, Save } from 'lucide-react';
import { useSync } from '@/hooks/useSync';

interface ShoppingSessionFormProps {
  sessionId?: string; // If provided, we are editing
}

export default function ShoppingSessionForm({ sessionId }: ShoppingSessionFormProps) {
  const router = useRouter();
  const { triggerSync } = useSync();

  // Mode states
  const isEdit = !!sessionId;
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  // Form states (Session level)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [marketId, setMarketId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [itemsList, setItemsList] = useState<Omit<LocalShoppingItem, 'synced' | 'deleted'>[]>([]);

  // Form states (Item input level)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SearchResultProduct | null>(null);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unit, setUnit] = useState('kg');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [totalPrice, setTotalPrice] = useState<number | ''>('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Previous price helper state
  const [prevPrice, setPrevPrice] = useState<{ price: number; unit: string } | null>(null);

  // Custom market inline creation state
  const [showAddMarket, setShowAddMarket] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');

  // Custom product inline creation state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdBangla, setNewProdBangla] = useState('');
  const [newProdCatId, setNewProdCatId] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('kg');
  const [newProdAliases, setNewProdAliases] = useState('');

  // Fetch initial data (markets, categories, products)
  const markets = useLiveQuery(() => localDb.markets.where('deleted').equals(0).toArray()) || [];
  const categories = useLiveQuery(() => localDb.categories.where('deleted').equals(0).toArray()) || [];
  const products = useLiveQuery(() => localDb.products.where('deleted').equals(0).toArray()) || [];

  // Load existing session for editing
  useEffect(() => {
    if (isEdit && sessionId) {
      const loadSession = async () => {
        try {
          const session = await localDb.shoppingSessions.get(sessionId);
          if (!session || session.deleted === 1) {
            setError('Session not found.');
            setLoading(false);
            return;
          }
          setDate(new Date(session.date).toISOString().split('T')[0]);
          setMarketId(session.marketId || '');
          setNotes(session.notes || '');

          const items = await localDb.shoppingItems
            .where('sessionId')
            .equals(sessionId)
            .toArray();

          const activeItems = items.filter(item => item.deleted === 0);
          setItemsList(activeItems);
          setLoading(false);
        } catch (err) {
          setError('Failed to load session.');
          setLoading(false);
        }
      };
      loadSession();
    }
  }, [isEdit, sessionId]);

  // Handle product search
  useEffect(() => {
    const fetchResults = async () => {
      if (searchQuery.trim().length >= 2) {
        const results = await searchProducts(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    const timer = setTimeout(fetchResults, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Autofill unit and price based on selected product
  useEffect(() => {
    if (selectedProduct) {
      setUnit(selectedProduct.defaultUnit || 'kg');

      // Query previous recorded price for this product
      const getPreviousPrice = async () => {
        const pastItems = await localDb.shoppingItems
          .where('productId')
          .equals(selectedProduct.id)
          .toArray();

        // Filter active and sort by date/createdAt desc
        const sortedItems = pastItems
          .filter(i => i.deleted === 0)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        if (sortedItems.length > 0) {
          const lastItem = sortedItems[0];
          setPrevPrice({ price: lastItem.unitPrice, unit: lastItem.unit });
          setUnitPrice(lastItem.unitPrice);
        } else {
          setPrevPrice(null);
          setUnitPrice('');
        }
      };
      getPreviousPrice();
    } else {
      setPrevPrice(null);
    }
  }, [selectedProduct]);

  // Calculate total price if quantity or unit price changes
  useEffect(() => {
    if (quantity !== '' && unitPrice !== '') {
      setTotalPrice(Number((quantity * unitPrice).toFixed(2)));
    } else {
      setTotalPrice('');
    }
  }, [quantity, unitPrice]);

  // Handle unit price change when total price is changed manually
  const handleTotalPriceChange = (val: number | '') => {
    setTotalPrice(val);
    if (val !== '' && quantity !== '' && quantity > 0) {
      setUnitPrice(Number((val / quantity).toFixed(2)));
    }
  };

  // Add/Update item in list
  const handleAddToList = () => {
    if (!selectedProduct) return;
    if (quantity === '' || quantity <= 0) return;
    if (unitPrice === '' || unitPrice < 0) return;

    const newItem: Omit<LocalShoppingItem, 'synced' | 'deleted'> = {
      id: editingItemIndex !== null ? itemsList[editingItemIndex].id : crypto.randomUUID(),
      sessionId: sessionId || '',
      productId: selectedProduct.id,
      quantity: Number(quantity),
      unit,
      unitPrice: Number(unitPrice),
      totalPrice: Number((quantity * unitPrice).toFixed(2)),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (editingItemIndex !== null) {
      // Update
      const updatedList = [...itemsList];
      updatedList[editingItemIndex] = newItem;
      setItemsList(updatedList);
      setEditingItemIndex(null);
    } else {
      // Add
      setItemsList([...itemsList, newItem]);
    }

    // Reset input fields
    setSelectedProduct(null);
    setSearchQuery('');
    setQuantity('');
    setUnitPrice('');
    setTotalPrice('');
  };

  // Edit item inline
  const handleEditItem = async (index: number) => {
    const item = itemsList[index];
    const product = await localDb.products.get(item.productId);
    if (product) {
      const aliases = await localDb.productAliases.where('productId').equals(product.id).toArray();
      setSelectedProduct({
        ...product,
        aliases: aliases.map(a => a.alias),
      });
      setSearchQuery(product.name);
      setQuantity(item.quantity);
      setUnit(item.unit);
      setUnitPrice(item.unitPrice);
      setTotalPrice(item.totalPrice);
      setEditingItemIndex(index);
    }
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    const updatedList = [...itemsList];
    updatedList.splice(index, 1);
    setItemsList(updatedList);
    if (editingItemIndex === index) {
      setEditingItemIndex(null);
      setSelectedProduct(null);
      setSearchQuery('');
      setQuantity('');
      setUnitPrice('');
      setTotalPrice('');
    }
  };

  // Add Market Inline
  const handleCreateMarket = async () => {
    if (!newMarketName.trim()) return;
    try {
      const id = crypto.randomUUID();
      await localDb.markets.put({
        id,
        name: newMarketName.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });
      setMarketId(id);
      setNewMarketName('');
      setShowAddMarket(false);
      triggerSync();
    } catch (err) {
      alert('Market already exists or failed to create.');
    }
  };

  // Add Product Inline
  const handleCreateProduct = async () => {
    if (!newProdName.trim() || !newProdCatId) return;
    try {
      const pId = crypto.randomUUID();
      await localDb.products.put({
        id: pId,
        name: newProdName.trim(),
        banglaName: newProdBangla.trim() || null,
        categoryId: newProdCatId,
        defaultUnit: newProdUnit,
        createdAt: new Date(),
        updatedAt: new Date(),
        synced: 0,
        deleted: 0,
      });

      // Add aliases
      if (newProdAliases.trim()) {
        const aliasList = newProdAliases.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        for (const alias of aliasList) {
          await localDb.productAliases.put({
            id: crypto.randomUUID(),
            productId: pId,
            alias,
            createdAt: new Date(),
            updatedAt: new Date(),
            synced: 0,
            deleted: 0,
          });
        }
      }

      // Select it automatically
      const newlyCreated = await localDb.products.get(pId);
      if (newlyCreated) {
        setSelectedProduct({
          ...newlyCreated,
          aliases: newProdAliases.split(',').map(s => s.trim()),
        });
        setSearchQuery(newlyCreated.name);
      }

      // Reset product creator
      setNewProdName('');
      setNewProdBangla('');
      setNewProdCatId('');
      setNewProdUnit('kg');
      setNewProdAliases('');
      setShowAddProduct(false);
      triggerSync();
    } catch (err) {
      alert('Product creation failed. Please check inputs.');
    }
  };

  // Save full Shopping Session
  const handleSaveSession = async () => {
    if (itemsList.length === 0) {
      alert('Please add at least one item to save the session.');
      return;
    }

    const totalSessionCost = itemsList.reduce((acc, item) => acc + item.totalPrice, 0);
    const finalSessionId = isEdit && sessionId ? sessionId : crypto.randomUUID();

    try {
      await localDb.transaction('rw', [localDb.shoppingSessions, localDb.shoppingItems], async () => {
        // 1. Save Session
        await localDb.shoppingSessions.put({
          id: finalSessionId,
          date: new Date(date),
          marketId: marketId || null,
          notes: notes.trim() || null,
          total: totalSessionCost,
          createdAt: isEdit ? new Date() : new Date(), // Keep or set dates
          updatedAt: new Date(),
          synced: 0,
          deleted: 0,
        });

        // 2. Save Items
        if (isEdit) {
          // Soft delete old items that were removed
          const existingItems = await localDb.shoppingItems
            .where('sessionId')
            .equals(finalSessionId)
            .toArray();

          for (const extItem of existingItems) {
            const stillExists = itemsList.some(item => item.id === extItem.id);
            if (!stillExists) {
              await localDb.shoppingItems.update(extItem.id, {
                deleted: 1,
                synced: 0,
                updatedAt: new Date(),
              });
            }
          }
        }

        for (const item of itemsList) {
          await localDb.shoppingItems.put({
            id: item.id,
            sessionId: finalSessionId,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            createdAt: item.createdAt,
            updatedAt: new Date(),
            synced: 0,
            deleted: 0,
          });
        }
      });

      triggerSync();
      router.push('/');
    } catch (err) {
      console.error(err);
      alert('Failed to save session.');
    }
  };

  // Delete Session
  const handleDeleteSession = async () => {
    if (!confirm('Are you sure you want to delete this shopping session? This cannot be undone.')) return;
    if (!sessionId) return;

    try {
      await localDb.transaction('rw', [localDb.shoppingSessions, localDb.shoppingItems], async () => {
        await localDb.shoppingSessions.update(sessionId, {
          deleted: 1,
          synced: 0,
          updatedAt: new Date(),
        });

        const items = await localDb.shoppingItems
          .where('sessionId')
          .equals(sessionId)
          .toArray();

        for (const item of items) {
          await localDb.shoppingItems.update(item.id, {
            deleted: 1,
            synced: 0,
            updatedAt: new Date(),
          });
        }
      });

      triggerSync();
      router.push('/');
    } catch (err) {
      alert('Failed to delete session.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-xl text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button onClick={() => router.back()} className="text-xs font-semibold text-red-600 underline">
          Go Back
        </button>
      </div>
    );
  }

  const sessionTotal = itemsList.reduce((acc, item) => acc + item.totalPrice, 0);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-1" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Bazar Session' : 'Record Bazar Session'}</h2>
        {isEdit ? (
          <button
            onClick={handleDeleteSession}
            className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Delete
          </button>
        ) : (
          <div className="w-12"></div>
        )}
      </div>

      {/* Date & Market Settings */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-3">
        {/* Date picker */}
        <div className="flex flex-col space-y-1">
          <label className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
          />
        </div>

        {/* Market Select */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-2xs font-bold text-gray-400 uppercase tracking-wider">Bazar / Shop</label>
            <button
              onClick={() => setShowAddMarket(!showAddMarket)}
              className="text-3xs font-semibold text-green-600 flex items-center hover:underline"
            >
              <Plus className="w-2.5 h-2.5 mr-0.5" /> New Market
            </button>
          </div>

          {showAddMarket ? (
            <div className="flex space-x-2 mt-1">
              <input
                type="text"
                value={newMarketName}
                onChange={(e) => setNewMarketName(e.target.value)}
                placeholder="Market Name (e.g. Karwan Bazar)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-600"
              />
              <button
                onClick={handleCreateMarket}
                className="bg-green-600 text-white rounded-lg px-3 text-xs font-semibold hover:bg-green-700 transition-colors"
              >
                Create
              </button>
            </div>
          ) : (
            <select
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 bg-white"
            >
              <option value="">Select Market</option>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Item Input Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-3.5">
        <div className="flex justify-between items-center">
          <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider">
            {editingItemIndex !== null ? 'Edit Item' : 'Add Item'}
          </span>
          {editingItemIndex !== null && (
            <button
              onClick={() => {
                setEditingItemIndex(null);
                setSelectedProduct(null);
                setSearchQuery('');
                setQuantity('');
                setUnitPrice('');
                setTotalPrice('');
              }}
              className="text-3xs font-semibold text-gray-500 hover:underline"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Product Autocomplete Search */}
        <div className="relative">
          <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/50 focus-within:border-green-600">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search product (e.g. Potato, আলু, peyaj)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) setSelectedProduct(null);
              }}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>

          {/* Autocomplete items */}
          {searchQuery && !selectedProduct && (
            <div className="absolute left-0 right-0 z-50 bg-white border border-gray-100 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      setSelectedProduct(prod);
                      setSearchQuery(prod.name);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex justify-between items-center border-b border-gray-50"
                  >
                    <div>
                      <span className="font-semibold text-gray-800">{prod.name}</span>
                      {prod.banglaName && <span className="text-gray-400 ml-1">({prod.banglaName})</span>}
                    </div>
                    <span className="text-3xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {prod.categoryName}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center">
                  <p className="text-xs text-gray-400 mb-2">No product found</p>
                  <button
                    onClick={() => {
                      setNewProdName(searchQuery);
                      setShowAddProduct(true);
                    }}
                    className="text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors inline-block"
                  >
                    + Create &quot;{searchQuery}&quot;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Product Inline Drawer/Form */}
        {showAddProduct && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2.5">
            <h5 className="text-2xs font-bold text-gray-700">Create New Custom Product</h5>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="English Name"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="Bangla Name (Optional)"
                value={newProdBangla}
                onChange={(e) => setNewProdBangla(e.target.value)}
                className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newProdCatId}
                onChange={(e) => setNewProdCatId(e.target.value)}
                className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="">Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={newProdUnit}
                onChange={(e) => setNewProdUnit(e.target.value)}
                className="border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="kg">kg</option>
                <option value="gram">gram</option>
                <option value="liter">liter</option>
                <option value="milliliter">milliliter</option>
                <option value="piece">piece</option>
                <option value="dozen">dozen</option>
                <option value="packet">packet</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Search Aliases (comma separated, e.g. alu, aloo)"
              value={newProdAliases}
              onChange={(e) => setNewProdAliases(e.target.value)}
              className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            />
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => setShowAddProduct(false)}
                className="text-2xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProduct}
                className="text-2xs font-semibold text-white bg-green-600 rounded-lg px-3.5 py-1.5 hover:bg-green-700"
              >
                Create & Select
              </button>
            </div>
          </div>
        )}

        {/* Quantity, Unit, Price, Total Details */}
        {selectedProduct && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Previous Price Banner */}
            {prevPrice && (
              <div className="bg-green-50/50 border border-green-100/50 rounded-lg p-2.5 flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium">Last purchased price:</span>
                <span className="font-extrabold text-green-700">
                  ৳{prevPrice.price} / {prevPrice.unit}
                </span>
              </div>
            )}

            {/* Inputs Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Quantity</label>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 text-xs focus:outline-none bg-white font-medium"
                  >
                    <option value="kg">kg</option>
                    <option value="gram">g</option>
                    <option value="liter">liter</option>
                    <option value="ml">ml</option>
                    <option value="piece">piece</option>
                    <option value="dozen">dozen</option>
                    <option value="packet">packet</option>
                    <option value="bottle">bottle</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Unit Price (৳)</label>
                <input
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 70"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="flex flex-col space-y-1">
                <label className="text-3xs font-bold text-gray-400 uppercase tracking-wider">Total Price (৳)</label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => handleTotalPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 350"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600"
                />
              </div>

              <button
                onClick={handleAddToList}
                disabled={quantity === '' || unitPrice === ''}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors mt-5 flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{editingItemIndex !== null ? 'Update Item' : 'Add to List'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shopping Session List (Dynamic) */}
      <div className="space-y-3">
        <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider block">Bazar Items Added</span>

        {itemsList.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-xs text-gray-500 font-medium">
            Your shopping list is empty. Add products above.
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-2xs divide-y divide-gray-100">
            {itemsList.map((item, index) => {
              // Find matching product name in local state/database
              const matchingProd = products.find(p => p.id === item.productId);
              return (
                <div key={item.id} className="flex justify-between items-center p-4">
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-gray-800 block">
                      {matchingProd?.name || 'Product'}{' '}
                      {matchingProd?.banglaName && (
                        <span className="text-gray-400 font-normal">({matchingProd.banglaName})</span>
                      )}
                    </span>
                    <span className="text-3xs text-gray-500 block">
                      {item.quantity} {item.unit} × ৳{item.unitPrice}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-extrabold text-gray-900">৳{item.totalPrice.toLocaleString()}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditItem(index)}
                        className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                        title="Edit Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Total Row */}
            <div className="flex justify-between items-center p-4 bg-gray-50/50">
              <span className="text-sm font-bold text-gray-700">Total Bill</span>
              <span className="text-lg font-extrabold text-green-700">৳{sessionTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Optional Notes */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-2xs space-y-1.5">
        <label className="text-2xs font-bold text-gray-400 uppercase tracking-wider block">Session Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about the bazaar session (e.g. got discount, high inflation)..."
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-600 resize-none"
        />
      </div>

      {/* Main Save Action */}
      <button
        onClick={handleSaveSession}
        disabled={itemsList.length === 0}
        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 text-sm font-bold transition-all transform active:scale-95 shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:scale-100"
      >
        <Save className="w-4.5 h-4.5" />
        <span>Save Bazar Session</span>
      </button>
    </div>
  );
}
