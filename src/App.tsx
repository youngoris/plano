import { ConfigPanel } from './components/ConfigPanel';
import { ProductLibrary } from './components/ProductLibrary';
import { Workspace } from './components/Workspace';
import { Layout } from 'lucide-react';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-md">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-gray-800 text-lg">货架陈列工具</h1>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium ml-2">原型版</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500">
            从右侧拖拽商品 • 右键删除 • 点击空白处拖动画布 • 滚轮缩放
          </div>
          <button className="px-4 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors">
            导出布局
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        <ConfigPanel />
        <Workspace />
        <ProductLibrary />
      </div>
    </div>
  );
}

export default App;
