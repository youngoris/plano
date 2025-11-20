import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Arrow } from 'react-konva';
import Konva from 'konva';
import { ZoomIn, ZoomOut, Maximize2, Hand } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SHELF_COLORS, SHELF_DEFAULTS, CM_TO_PX } from '../constants/styles';

export const Workspace: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    shelfConfig, 
    draggedProduct, 
    shelfItems, 
    addItemToShelf, 
    setDraggedProduct,
    updateItemPosition,
    removeItemFromShelf
  } = useAppStore();

  const [stageSize, setStageSize] = useState({ width: 1200, height: 700 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingStage, setIsDraggingStage] = useState(false);
  const [isPanMode, setIsPanMode] = useState(false);
  const [highlightedLayerId, setHighlightedLayerId] = useState<string | null>(null);
  const [draggedItemUid, setDraggedItemUid] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setStageSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  /**
   * Helper: Get the width of a specific unit (with fallback to default)
   */
  const getUnitWidth = (unitIndex: number): number => {
    const unit = shelfConfig.units[unitIndex];
    return unit?.width ?? shelfConfig.defaultUnitWidth;
  };

  /**
   * Helper: Calculate cumulative X positions for all units
   * Returns array of [startX_0, startX_1, ..., startX_n]
   */
  const calculateUnitXPositions = (): number[] => {
    const positions: number[] = [];
    let cumulativeX = 0;
    
    for (let i = 0; i < shelfConfig.units.length; i++) {
      positions.push(cumulativeX);
      cumulativeX += getUnitWidth(i);
    }
    
    return positions;
  };

  /**
   * Helper: Find which unit a global X position falls into
   * Returns: { unitIndex, unitRelativeX }
   */
  const findUnitAtX = (globalX: number): { unitIndex: number; unitRelativeX: number } => {
    let cumulativeX = 0;
    
    for (let i = 0; i < shelfConfig.units.length; i++) {
      const unitWidth = getUnitWidth(i);
      
      if (globalX >= cumulativeX && globalX < cumulativeX + unitWidth) {
        return {
          unitIndex: i,
          unitRelativeX: globalX - cumulativeX
        };
      }
      
      cumulativeX += unitWidth;
    }
    
    // If beyond the last unit, clamp to last unit
    return {
      unitIndex: shelfConfig.units.length - 1,
      unitRelativeX: globalX - cumulativeX + getUnitWidth(shelfConfig.units.length - 1)
    };
  };

  // Calculate total dimensions (sum of all unit widths)
  const totalShelfWidthCm = shelfConfig.units.reduce((sum, _, index) => sum + getUnitWidth(index), 0);
  const totalShelfWidthPx = totalShelfWidthCm * CM_TO_PX;
  const totalShelfHeightPx = shelfConfig.totalHeight * CM_TO_PX;
  const startX = (stageSize.width - totalShelfWidthPx) / 2;
  const startY = (stageSize.height - totalShelfHeightPx) / 2;

  const columnWidthPx = SHELF_DEFAULTS.COLUMN_WIDTH_CM * CM_TO_PX;
  const shelfThicknessPx = SHELF_DEFAULTS.SHELF_THICKNESS_CM * CM_TO_PX;
  const baseThicknessPx = SHELF_DEFAULTS.BASE_THICKNESS_CM * CM_TO_PX;
  const shelfShorterBy = 1 * CM_TO_PX;

  /**
   * Gravity System with Stacking: Find the best surface to snap to (shelf or other items)
   * Returns: { unitIndex, surfaceY } or null
   */
  const findBestSurface = (globalX: number, itemBottomY: number, itemWidth: number, currentItemUid?: string) => {
    // Determine which unit based on X position (using dynamic widths)
    const { unitIndex: clampedUnitIndex } = findUnitAtX(globalX);
    
    const unit = shelfConfig.units[clampedUnitIndex];
    if (!unit || unit.layers.length === 0) return null;

    const shelfThickness = SHELF_DEFAULTS.SHELF_THICKNESS_CM;
    const baseThickness = SHELF_DEFAULTS.BASE_THICKNESS_CM;
    
    let bestSurface: number | null = null;
    let minDistance = Infinity;

    // 1. Check shelf layers
    for (const layer of unit.layers) {
      const thickness = layer.yPosition === 0 ? baseThickness : shelfThickness;
      const layerSurfaceY = layer.yPosition + thickness; // Top surface from bottom
      
      const distance = Math.abs(itemBottomY - layerSurfaceY);
      
      if (distance < 30 && distance < minDistance) {
        minDistance = distance;
        bestSurface = layerSurfaceY;
      }
    }

    // 2. Check other items (for stacking)
    const itemLeft = globalX;
    const itemRight = globalX + itemWidth;
    
    for (const existingItem of shelfItems) {
      // Skip self when dragging existing item
      if (currentItemUid && existingItem.uid === currentItemUid) continue;
      
      const existingLeft = existingItem.x;
      const existingRight = existingItem.x + existingItem.product.width;
      
      // Check horizontal overlap (items must overlap by at least 30% for stacking)
      const overlapLeft = Math.max(itemLeft, existingLeft);
      const overlapRight = Math.min(itemRight, existingRight);
      const overlapWidth = overlapRight - overlapLeft;
      const minItemWidth = Math.min(itemWidth, existingItem.product.width);
      
      if (overlapWidth > minItemWidth * 0.3) {
        // Calculate the top surface of the existing item (from shelf bottom)
        const existingItemBottomY = shelfConfig.totalHeight - existingItem.y - existingItem.product.height;
        const existingItemTopY = existingItemBottomY + existingItem.product.height;
        
        const distance = Math.abs(itemBottomY - existingItemTopY);
        
        // Only consider items within 30cm tolerance and closer than current best
        if (distance < 30 && distance < minDistance) {
          minDistance = distance;
          bestSurface = existingItemTopY;
        }
      }
    }

    return bestSurface !== null ? { unitIndex: clampedUnitIndex, surfaceY: bestSurface } : null;
  };

  /**
   * Check if item collides with existing items at given position
   * Returns adjusted X position if collision detected, original X if no collision
   */
  const resolveHorizontalCollision = (
    proposedX: number, 
    proposedY: number, 
    itemWidth: number, 
    itemHeight: number, 
    currentItemUid?: string
  ): number => {
    const tolerance = 0.5; // 0.5cm tolerance for floating point precision
    const itemLeft = proposedX;
    const itemRight = proposedX + itemWidth;
    const itemTop = proposedY;
    const itemBottom = proposedY + itemHeight;

    // Check collision with each existing item
    for (const existingItem of shelfItems) {
      // Skip self when dragging existing item
      if (currentItemUid && existingItem.uid === currentItemUid) continue;

      const existingLeft = existingItem.x;
      const existingRight = existingItem.x + existingItem.product.width;
      const existingTop = existingItem.y;
      const existingBottom = existingItem.y + existingItem.product.height;

      // Check vertical overlap (are they on the same level?)
      const verticalOverlap = !(itemBottom + tolerance < existingTop || itemTop > existingBottom + tolerance);
      
      if (verticalOverlap) {
        // Check horizontal overlap
        const horizontalOverlap = !(itemRight <= existingLeft + tolerance || itemLeft >= existingRight - tolerance);
        
        if (horizontalOverlap) {
          // Collision detected! Find the best position to push to
          const overlapLeft = itemRight - existingLeft;
          const overlapRight = existingRight - itemLeft;
          
          // Push to the side with less overlap
          if (overlapLeft < overlapRight) {
            // Push to the left
            const newX = existingLeft - itemWidth;
            // Validate new position is within shelf bounds
            if (newX >= 0) {
              return newX;
            }
          } else {
            // Push to the right
            const newX = existingRight;
            // Validate new position is within total shelf width
            if (newX + itemWidth <= totalShelfWidthCm) {
              return newX;
            }
          }
          
          // If can't resolve, try the other direction
          if (overlapLeft < overlapRight) {
            const newX = existingRight;
            if (newX + itemWidth <= totalShelfWidthCm) {
              return newX;
            }
          } else {
            const newX = existingLeft - itemWidth;
            if (newX >= 0) {
              return newX;
            }
          }
        }
      }
    }

    return proposedX; // No collision, return original position
  };

  /**
   * Apply gravity: snap item to nearest surface (shelf or other items)
   */
  const applyGravity = (globalX: number, globalY: number, itemWidth: number, itemHeight: number, currentItemUid?: string) => {
    // Calculate item bottom position (from shelf bottom)
    const itemBottomY = shelfConfig.totalHeight - globalY - itemHeight;
    
    const result = findBestSurface(globalX, itemBottomY, itemWidth, currentItemUid);
    
    if (result) {
      // Snap to surface (shelf or item top)
      const snappedY = shelfConfig.totalHeight - result.surfaceY - itemHeight;
      
      // Resolve horizontal collision
      const adjustedX = resolveHorizontalCollision(globalX, snappedY, itemWidth, itemHeight, currentItemUid);
      
      return { x: adjustedX, y: snappedY, unitIndex: result.unitIndex };
    }
    
    // No valid surface found, still check for collision at current position
    const adjustedX = resolveHorizontalCollision(globalX, globalY, itemWidth, itemHeight, currentItemUid);
    const { unitIndex } = findUnitAtX(adjustedX);
    return { x: adjustedX, y: globalY, unitIndex };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedProduct || !stageRef.current) return;

    stageRef.current.setPointersPositions(e);
    const pointerPos = stageRef.current.getPointerPosition();
    
    if (pointerPos) {
      // Convert screen coordinates to global shelf coordinates
      const adjustedX = (pointerPos.x - position.x) / scale;
      const adjustedY = (pointerPos.y - position.y) / scale;
      
      const globalX = (adjustedX - startX) / CM_TO_PX;
      const globalY = (adjustedY - startY) / CM_TO_PX;

      // Center the item on cursor
      const centeredX = globalX - draggedProduct.width / 2;
      const centeredY = globalY - draggedProduct.height / 2;

      // Apply gravity (no currentItemUid for new items)
      const result = applyGravity(centeredX, centeredY, draggedProduct.width, draggedProduct.height);

      addItemToShelf({
        unitIndex: result.unitIndex,
        x: result.x,
        y: result.y,
        product: draggedProduct,
      });
    }

    setDraggedProduct(null);
    setHighlightedLayerId(null);
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const oldScale = scale;

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.3, Math.min(3, newScale));

    const shelfCenterX = (stageSize.width - totalShelfWidthPx) / 2 + totalShelfWidthPx / 2;
    const shelfCenterY = (stageSize.height - totalShelfHeightPx) / 2 + totalShelfHeightPx / 2;

    const scaleChange = clampedScale / oldScale;
    setScale(clampedScale);
    setPosition({
      x: position.x + (shelfCenterX - position.x) * (1 - scaleChange),
      y: position.y + (shelfCenterY - position.y) * (1 - scaleChange),
    });
  };

  const handleZoomIn = () => {
    const oldScale = scale;
    const newScale = Math.min(3, scale * 1.2);
    
    const shelfCenterX = (stageSize.width - totalShelfWidthPx) / 2 + totalShelfWidthPx / 2;
    const shelfCenterY = (stageSize.height - totalShelfHeightPx) / 2 + totalShelfHeightPx / 2;
    
    const scaleChange = newScale / oldScale;
    setScale(newScale);
    setPosition({
      x: position.x + (shelfCenterX - position.x) * (1 - scaleChange),
      y: position.y + (shelfCenterY - position.y) * (1 - scaleChange),
    });
  };

  const handleZoomOut = () => {
    const oldScale = scale;
    const newScale = Math.max(0.3, scale / 1.2);
    
    const shelfCenterX = (stageSize.width - totalShelfWidthPx) / 2 + totalShelfWidthPx / 2;
    const shelfCenterY = (stageSize.height - totalShelfHeightPx) / 2 + totalShelfHeightPx / 2;
    
    const scaleChange = newScale / oldScale;
    setScale(newScale);
    setPosition({
      x: position.x + (shelfCenterX - position.x) * (1 - scaleChange),
      y: position.y + (shelfCenterY - position.y) * (1 - scaleChange),
    });
  };

  const handleFitToScreen = () => {
    const paddingFactor = 0.9;
    const scaleX = (stageSize.width * paddingFactor) / totalShelfWidthPx;
    const scaleY = (stageSize.height * paddingFactor) / totalShelfHeightPx;
    const newScale = Math.max(0.1, Math.min(2, Math.min(scaleX, scaleY)));
    
    const originalShelfX = (stageSize.width - totalShelfWidthPx) / 2;
    const originalShelfY = (stageSize.height - totalShelfHeightPx) / 2;
    
    const shelfCenterX = originalShelfX + totalShelfWidthPx / 2;
    const shelfCenterY = originalShelfY + totalShelfHeightPx / 2;
    
    const viewportCenterX = stageSize.width / 2;
    const viewportCenterY = stageSize.height / 2;
    
    setScale(newScale);
    setPosition({
      x: viewportCenterX - shelfCenterX * newScale,
      y: viewportCenterY - shelfCenterY * newScale,
    });
  };

  const togglePanMode = () => {
    setIsPanMode(!isPanMode);
  };

  /**
   * Render a single shelf unit
   */
  const renderShelfUnit = (unitIndex: number) => {
    const unit = shelfConfig.units[unitIndex];
    if (!unit) return null;
    
    // Use dynamic X position and width
    const unitXPositions = calculateUnitXPositions();
    const unitX = unitXPositions[unitIndex] * CM_TO_PX;
    const unitWidthCm = getUnitWidth(unitIndex);
    const unitWidthPx = unitWidthCm * CM_TO_PX;

    return (
      <Group key={`unit-${unitIndex}`} x={unitX}>
        {/* Back Panel */}
        <Rect
          x={0}
          y={0}
          width={unitWidthPx}
          height={totalShelfHeightPx}
          fill={SHELF_COLORS.COLOR_FRAME}
          strokeWidth={0}
        />

        {/* Left Upright Column */}
        <Rect
          x={0}
          y={0}
          width={columnWidthPx}
          height={totalShelfHeightPx}
          fill={SHELF_COLORS.COLOR_COLUMN}
          shadowColor={SHELF_COLORS.COLOR_SHADOW}
          shadowBlur={4}
          shadowOffsetX={2}
        />

        {/* Right Upright Column */}
        <Rect
          x={unitWidthPx - columnWidthPx}
          y={0}
          width={columnWidthPx}
          height={totalShelfHeightPx}
          fill={SHELF_COLORS.COLOR_COLUMN}
          shadowColor={SHELF_COLORS.COLOR_SHADOW}
          shadowBlur={4}
          shadowOffsetX={-2}
        />

        {/* Dimension Indicator - Width Arrow */}
        <Arrow
          points={[
            columnWidthPx + 5,
            -15,
            unitWidthPx - columnWidthPx - 5,
            -15
          ]}
          stroke="#374151"
          strokeWidth={1.5}
          fill="#374151"
          pointerLength={6}
          pointerWidth={6}
          pointerAtBeginning
        />
        <Text
          x={0}
          y={-35}
          width={unitWidthPx}
          text={`${unitWidthCm} cm`}
          fontSize={12}
          fontStyle="bold"
          fill="#374151"
          align="center"
        />

        {/* Grid Lines */}
        {shelfConfig.showGrid && (
          <>
            {Array.from({ length: Math.floor(unitWidthCm / 10) - 1 }).map((_, i) => (
              <Line
                key={`v-grid-${i}`}
                points={[(i + 1) * 10 * CM_TO_PX, 0, (i + 1) * 10 * CM_TO_PX, totalShelfHeightPx]}
                stroke="#d0d0d0"
                strokeWidth={1}
                dash={[4, 4]}
                opacity={0.5}
              />
            ))}
          </>
        )}

        {/* Render layers for this unit */}
        {unit.layers.map((layer) => {
          const yPos = totalShelfHeightPx - (layer.yPosition * CM_TO_PX);
          const isBase = layer.yPosition === 0;
          const thickness = isBase ? baseThicknessPx : shelfThicknessPx;
          const shelfWidth = unitWidthPx - shelfShorterBy * 2;
          const isHighlighted = highlightedLayerId === `${unitIndex}-${layer.id}`;

          // Render based on layer type
          if (layer.type === 'hook') {
            // Hook Rail rendering - clean horizontal bar
            return (
              <Group key={layer.id} y={yPos}>
                {/* Hook Rail - Light grey horizontal bar */}
                <Rect
                  x={shelfShorterBy}
                  y={-5}
                  width={shelfWidth}
                  height={10}
                  fill="#e5e7eb"
                  stroke={isHighlighted ? '#8b5cf6' : '#d1d5db'}
                  strokeWidth={isHighlighted ? 3 : 1}
                  cornerRadius={3}
                  shadowColor="rgba(0,0,0,0.1)"
                  shadowBlur={2}
                  shadowOffsetY={1}
                />
                
                {/* Visual indicator text */}
                {isHighlighted && (
                  <Text
                    x={shelfShorterBy}
                    y={12}
                    text="挂钩区"
                    fontSize={10}
                    fill="#8b5cf6"
                    fontStyle="bold"
                  />
                )}
              </Group>
            );
          } else {
            // Standard flat shelf rendering
            return (
              <Group key={layer.id} y={yPos}>
                {/* Shelf Surface */}
                <Rect
                  x={shelfShorterBy}
                  y={-thickness}
                  width={shelfWidth}
                  height={thickness}
                  fill={SHELF_COLORS.COLOR_SHELF_SURFACE}
                  stroke={isHighlighted ? '#3b82f6' : 'transparent'}
                  strokeWidth={isHighlighted ? 3 : 0}
                  shadowColor={SHELF_COLORS.COLOR_SHADOW}
                  shadowBlur={3}
                  shadowOffsetY={2}
                />
                
                {/* Shelf Front Edge */}
                <Rect
                  x={shelfShorterBy}
                  y={-thickness / 3}
                  width={shelfWidth}
                  height={thickness / 2}
                  fill={SHELF_COLORS.COLOR_SHELF_EDGE}
                />
              </Group>
            );
          }
        })}
      </Group>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="flex-1 bg-[#e8e8e8] relative overflow-hidden h-full flex flex-col"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Toolbar/Info */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm text-xs text-gray-600 space-y-1">
        <div>画布: {Math.round(stageSize.width)}x{Math.round(stageSize.height)}px</div>
        <div>货架组: {shelfConfig.units.length} 组</div>
        <div>总宽: {totalShelfWidthCm} cm</div>
        <div>缩放: {Math.round(scale * 100)}%</div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-sm flex flex-col gap-1 p-1">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="放大"
        >
          <ZoomIn className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="缩小"
        >
          <ZoomOut className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="适配屏幕"
        >
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
        <div className="border-t border-gray-200 my-1"></div>
        <button
          onClick={togglePanMode}
          className={`p-2 rounded transition-colors ${
            isPanMode 
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
              : 'hover:bg-gray-100 text-gray-700'
          }`}
          title={isPanMode ? "退出手抓模式" : "手抓拖动"}
        >
          <Hand className="w-5 h-5" />
        </button>
      </div>

      <Stage
        width={stageSize.width}
        height={stageSize.height}
        ref={stageRef}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onWheel={handleWheel}
        draggable={isDraggingStage || isPanMode}
        onMouseDown={(e) => {
          if (isPanMode) {
            setIsDraggingStage(true);
          } else {
            const clickedOnEmpty = e.target === e.target.getStage();
            setIsDraggingStage(clickedOnEmpty);
          }
        }}
        onMouseUp={() => {
          if (!isPanMode) {
            setIsDraggingStage(false);
          }
        }}
        onDragEnd={(e) => {
          setPosition({ x: e.target.x(), y: e.target.y() });
          if (!isPanMode) {
            setIsDraggingStage(false);
          }
        }}
        style={{ cursor: isPanMode ? 'grab' : 'default' }}
      >
        {/* Shelf Layer - Background */}
        <Layer>
          <Group x={startX} y={startY}>
            {/* Render all shelf units */}
            {Array.from({ length: shelfConfig.units.length }).map((_, i) => renderShelfUnit(i))}

            {/* Unit Separator Lines (using dynamic X positions) */}
            {(() => {
              const unitXPositions = calculateUnitXPositions();
              return Array.from({ length: shelfConfig.units.length - 1 }).map((_, i) => {
                const separatorX = (unitXPositions[i + 1]) * CM_TO_PX;
                return (
                  <Line
                    key={`separator-${i}`}
                    points={[
                      separatorX, 
                      0, 
                      separatorX, 
                      totalShelfHeightPx
                    ]}
                    stroke="#333333"
                    strokeWidth={3}
                  />
                );
              });
            })()}

            {/* Outer Border */}
            <Rect
              x={0}
              y={0}
              width={totalShelfWidthPx}
              height={totalShelfHeightPx}
              stroke={SHELF_COLORS.COLOR_BORDER}
              strokeWidth={2}
              fill="transparent"
            />

            {/* Measurements */}
            {shelfConfig.showMeasurements && (
              <>
                <Text
                  x={totalShelfWidthPx / 2 - 40}
                  y={-50}
                  text={`总宽: ${totalShelfWidthCm} cm`}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#555"
                />
                
                <Text
                  x={-70}
                  y={totalShelfHeightPx / 2}
                  text={`${shelfConfig.totalHeight} cm`}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#555"
                  rotation={-90}
                />
              </>
            )}
          </Group>
        </Layer>

        {/* Product Layer - Top Layer (Flattened Scene) */}
        <Layer>
          <Group x={startX} y={startY}>
            {shelfItems.map((item) => {
              const globalXPx = item.x * CM_TO_PX;
              const globalYPx = item.y * CM_TO_PX;
              const isHanging = item.product.displayType === 'hanging';
              const itemWidthPx = item.product.width * CM_TO_PX;
              const itemHeightPx = item.product.height * CM_TO_PX;
              
              return (
                <Group
                  key={item.uid}
                  x={globalXPx}
                  y={globalYPx}
                  draggable={!isPanMode}
                  opacity={draggedItemUid === item.uid ? 0.7 : 1}
                  onMouseDown={(e) => {
                    if (!isPanMode) {
                      e.cancelBubble = true;
                      setIsDraggingStage(false);
                    }
                  }}
                  onDragStart={(e) => {
                    if (!isPanMode) {
                      e.cancelBubble = true;
                      setIsDraggingStage(false);
                      setDraggedItemUid(item.uid);
                    }
                  }}
                  onDragMove={(e) => {
                    if (!isPanMode) {
                      e.cancelBubble = true;
                      setIsDraggingStage(false);
                      
                      // Highlight target layer during drag
                      const newGlobalX = e.target.x() / CM_TO_PX;
                      const newGlobalY = e.target.y() / CM_TO_PX;
                      const itemBottomY = shelfConfig.totalHeight - newGlobalY - item.product.height;
                      
                      const result = findBestSurface(newGlobalX, itemBottomY, item.product.width, item.uid);
                      if (result) {
                        const unit = shelfConfig.units[result.unitIndex];
                        const layer = unit?.layers.find(l => {
                          const thickness = l.yPosition === 0 ? SHELF_DEFAULTS.BASE_THICKNESS_CM : SHELF_DEFAULTS.SHELF_THICKNESS_CM;
                          return Math.abs((l.yPosition + thickness) - result.surfaceY) < 0.1;
                        });
                        if (layer) {
                          setHighlightedLayerId(`${result.unitIndex}-${layer.id}`);
                        } else {
                          // Might be landing on another item, clear highlight
                          setHighlightedLayerId(null);
                        }
                      } else {
                        setHighlightedLayerId(null);
                      }
                    }
                  }}
                  onDragEnd={(e) => {
                    if (!isPanMode) {
                      e.cancelBubble = true;
                      
                      const newGlobalX = e.target.x() / CM_TO_PX;
                      const newGlobalY = e.target.y() / CM_TO_PX;
                      
                      // Apply gravity with stacking support and collision resolution
                      const result = applyGravity(newGlobalX, newGlobalY, item.product.width, item.product.height, item.uid);
                      
                      updateItemPosition(item.uid, result.x, result.y);
                      setIsDraggingStage(false);
                      setHighlightedLayerId(null);
                      setDraggedItemUid(null);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                    removeItemFromShelf(item.uid);
                  }}
                >
                  {/* Hanging straps - simple vertical lines (front view) */}
                  {isHanging && (() => {
                    // Calculate number of hanging points based on item width
                    const hookCount = Math.max(1, Math.min(Math.ceil(item.product.width / 6), 5));
                    const hookSpacing = itemWidthPx / (hookCount + 1);
                    
                    return Array.from({ length: hookCount }).map((_, hookIndex) => {
                      const hookX = hookSpacing * (hookIndex + 1);
                      return (
                        <Line
                          key={`strap-${hookIndex}`}
                          points={[hookX, -2, hookX, 6]}
                          stroke="#4b5563"
                          strokeWidth={2}
                          lineCap="round"
                          opacity={0.8}
                        />
                      );
                    });
                  })()}
                  
                  {/* Product body */}
                  <Rect
                    y={isHanging ? 6 : 0}
                    width={itemWidthPx}
                    height={itemHeightPx}
                    fill={item.product.color}
                    stroke={draggedItemUid === item.uid ? "#3b82f6" : "rgba(0,0,0,0.2)"}
                    strokeWidth={draggedItemUid === item.uid ? 3 : 2}
                    cornerRadius={3}
                    shadowColor="black"
                    shadowBlur={5}
                    shadowOpacity={0.3}
                    shadowOffsetY={2}
                  />
                  
                  {/* Product label */}
                  <Text
                    y={(isHanging ? 6 : 0) + itemHeightPx / 2 - 5}
                    width={itemWidthPx}
                    text={item.product.name}
                    fontSize={10}
                    fill="white"
                    align="center"
                    verticalAlign="middle"
                    ellipsis={true}
                    wrap="none"
                    shadowColor="black"
                    shadowBlur={2}
                  />
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};
