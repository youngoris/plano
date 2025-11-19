import { create } from 'zustand';
import type { Product } from '../mockData';

export interface ShelfItem {
  uid: string;
  x: number;
  y: number;
  product: Product;
}

export interface LayerConfig {
  id: string;
  yPosition: number; // cm - absolute Y position from bottom of shelf (0 = bottom)
}

interface ShelfConfig {
  totalWidth: number; // cm - width of each shelf unit
  totalHeight: number; // cm
  unitCount: number; // number of shelf units side-by-side
  layers: LayerConfig[]; // array of customizable layers
  showGrid: boolean;
  showMeasurements: boolean;
}

interface AppState {
  // Shelf Configuration
  shelfConfig: ShelfConfig;
  updateShelfConfig: (config: Partial<ShelfConfig>) => void;
  updateLayerPosition: (layerId: string, yPosition: number) => void;
  addLayer: () => void;
  removeLayer: (layerId: string) => void;

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

export const useAppStore = create<AppState>((set) => ({
  shelfConfig: {
    totalWidth: 120, // Width per unit - default 120cm
    totalHeight: 200,
    unitCount: 2, // Start with 2 shelf units
    layers: createDefaultLayers(),
    showGrid: true,
    showMeasurements: true,
  },
  updateShelfConfig: (config) =>
    set((state) => ({ shelfConfig: { ...state.shelfConfig, ...config } })),
  
  updateLayerPosition: (layerId, yPosition) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        layers: state.shelfConfig.layers.map((layer) =>
          layer.id === layerId ? { ...layer, yPosition } : layer
        ),
      },
    })),
  
  addLayer: () =>
    set((state) => {
      // Find the highest current position and add 40cm above it
      const maxY = state.shelfConfig.layers.length > 0
        ? Math.max(...state.shelfConfig.layers.map(l => l.yPosition))
        : 0;
      
      return {
        shelfConfig: {
          ...state.shelfConfig,
          layers: [
            ...state.shelfConfig.layers,
            {
              id: `layer-${Date.now()}`,
              yPosition: Math.min(maxY + 40, state.shelfConfig.totalHeight - 10),
            },
          ],
        },
      };
    }),
  
  removeLayer: (layerId) =>
    set((state) => ({
      shelfConfig: {
        ...state.shelfConfig,
        layers: state.shelfConfig.layers.filter((layer) => layer.id !== layerId),
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

