import React, { useState, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import { mockProducts, type Product } from '../mockData';
import { useAppStore } from '../store/useAppStore';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'cleaning', label: '清洁' },
  { id: 'storage', label: '收纳' },
  { id: 'textile', label: '家纺' },
  { id: 'hanging', label: '挂钩' },
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
        {filteredProducts.map((product) => {
          const isHanging = product.displayType === 'hanging';
          return (
            <div
              key={product.id}
              draggable
              onDragStart={(e) => handleDragStart(e, product)}
              onDragEnd={handleDragEnd}
              className={`group bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all flex gap-3 items-center ${
                isHanging 
                  ? 'border-purple-300 hover:border-purple-400 bg-purple-50/30' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-12 h-12 rounded-md flex-shrink-0 shadow-inner" style={{ backgroundColor: product.color }}>
                {/* Hook hole indicator for hanging products */}
                {isHanging && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-700 rounded-full border border-gray-900" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-medium truncate ${
                  isHanging ? 'text-purple-700 group-hover:text-purple-800' : 'text-gray-900 group-hover:text-blue-600'
                }`}>
                  {product.name}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {product.width} x {product.height} cm
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${
                    isHanging 
                      ? 'bg-purple-100 text-purple-700 font-semibold' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {product.category}
                  </span>
                  {isHanging && (
                    <span className="text-[10px] text-purple-600">🪝</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            未找到商品
          </div>
        )}
      </div>
    </div>
  );
};

