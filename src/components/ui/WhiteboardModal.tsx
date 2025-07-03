"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Line, Rect } from 'react-konva';
import Konva from 'konva';
import { Button } from '@/components/ui/button';
import { 
  FaTimes, 
  FaPen, 
  FaEraser, 
  FaRuler, 
  FaTrash, 
  FaUndo, 
  FaRedo, 
  FaDownload,
  FaMinus,
  FaPlus
} from 'react-icons/fa';

interface WhiteboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (imageDataURL: string) => void;
}

interface DrawingLine {
  id: string;
  tool: 'pen' | 'eraser';
  points: number[];
  stroke: string;
  strokeWidth: number;
  globalCompositeOperation?: string;
}

interface StraightLine {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
}

const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'line'>('pen');
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [straightLines, setStraightLines] = useState<StraightLine[]>([]);
  const [history, setHistory] = useState<{ lines: DrawingLine[], straightLines: StraightLine[] }[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penSize, setPenSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(10);
  const [lineStart, setLineStart] = useState<{ x: number, y: number } | null>(null);
  const [tempLine, setTempLine] = useState<StraightLine | null>(null);

  const stageWidth = 800;
  const stageHeight = 600;

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push({ lines: [...lines], straightLines: [...straightLines] });
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [lines, straightLines, history, historyStep]);

  // Handle mouse/touch down
  const handleMouseDown = useCallback((e: any) => {
    if (!isOpen) return;
    
    const pos = e.target.getStage().getPointerPosition();
    setIsDrawing(true);

    if (tool === 'line') {
      if (!lineStart) {
        // Start drawing line
        setLineStart({ x: pos.x, y: pos.y });
      } else {
        // Finish drawing line
        const newLine: StraightLine = {
          id: Date.now().toString(),
          points: [lineStart.x, lineStart.y, pos.x, pos.y],
          stroke: '#000000',
          strokeWidth: penSize,
        };
        setStraightLines(prev => [...prev, newLine]);
        setLineStart(null);
        setTempLine(null);
        saveToHistory();
      }
    } else {
      // Start drawing freehand
      const newLine: DrawingLine = {
        id: Date.now().toString(),
        tool,
        points: [pos.x, pos.y],
        stroke: tool === 'pen' ? '#000000' : '#FFFFFF',
        strokeWidth: tool === 'pen' ? penSize : eraserSize,
        globalCompositeOperation: tool === 'eraser' ? 'destination-out' : 'source-over',
      };
      setLines(prev => [...prev, newLine]);
    }
  }, [tool, penSize, eraserSize, lineStart, isOpen, saveToHistory]);

  // Handle mouse/touch move
  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing || !isOpen) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();

    if (tool === 'line' && lineStart) {
      // Update temporary line preview
      setTempLine({
        id: 'temp',
        points: [lineStart.x, lineStart.y, point.x, point.y],
        stroke: '#000000',
        strokeWidth: penSize,
      });
    } else if (tool !== 'line') {
      // Continue freehand drawing
      setLines(prev => {
        const newLines = [...prev];
        const lastLine = newLines[newLines.length - 1];
        if (lastLine) {
          lastLine.points = lastLine.points.concat([point.x, point.y]);
        }
        return newLines;
      });
    }
  }, [isDrawing, tool, lineStart, penSize, isOpen]);

  // Handle mouse/touch up
  const handleMouseUp = useCallback(() => {
    if (tool !== 'line') {
      setIsDrawing(false);
      saveToHistory();
    }
  }, [tool, saveToHistory]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setLines([]);
    setStraightLines([]);
    setLineStart(null);
    setTempLine(null);
    saveToHistory();
  }, [saveToHistory]);

  // Undo
  const undo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      const prevState = history[prevStep];
      setLines(prevState.lines);
      setStraightLines(prevState.straightLines);
      setHistoryStep(prevStep);
    }
  }, [history, historyStep]);

  // Redo
  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      const nextState = history[nextStep];
      setLines(nextState.lines);
      setStraightLines(nextState.straightLines);
      setHistoryStep(nextStep);
    }
  }, [history, historyStep]);

  // Save/Download canvas
  const saveCanvas = useCallback(() => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 2,
      });
      
      if (onSave) {
        onSave(dataURL);
      } else {
        // Download the image
        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }, [onSave]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLines([]);
      setStraightLines([]);
      setHistory([]);
      setHistoryStep(-1);
      setLineStart(null);
      setTempLine(null);
      setIsDrawing(false);
    }
  }, [isOpen]);

  // Cancel line drawing on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && tool === 'line' && lineStart) {
        setLineStart(null);
        setTempLine(null);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, tool, lineStart]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Whiteboard</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            {/* Tools */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 border">
              <Button
                variant={tool === 'pen' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTool('pen');
                  setLineStart(null);
                  setTempLine(null);
                }}
                className="h-8 w-8 p-0"
              >
                <FaPen size={14} />
              </Button>
              <Button
                variant={tool === 'eraser' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setTool('eraser');
                  setLineStart(null);
                  setTempLine(null);
                }}
                className="h-8 w-8 p-0"
              >
                <FaEraser size={14} />
              </Button>
              <Button
                variant={tool === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTool('line')}
                className="h-8 w-8 p-0"
              >
                <FaRuler size={14} />
              </Button>
            </div>

            {/* Size Controls */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 border">
              <span className="text-sm font-medium">
                {tool === 'eraser' ? 'Eraser' : 'Pen'} Size:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (tool === 'eraser') {
                    setEraserSize(Math.max(5, eraserSize - 5));
                  } else {
                    setPenSize(Math.max(1, penSize - 1));
                  }
                }}
                className="h-6 w-6 p-0"
              >
                <FaMinus size={10} />
              </Button>
              <span className="min-w-[2rem] text-center text-sm">
                {tool === 'eraser' ? eraserSize : penSize}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (tool === 'eraser') {
                    setEraserSize(Math.min(50, eraserSize + 5));
                  } else {
                    setPenSize(Math.min(20, penSize + 1));
                  }
                }}
                className="h-6 w-6 p-0"
              >
                <FaPlus size={10} />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyStep <= 0}
              className="h-8"
            >
              <FaUndo size={14} className="mr-1" />
              Undo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyStep >= history.length - 1}
              className="h-8"
            >
              <FaRedo size={14} className="mr-1" />
              Redo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="h-8"
            >
              <FaTrash size={14} className="mr-1" />
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={saveCanvas}
              className="h-8"
            >
              <FaDownload size={14} className="mr-1" />
              Save
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
          <div className="bg-white border-2 border-gray-300 rounded-lg shadow-inner">
            <Stage
              ref={stageRef}
              width={stageWidth}
              height={stageHeight}
              onMouseDown={handleMouseDown}
              onMousemove={handleMouseMove}
              onMouseup={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <Layer>
                {/* Background */}
                <Rect
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  fill="white"
                />
                
                {/* Freehand lines */}
                {lines.map((line) => (
                  <Line
                    key={line.id}
                    points={line.points}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={line.globalCompositeOperation}
                  />
                ))}
                
                {/* Straight lines */}
                {straightLines.map((line) => (
                  <Line
                    key={line.id}
                    points={line.points}
                    stroke={line.stroke}
                    strokeWidth={line.strokeWidth}
                    lineCap="round"
                  />
                ))}
                
                {/* Temporary line preview */}
                {tempLine && (
                  <Line
                    points={tempLine.points}
                    stroke={tempLine.stroke}
                    strokeWidth={tempLine.strokeWidth}
                    lineCap="round"
                    opacity={0.7}
                    dash={[5, 5]}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-gray-50 border-t text-sm text-gray-600">
          {tool === 'line' && !lineStart && (
            <span>Click to start drawing a straight line</span>
          )}
          {tool === 'line' && lineStart && (
            <span>Click to finish the line, or press Escape to cancel</span>
          )}
          {tool === 'pen' && (
            <span>Click and drag to draw with the pen</span>
          )}
          {tool === 'eraser' && (
            <span>Click and drag to erase</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardModal; 