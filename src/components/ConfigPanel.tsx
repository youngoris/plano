import React from 'react';
import { Settings, Ruler, Grid3X3, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const ConfigPanel: React.FC = () => {
  const { shelfConfig, updateShelfConfig, updateLayerPosition, addLayer, removeLayer } = useAppStore();

  // Sort layers by position for display
  const sortedLayers = [...shelfConfig.layers].sort((a, b) => a.yPosition - b.yPosition);

  return (
    <div className="w-[280px] bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="font-semibold text-gray-800">货架配置</h2>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto flex-1">
        {/* Shelf Units */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">货架组数</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                组数
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={shelfConfig.unitCount}
                onChange={(e) => updateShelfConfig({ unitCount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

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
              <div className="mt-1 text-xs text-gray-500">
                层数: {shelfConfig.layers.length}
              </div>
            </div>
          </div>
        </div>

        {/* Layer Positions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              层板位置
            </h3>
            <button
              onClick={addLayer}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="添加层板"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sortedLayers.map((layer, index) => (
              <div key={layer.id} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">
                    {index === 0 ? '底层' : `第 ${index} 层`}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8">0cm</span>
                    <input
                      type="range"
                      min={0}
                      max={shelfConfig.totalHeight - 5}
                      step={5}
                      value={layer.yPosition}
                      onChange={(e) => updateLayerPosition(layer.id, Number(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min={0}
                      max={shelfConfig.totalHeight - 5}
                      step={1}
                      value={layer.yPosition}
                      onChange={(e) => updateLayerPosition(layer.id, Number(e.target.value))}
                      className="w-14 px-2 py-1 text-xs font-medium text-gray-900 text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500">cm</span>
                  </div>
                </div>
                {shelfConfig.layers.length > 1 && (
                  <button
                    onClick={() => removeLayer(layer.id)}
                    className="p-1 hover:bg-red-50 rounded transition-colors"
                    title="删除层板"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            💡 提示: 使用滑块或输入框调整层板高度
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
