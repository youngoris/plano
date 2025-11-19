import React, { useState } from 'react';
import { Settings, Ruler, Grid3X3, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ConfigPanel: React.FC = () => {
  const { 
    shelfConfig, 
    updateShelfConfig, 
    updateLayerPosition, 
    addLayer, 
    removeLayer,
    addUnit,
    removeUnit
  } = useAppStore();

  const [selectedUnitId, setSelectedUnitId] = useState<string>(shelfConfig.units[0]?.id || '');
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set([shelfConfig.units[0]?.id]));

  const selectedUnit = shelfConfig.units.find(u => u.id === selectedUnitId);

  const toggleUnitExpand = (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
    }
    setExpandedUnits(newExpanded);
  };

  return (
    <div className="w-[300px] bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="font-semibold text-gray-800">货架配置</h2>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Global Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">全局设置</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                单组宽度 (cm)
              </label>
              <input
                type="number"
                value={shelfConfig.totalWidth}
                onChange={(e) => updateShelfConfig({ totalWidth: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                总高度 (cm)
              </label>
              <input
                type="number"
                value={shelfConfig.totalHeight}
                onChange={(e) => updateShelfConfig({ totalHeight: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Unit Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              货架组管理
            </h3>
            <button
              onClick={() => addUnit()}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="添加货架组"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="space-y-2">
            {shelfConfig.units.map((unit, index) => {
              const isExpanded = expandedUnits.has(unit.id);
              const isSelected = selectedUnitId === unit.id;

              return (
                <div key={unit.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Unit Header */}
                  <div 
                    className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedUnitId(unit.id);
                      if (!isExpanded) {
                        toggleUnitExpand(unit.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUnitExpand(unit.id);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        )}
                      </button>
                      <span className="text-sm font-medium text-gray-900">
                        第 {index + 1} 组
                      </span>
                      <span className="text-xs text-gray-500">
                        ({unit.layers.length} 层)
                      </span>
                    </div>
                    {shelfConfig.units.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUnit(unit.id);
                          if (selectedUnitId === unit.id) {
                            setSelectedUnitId(shelfConfig.units[0]?.id || '');
                          }
                        }}
                        className="p-1 hover:bg-red-50 rounded transition-colors"
                        title="删除此货架组"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>

                  {/* Unit Layers (Expandable) */}
                  {isExpanded && (
                    <div className="p-3 pt-0 space-y-2 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">层板配置</span>
                        <button
                          onClick={() => addLayer(unit.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="添加层板"
                        >
                          <Plus className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>

                      {(() => {
                        // 按位置从高到低排序
                        const sortedLayers = [...unit.layers].sort((a, b) => b.yPosition - a.yPosition);
                        
                        return sortedLayers.map((layer, sortedIndex) => {
                          const isBase = layer.yPosition === 0;
                          const nextLayer = sortedLayers[sortedIndex + 1];
                          const gapHeight = nextLayer ? layer.yPosition - nextLayer.yPosition : null;
                          
                          return (
                            <div key={layer.id} className="space-y-1.5">
                              {/* Layer Item - Compact Design */}
                              <div className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-300 p-2.5 rounded-lg transition-colors group">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xs font-medium text-gray-700 min-w-[60px]">
                                    {isBase ? '底层' : `第 ${sortedLayers.length - sortedIndex - 1} 层`}
                                  </span>
                                  
                                  {/* Gap Height Input (Primary Control) */}
                                  {gapHeight !== null && (
                                    <div className="flex items-center gap-1.5 flex-1">
                                      <span className="text-xs text-gray-400">↕</span>
                                      <input
                                        type="number"
                                        min={5}
                                        max={shelfConfig.totalHeight}
                                        step={1}
                                        value={gapHeight}
                                        onChange={(e) => {
                                          const newGap = Number(e.target.value);
                                          const newUpperPosition = nextLayer.yPosition + newGap;
                                          if (newUpperPosition <= shelfConfig.totalHeight && newUpperPosition >= 0) {
                                            updateLayerPosition(unit.id, layer.id, newUpperPosition);
                                          }
                                        }}
                                        className="w-16 px-2 py-1 text-sm font-semibold text-center border border-blue-200 bg-blue-50 text-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                                      />
                                      <span className="text-xs text-gray-500">cm</span>
                                    </div>
                                  )}
                                  
                                  {isBase && (
                                    <span className="text-xs text-gray-400 italic">固定</span>
                                  )}
                                </div>

                                {!isBase && (
                                  <button
                                    onClick={() => removeLayer(unit.id, layer.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded transition-all"
                                    title="删除层板"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            💡 提示: 点击货架组可切换配置，每组可独立设置层板
          </div>
        </div>

        {/* View Options */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">显示选项</h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Grid3X3 className="w-4 h-4" />
                <span>显示网格</span>
              </div>
              <input
                type="checkbox"
                checked={shelfConfig.showGrid}
                onChange={(e) => updateShelfConfig({ showGrid: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Ruler className="w-4 h-4" />
                <span>显示尺寸</span>
              </div>
              <input
                type="checkbox"
                checked={shelfConfig.showMeasurements}
                onChange={(e) => updateShelfConfig({ showMeasurements: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
