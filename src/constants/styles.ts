// Shelf Visual Style Constants - "Fresh Wind" (Xianfeng) Style
// Steel-Wood Combination (钢木结合)

export const SHELF_COLORS = {
  // Frame & Structure
  COLOR_FRAME: '#F5F5F5',        // Off-white for back panel
  COLOR_COLUMN: '#E0E0E0',       // Slightly darker white for vertical posts
  
  // Wood Surfaces
  COLOR_SHELF_SURFACE: '#F2E6D9', // Light wood top surface (Oak/Maple)
  COLOR_SHELF_EDGE: '#D4B59D',    // Darker wood for front face/edge (3D effect)
  
  // Accents
  COLOR_SHADOW: 'rgba(0, 0, 0, 0.1)',
  COLOR_BORDER: '#CCCCCC',
} as const;

// Layout Constants
export const SHELF_DEFAULTS = {
  COLUMN_WIDTH_CM: 4,           // Width of vertical uprights in cm
  SHELF_THICKNESS_CM: 3,        // Thickness of each shelf board
  BASE_THICKNESS_CM: 5,         // Thicker base layer
  DEFAULT_LAYER_HEIGHT_CM: 40,  // Default height between layers
  MIN_LAYER_HEIGHT_CM: 20,      // Minimum layer height
  MAX_LAYER_HEIGHT_CM: 80,      // Maximum layer height
} as const;

export const CM_TO_PX = 3; // Scale factor: 1cm = 3px

