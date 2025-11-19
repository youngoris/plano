import { create } from 'zustand';
import type { Product } from '../mockData';

export interface ShelfItem {
  uid: string;
  unitIndex: number; // 所属的货架组索引
  x: number; // 相对于该组货架的X坐标
  y: number;
  product: Product;
}

export interface LayerConfig {
  id: string;
  yPosition: number; // cm - absolute Y position from bottom of shelf (0 = bottom)
}

export interface ShelfUnit {
  id: string;
  layers: LayerConfig[];
}

interface ShelfConfig {
  totalWidth: number; // cm - width of each shelf unit
  totalHeight: number; // cm
  units: ShelfUnit[]; // 每组货架的独立配置
  showGrid: boolean;
  showMeasurements: boolean;
}

interface AppState {
  // Shelf Configuration
  shelfConfig: ShelfConfig;
  updateShelfConfig: (config: Partial<Omit<ShelfConfig, 'units'>>) => void;
  
  // Unit Management
  addUnit: () => void;
  removeUnit: (unitId: string) => void;
  
  // Layer Management (per unit)
  updateLayerPosition: (unitId: string, layerId: string, yPosition: number) => void;
  addLayer: (unitId: string) => void;
  removeLayer: (unitId: string, layerId: string) => void;

  // Drag & Drop State
  draggedProduct: Product | null;
  setDraggedProduct: (product: Product | null) => void;

  // Canvas State
  shelfItems: ShelfItem[];
  addItemToShelf: (item: Omit<ShelfItem, 'uid'>) => void;
  updateItemPosition: (uid: string, x: number, y: number) => void;
  removeItemFromShelf: (uid: string) => void;
}

const createDefaultLayers = (): LayerConfig[] => [
  { id: 'layer-0', yPosition: 0 },    // Base layer at bottom
  { id: 'layer-1', yPosition: 40 },   // First shelf at 40cm
  { id: 'layer-2', yPosition: 80 },   // Second shelf at 80cm
  { id: 'layer-3', yPosition: 120 },  // Third shelf at 120cm
  { id: 'layer-4', yPosition: 160 },  // Fourth shelf at 160cm
];

const createDefaultUnit = (index: number): ShelfUnit => ({
  id: `unit-${index}`,
  layers: createDefaultLayers(),
});

export const useAppStore = create<AppState>((set) => ({
  shelfConfig: {
    totalWidth: 120, // Width per unit - default 120cm
    totalHeight: 200,
    units: [createDefaultUnit(0), createDefaultUnit(1)], // Start with 2 shelf units
    showGrid: true,
    showMeasurements: true,
  },
  
  updateShelfConfig: (config) =>
    set((state) => ({ 
      shelfConfig: { 
        ...state.shelfConfig, 
        ...config 
      } 
    })),
  
  // Unit Management
  addUnit: () =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: [
          ...state.shelfConfig.units,
          createDefaultUnit(state.shelfConfig.units.length),
        ],
      },
    })),
  
  removeUnit: (unitId) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: state.shelfConfig.units.filter((unit) => unit.id !== unitId),
      },
      // Also remove items from this unit
      shelfItems: state.shelfItems.filter((item) => {
        const unitIndex = state.shelfConfig.units.findIndex(u => u.id === unitId);
        return item.unitIndex !== unitIndex;
      }),
    })),
  
  // Layer Management
  updateLayerPosition: (unitId, layerId, yPosition) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: state.shelfConfig.units.map((unit) =>
          unit.id === unitId
            ? {
                ...unit,
                layers: unit.layers.map((layer) =>
                  layer.id === layerId ? { ...layer, yPosition } : layer
                ),
              }
            : unit
        ),
      },
    })),
  
  addLayer: (unitId) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: state.shelfConfig.units.map((unit) => {
          if (unit.id !== unitId) return unit;
          
          const maxY = unit.layers.length > 0
            ? Math.max(...unit.layers.map(l => l.yPosition))
            : 0;
          
          return {
            ...unit,
            layers: [
              ...unit.layers,
              {
                id: `layer-${Date.now()}`,
                yPosition: Math.min(maxY + 40, state.shelfConfig.totalHeight - 10),
              },
            ],
          };
        }),
      },
    })),
  
  removeLayer: (unitId, layerId) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: state.shelfConfig.units.map((unit) => {
          if (unit.id !== unitId) return unit;
          
          // 不允许删除底层 (yPosition = 0)
          const layerToRemove = unit.layers.find(l => l.id === layerId);
          if (layerToRemove && layerToRemove.yPosition === 0) {
            return unit; // 不删除底层
          }
          
          return {
            ...unit,
            layers: unit.layers.filter((layer) => layer.id !== layerId),
          };
        }),
      },
    })),

  draggedProduct: null,
  setDraggedProduct: (product) => set({ draggedProduct: product }),

  shelfItems: [],
  addItemToShelf: (item) =>
    set((state) => ({
      shelfItems: [
        ...state.shelfItems,
        { ...item, uid: Math.random().toString(36).substr(2, 9) },
      ],
    })),
  updateItemPosition: (uid, x, y) =>
    set((state) => ({
      shelfItems: state.shelfItems.map((item) =>
        item.uid === uid ? { ...item, x, y } : item
      ),
    })),
  removeItemFromShelf: (uid) =>
    set((state) => ({
      shelfItems: state.shelfItems.filter((item) => item.uid !== uid),
    })),
}));
