export interface Product {
  id: string;
  name: string;
  category: 'cleaning' | 'storage' | 'textile' | 'hanging';
  width: number; // in cm
  height: number; // in cm
  color: string;
  thumbnail?: string; // URL or placeholder
  displayType?: 'flat' | 'hanging'; // How the product should be displayed
}

export const mockProducts: Product[] = [
  { id: 'p1', name: '强力去油洗洁精', category: 'cleaning', width: 10, height: 25, color: '#f97316' }, // Orange-500
  { id: 'p2', name: '柠檬洁厕灵', category: 'cleaning', width: 12, height: 28, color: '#eab308' }, // Yellow-500
  { id: 'p3', name: '多功能清洁剂', category: 'cleaning', width: 15, height: 30, color: '#22c55e' }, // Green-500
  { id: 'p4', name: '海绵擦(3个装)', category: 'cleaning', width: 15, height: 10, color: '#fcd34d' }, // Amber-300
  
  { id: 'p5', name: '透明收纳箱(30L)', category: 'storage', width: 40, height: 30, color: '#3b82f6' }, // Blue-500
  { id: 'p6', name: '抽屉式收纳柜', category: 'storage', width: 35, height: 45, color: '#6366f1' }, // Indigo-500
  { id: 'p7', name: '桌面小收纳盒', category: 'storage', width: 20, height: 15, color: '#8b5cf6' }, // Violet-500
  { id: 'p8', name: '挂衣架(10个)', category: 'storage', width: 42, height: 20, color: '#a855f7' }, // Purple-500

  { id: 'p9', name: '纯棉浴巾', category: 'textile', width: 30, height: 10, color: '#f472b6' }, // Pink-400
  { id: 'p10', name: '日式条纹毛巾', category: 'textile', width: 15, height: 5, color: '#fb7185' }, // Rose-400
  { id: 'p11', name: '四季通用抱枕', category: 'textile', width: 45, height: 45, color: '#f87171' }, // Red-400
  { id: 'p12', name: '全棉床单(1.8m)', category: 'textile', width: 35, height: 8, color: '#ef4444' }, // Red-500

  // Hanging products (for hook/pegboard display)
  { id: 'h1', name: '挂钩-不锈钢锅铲', category: 'hanging', width: 8, height: 30, color: '#8b5cf6', displayType: 'hanging' }, // Purple-500
  { id: 'h2', name: '挂钩-厨房毛巾', category: 'hanging', width: 12, height: 20, color: '#a78bfa', displayType: 'hanging' }, // Violet-400
  { id: 'h3', name: '挂钩-小漏勺', category: 'hanging', width: 10, height: 25, color: '#c084fc', displayType: 'hanging' }, // Purple-400
  { id: 'h4', name: '挂钩-钥匙扣', category: 'hanging', width: 6, height: 15, color: '#d8b4fe', displayType: 'hanging' }, // Purple-300
  { id: 'h5', name: '挂钩-收纳袋', category: 'hanging', width: 15, height: 35, color: '#14b8a6', displayType: 'hanging' }, // Teal-500
];

