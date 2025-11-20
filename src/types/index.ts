export interface Product {
  id: string;
  name: string;
  category: string;
  width: number; // cm
  height: number; // cm
  color: string;
  displayType?: 'flat' | 'hanging'; // Optional: how the product should be displayed
}

export interface LayerConfig {
  id: string;
  yPosition: number; // cm - absolute Y position from bottom of shelf (0 = bottom)
  type: 'flat' | 'hook'; // 'flat' = standard shelf board, 'hook' = pegboard/hook rail
}

export interface ShelfUnit {
  id: string;
  width?: number; // cm - optional custom width for this specific unit (if undefined, uses defaultUnitWidth)
  layers: LayerConfig[]; // Each unit has its own layers
}

export interface ShelfItem {
  uid: string;
  unitIndex: number; // 所属的货架组索引（用于查找对应的层板配置）
  x: number; // 全局X坐标（相对于整个货架系统的起点，单位：cm）
  y: number; // 全局Y坐标（从货架顶部向下，单位：cm）
  product: Product;
}

export interface ShelfConfig {
  defaultUnitWidth: number; // cm - default width for new shelf units
  totalHeight: number; // cm
  units: ShelfUnit[]; // Array of shelf units
  showGrid: boolean;
  showMeasurements: boolean;
}

