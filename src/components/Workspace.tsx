import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva';
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
  const [isPanMode, setIsPanMode] = useState(false); // 手抓模式

  useEffect(() => {
    if (containerRef.current) {
      setStageSize({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  // Find nearest shelf layer for gravity snapping - returns the Y position where item should rest
  // unitIndex: 货架组索引
  const findNearestShelfBelow = (unitIndex: number, itemBottomY: number): number => {
    const unit = shelfConfig.units[unitIndex];
    if (!unit || unit.layers.length === 0) return 0;
    
    // Sort layers by position (ascending)
    const sortedLayers = [...unit.layers].sort((a, b) => a.yPosition - b.yPosition);
    
    // Account for shelf thickness - items rest on TOP of the shelf surface
    const shelfThickness = SHELF_DEFAULTS.SHELF_THICKNESS_CM;
    const baseThickness = SHELF_DEFAULTS.BASE_THICKNESS_CM;
    
    // Find the highest layer that is below or at the item bottom (with tolerance)
    for (let i = sortedLayers.length - 1; i >= 0; i--) {
      const layer = sortedLayers[i];
      const thickness = layer.yPosition === 0 ? baseThickness : shelfThickness;
      const layerTopY = layer.yPosition + thickness; // Top surface of the shelf
      
      // Allow item to be significantly below the shelf surface and still snap back up
      // This prevents the item from falling through when dragging horizontally with slight downward movement
      if (layerTopY <= itemBottomY + 20) { // 20cm tolerance
        return layerTopY; // Return the top surface position
      }
    }
    
    // Default to base layer top surface
    return baseThickness;
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
      // Account for scale and position
      const adjustedX = (pointerPos.x - position.x) / scale;
      const adjustedY = (pointerPos.y - position.y) / scale;
      
      const totalShelfWidth = shelfConfig.totalWidth * shelfConfig.units.length * CM_TO_PX;
      const totalShelfHeight = shelfConfig.totalHeight * CM_TO_PX;
      const shelfX = (stageSize.width - totalShelfWidth) / 2;
      const shelfY = (stageSize.height - totalShelfHeight) / 2;
      
      const relativeX = (adjustedX - shelfX) / CM_TO_PX;
      const relativeY = (adjustedY - shelfY) / CM_TO_PX;

      // Determine which unit the item is dropped on
      const unitIndex = Math.floor(relativeX / shelfConfig.totalWidth);
      const clampedUnitIndex = Math.max(0, Math.min(shelfConfig.units.length - 1, unitIndex));
      
      // Calculate X relative to the unit
      const unitRelativeX = relativeX - (clampedUnitIndex * shelfConfig.totalWidth);

      // Calculate item bottom position in cm (from bottom of shelf)
      const itemCenterY = shelfConfig.totalHeight - relativeY;
      const itemBottomY = itemCenterY - draggedProduct.height / 2;
      
      // Apply gravity - find shelf surface below and snap to it (for this specific unit)
      const shelfSurfaceY = findNearestShelfBelow(clampedUnitIndex, itemBottomY);
      
      // Place item on top of the shelf surface
      // finalY is the top of the item, calculated from top of shelf
      const finalY = shelfConfig.totalHeight - shelfSurfaceY - draggedProduct.height;
      const finalX = unitRelativeX - draggedProduct.width / 2;

      addItemToShelf({
        unitIndex: clampedUnitIndex,
        x: finalX,
        y: finalY,
        product: draggedProduct,
      });
    }

    setDraggedProduct(null);
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.1;
    const oldScale = scale;

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.3, Math.min(3, newScale));

    // Calculate shelf center in viewport
    const totalShelfWidth = shelfConfig.totalWidth * shelfConfig.units.length * CM_TO_PX;
    const totalShelfHeight = shelfConfig.totalHeight * CM_TO_PX;
    const shelfCenterX = (stageSize.width - totalShelfWidth) / 2 + totalShelfWidth / 2;
    const shelfCenterY = (stageSize.height - totalShelfHeight) / 2 + totalShelfHeight / 2;

    // Calculate new position to keep shelf center fixed
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
    
    // Zoom from shelf center
    const totalShelfWidth = shelfConfig.totalWidth * shelfConfig.units.length * CM_TO_PX;
    const totalShelfHeight = shelfConfig.totalHeight * CM_TO_PX;
    const shelfCenterX = (stageSize.width - totalShelfWidth) / 2 + totalShelfWidth / 2;
    const shelfCenterY = (stageSize.height - totalShelfHeight) / 2 + totalShelfHeight / 2;
    
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
    
    // Zoom from shelf center
    const totalShelfWidth = shelfConfig.totalWidth * shelfConfig.units.length * CM_TO_PX;
    const totalShelfHeight = shelfConfig.totalHeight * CM_TO_PX;
    const shelfCenterX = (stageSize.width - totalShelfWidth) / 2 + totalShelfWidth / 2;
    const shelfCenterY = (stageSize.height - totalShelfHeight) / 2 + totalShelfHeight / 2;
    
    const scaleChange = newScale / oldScale;
    setScale(newScale);
    setPosition({
      x: position.x + (shelfCenterX - position.x) * (1 - scaleChange),
      y: position.y + (shelfCenterY - position.y) * (1 - scaleChange),
    });
  };

  const handleFitToScreen = () => {
    const totalShelfWidth = shelfConfig.totalWidth * shelfConfig.units.length * CM_TO_PX;
    const totalShelfHeight = shelfConfig.totalHeight * CM_TO_PX;
    
    // Calculate optimal scale to fit the shelf with padding (留出10%边距)
    const paddingFactor = 0.9;
    const scaleX = (stageSize.width * paddingFactor) / totalShelfWidth;
    const scaleY = (stageSize.height * paddingFactor) / totalShelfHeight;
    
    // Use the smaller scale to ensure both dimensions fit
    // Cap between 0.1x (minimum) and 2x (maximum) for usability
    const newScale = Math.max(0.1, Math.min(2, Math.min(scaleX, scaleY)));
    
    // The shelf's original position (before any transform) in the stage
    const originalShelfX = (stageSize.width - totalShelfWidth) / 2;
    const originalShelfY = (stageSize.height - totalShelfHeight) / 2;
    
    // Calculate the shelf center in original coordinates
    const shelfCenterX = originalShelfX + totalShelfWidth / 2;
    const shelfCenterY = originalShelfY + totalShelfHeight / 2;
    
    // After scaling, the shelf center should be at the viewport center
    const viewportCenterX = stageSize.width / 2;
    const viewportCenterY = stageSize.height / 2;
    
    // Calculate position offset to center the scaled shelf
    setScale(newScale);
    setPosition({
      x: viewportCenterX - shelfCenterX * newScale,
      y: viewportCenterY - shelfCenterY * newScale,
    });
  };

  const togglePanMode = () => {
    setIsPanMode(!isPanMode);
  };

  // Calculate total shelf dimensions
  const totalShelfWidthPx = shelfConfig.totalWidth * shelfConfig.units.length * CM_TO_PX;
  const totalShelfHeightPx = shelfConfig.totalHeight * CM_TO_PX;
  const startX = (stageSize.width - totalShelfWidthPx) / 2;
  const startY = (stageSize.height - totalShelfHeightPx) / 2;

  const columnWidthPx = SHELF_DEFAULTS.COLUMN_WIDTH_CM * CM_TO_PX;
  const shelfThicknessPx = SHELF_DEFAULTS.SHELF_THICKNESS_CM * CM_TO_PX;
  const baseThicknessPx = SHELF_DEFAULTS.BASE_THICKNESS_CM * CM_TO_PX;
  const shelfShorterBy = 1 * CM_TO_PX; // 层板比货架宽度短1cm

  // Render a single shelf unit with its own layers
  const renderShelfUnit = (unitIndex: number) => {
    const unit = shelfConfig.units[unitIndex];
    if (!unit) return null;
    const unitX = unitIndex * shelfConfig.totalWidth * CM_TO_PX;
    const unitWidthPx = shelfConfig.totalWidth * CM_TO_PX;

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

        {/* Grid Lines (optional) */}
        {shelfConfig.showGrid && (
          <>
            {/* Vertical grid every 10cm */}
            {Array.from({ length: Math.floor(shelfConfig.totalWidth / 10) - 1 }).map((_, i) => (
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

        {/* Render layers for this specific unit */}
        {unit.layers.map((layer) => {
          const yPos = totalShelfHeightPx - (layer.yPosition * CM_TO_PX);
          const isBase = layer.yPosition === 0;
          const thickness = isBase ? baseThicknessPx : shelfThicknessPx;
          const shelfWidth = unitWidthPx - shelfShorterBy * 2;

          return (
            <Group key={layer.id} y={yPos}>
              {/* Shelf Surface */}
              <Rect
                x={shelfShorterBy}
                y={-thickness}
                width={shelfWidth}
                height={thickness}
                fill={SHELF_COLORS.COLOR_SHELF_SURFACE}
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
        <div>货架: {shelfConfig.units.length} × {shelfConfig.totalWidth}cm</div>
        <div>货架组: {shelfConfig.units.length}</div>
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
            // 在手抓模式下，总是允许拖动画布
            setIsDraggingStage(true);
          } else {
            // 普通模式：只有点击空白区域才允许拖动
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
        <Layer>
          {/* Main Shelf Group */}
          <Group x={startX} y={startY}>
            {/* Render all shelf units */}
            {Array.from({ length: shelfConfig.units.length }).map((_, i) => renderShelfUnit(i))}

            {/* Unit Separator Lines (dark lines between units) */}
            {Array.from({ length: shelfConfig.units.length - 1 }).map((_, i) => (
              <Line
                key={`separator-${i}`}
                points={[
                  (i + 1) * shelfConfig.totalWidth * CM_TO_PX, 
                  0, 
                  (i + 1) * shelfConfig.totalWidth * CM_TO_PX, 
                  totalShelfHeightPx
                ]}
                stroke="#333333"
                strokeWidth={3}
              />
            ))}

            {/* Layers are now rendered inside each unit's renderShelfUnit function */}

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

            {/* Horizontal Grid Lines are now rendered per unit inside renderShelfUnit */}

            {/* Measurements */}
            {shelfConfig.showMeasurements && (
              <>
                {/* Total Width Label */}
                <Text
                  x={totalShelfWidthPx / 2 - 40}
                  y={-30}
                  text={`${shelfConfig.totalWidth * shelfConfig.units.length} cm`}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#555"
                />
                
                {/* Height Label */}
                <Text
                  x={-50}
                  y={totalShelfHeightPx / 2}
                  text={`${shelfConfig.totalHeight} cm`}
                  fontSize={14}
                  fontStyle="bold"
                  fill="#555"
                  rotation={-90}
                />

                {/* Layer position labels - could be added per unit if needed */}
              </>
            )}

            {/* Items on Shelf */}
            {shelfItems.map((item) => {
              // Calculate absolute X position based on unit index
              const unitX = item.unitIndex * shelfConfig.totalWidth;
              const absoluteX = (unitX + item.x) * CM_TO_PX;
              
              return (
                <Group
                  key={item.uid}
                  x={absoluteX}
                  y={item.y * CM_TO_PX}
                  draggable={!isPanMode}
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
                    }
                  }}
                  onDragMove={(e) => {
                    if (!isPanMode) {
                      e.cancelBubble = true;
                      setIsDraggingStage(false);
                    }
                  }}
                  onDragEnd={(e) => {
                    if (!isPanMode) {
                      e.cancelBubble = true;
                      const newAbsoluteX = e.target.x() / CM_TO_PX;
                      const newY = e.target.y() / CM_TO_PX;
                      
                      // Determine which unit based on X position
                      const newUnitIndex = Math.floor(newAbsoluteX / shelfConfig.totalWidth);
                      const clampedUnitIndex = Math.max(0, Math.min(shelfConfig.units.length - 1, newUnitIndex));
                      const unitRelativeX = newAbsoluteX - (clampedUnitIndex * shelfConfig.totalWidth);
                      
                      // Apply gravity when dragging - snap to shelf surface
                      const itemBottomY = shelfConfig.totalHeight - newY - item.product.height;
                      const shelfSurfaceY = findNearestShelfBelow(clampedUnitIndex, itemBottomY);
                      const finalY = shelfConfig.totalHeight - shelfSurfaceY - item.product.height;
                      
                      updateItemPosition(item.uid, unitRelativeX, finalY);
                      setIsDraggingStage(false);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.evt.preventDefault();
                    removeItemFromShelf(item.uid);
                  }}
                >
                <Rect
                  width={item.product.width * CM_TO_PX}
                  height={item.product.height * CM_TO_PX}
                  fill={item.product.color}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth={2}
                  cornerRadius={3}
                  shadowColor="black"
                  shadowBlur={5}
                  shadowOpacity={0.3}
                  shadowOffsetY={2}
                />
                <Text
                  width={item.product.width * CM_TO_PX}
                  text={item.product.name}
                  fontSize={10}
                  fill="white"
                  align="center"
                  verticalAlign="middle"
                  y={item.product.height * CM_TO_PX / 2 - 5}
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
