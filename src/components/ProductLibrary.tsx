import React, { useState, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import { mockProducts, type Product } from '../mockData';
import { useAppStore } from '../store/useAppStore';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'cleaning', label: '清洁' },
  { id: 'storage', label: '收纳' },
  { id: 'textile', label: '家纺' },
] as const;

export const ProductLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { setDraggedProduct } = useAppStore();

  const filteredProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    // Set data for HTML5 drag (legacy/compatibility)
    e.dataTransfer.setData('application/json', JSON.stringify(product));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Update Zustand store
    setDraggedProduct(product);
    
    // Create a custom drag image (optional but nice)
    // e.dataTransfer.setDragImage(e.currentTarget as Element, 0, 0);
  };

  const handleDragEnd = () => {
    setDraggedProduct(null);
  };

  return (
    <div className="w-[300px] bg-white border-l border-gray-200 h-full flex flex-col shadow-sm z-10">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <Package className="w-5 h-5 text-gray-600" />
        <h2 className="font-semibold text-gray-800">商品库</h2>
      </div>

      {/* Search Bar */}
      <div className="p-4 pb-2">
        <div className="relative">
          <input
            type="text"
            placeholder="搜索商品名称/SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            draggable
            onDragStart={(e) => handleDragStart(e, product)}
            onDragEnd={handleDragEnd}
            className="group bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 transition-all flex gap-3 items-center"
          >
            {/* Thumbnail */}
            <div
              className="w-12 h-12 rounded-md flex-shrink-0 shadow-inner"
              style={{ backgroundColor: product.color }}
            />
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                {product.name}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {product.width} x {product.height} cm
              </p>
              <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded">
                {product.category}
              </span>
            </div>
          </div>
        ))}
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            未找到商品
          </div>
        )}
      </div>
    </div>
  );
};

