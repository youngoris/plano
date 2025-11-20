import { create } from 'zustand';
import type { Product } from '../mockData';
import type { ShelfUnit, LayerConfig, ShelfItem, ShelfConfig } from '../types';

interface AppState {
  // Shelf Configuration
  shelfConfig: ShelfConfig;
  updateShelfConfig: (config: Partial<Omit<ShelfConfig, 'units'>>) => void;
  
  // Unit Management
  addUnit: () => void;
  removeUnit: (unitId: string) => void;
  updateUnitWidth: (unitId: string, width: number) => void; // NEW: Update specific unit width
  
  // Layer Management (per unit)
  updateLayerPosition: (unitId: string, layerId: string, yPosition: number) => void;
  updateLayerType: (unitId: string, layerId: string, type: 'flat' | 'hook') => void;
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
  { id: 'layer-0', yPosition: 0, type: 'flat' },    // Base layer at bottom
  { id: 'layer-1', yPosition: 40, type: 'flat' },   // First shelf at 40cm
  { id: 'layer-2', yPosition: 80, type: 'flat' },   // Second shelf at 80cm
  { id: 'layer-3', yPosition: 120, type: 'flat' },  // Third shelf at 120cm
  { id: 'layer-4', yPosition: 160, type: 'flat' },  // Fourth shelf at 160cm
];

const createDefaultUnit = (index: number): ShelfUnit => ({
  id: `unit-${index}`,
  // width is undefined by default, will use defaultUnitWidth
  layers: createDefaultLayers(),
});

export const useAppStore = create<AppState>((set) => ({
  shelfConfig: {
    defaultUnitWidth: 120, // Default width for new units
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
  
  updateUnitWidth: (unitId, width) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: state.shelfConfig.units.map((unit) =>
          unit.id === unitId ? { ...unit, width } : unit
        ),
      },
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
  
  updateLayerType: (unitId, layerId, type) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        units: state.shelfConfig.units.map((unit) =>
          unit.id === unitId
            ? {
                ...unit,
                layers: unit.layers.map((layer) =>
                  layer.id === layerId ? { ...layer, type } : layer
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
                type: 'flat', // Default to flat shelf
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
