import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Square, Circle, Minus, ArrowRight, Eraser, RotateCcw, Trash2 } from 'lucide-react';

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<any>(null);
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'line' | 'arrow' | 'eraser'>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ready, setReady] = useState(false);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const shapeRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Canvas, Rect, Ellipse, Line } = await import('fabric');
      if (cancelled || !canvasRef.current) return;

      const container = canvasRef.current.parentElement!;
      const c = new Canvas(canvasRef.current, {
        width: container.clientWidth || 600,
        height: 450,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
        isDrawingMode: false,
      });

      (window as any).__fabricRect = Rect;
      (window as any).__fabricEllipse = Ellipse;
      (window as any).__fabricLine = Line;

      c.on('object:modified', () => {
        const state = JSON.stringify(c);
        setHistory(prev => {
          const next = prev.slice(0, historyIndex + 1);
          next.push(state);
          return next;
        });
        setHistoryIndex(prev => prev + 1);
      });

      setCanvas(c);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!canvas) return;
    canvas.isDrawingMode = tool === 'pen';
    if (tool === 'pen') {
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = strokeWidth;
    }
    if (tool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = '#ffffff';
      canvas.freeDrawingBrush.width = strokeWidth * 4;
    }
    canvas.selection = tool !== 'pen' && tool !== 'eraser';
    canvas.defaultCursor = (tool !== 'pen' && tool !== 'eraser') ? 'crosshair' : 'default';
  }, [tool, color, strokeWidth, canvas]);

  const getPointer = useCallback((e: any) => {
    if (!canvas) return { x: 0, y: 0 };
    return canvas.getPointer(e);
  }, [canvas]);

  const handleMouseDown = useCallback((e: any) => {
    if (tool === 'pen' || tool === 'eraser' || !canvas) return;
    setIsDrawing(true);
    const pointer = getPointer(e);
    startPos.current = pointer;

    const Rect = (window as any).__fabricRect;
    const Ellipse = (window as any).__fabricEllipse;
    const Line = (window as any).__fabricLine;
    if (!Rect || !Ellipse || !Line) return;

    let shape: any = null;
    if (tool === 'rect') {
      shape = new Rect({
        left: pointer.x, top: pointer.y, width: 0, height: 0,
        fill: 'transparent', stroke: color, strokeWidth,
      });
    } else if (tool === 'circle') {
      shape = new Ellipse({
        left: pointer.x, top: pointer.y, rx: 0, ry: 0,
        fill: 'transparent', stroke: color, strokeWidth,
      });
    } else if (tool === 'line' || tool === 'arrow') {
      shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
        stroke: color, strokeWidth,
      });
    }
    if (shape) {
      shapeRef.current = shape;
      canvas.add(shape);
      canvas.renderAll();
    }
  }, [tool, canvas, color, strokeWidth, getPointer]);

  const handleMouseMove = useCallback((e: any) => {
    if (!isDrawing || !canvas || !shapeRef.current) return;
    const pointer = getPointer(e);
    const shape = shapeRef.current;
    const start = startPos.current;

    if (tool === 'rect') {
      const w = pointer.x - start.x;
      const h = pointer.y - start.y;
      shape.set({ width: Math.abs(w), height: Math.abs(h), left: w > 0 ? start.x : pointer.x, top: h > 0 ? start.y : pointer.y });
    } else if (tool === 'circle') {
      const rx = Math.abs(pointer.x - start.x) / 2;
      const ry = Math.abs(pointer.y - start.y) / 2;
      shape.set({ rx, ry, left: (start.x + pointer.x) / 2, top: (start.y + pointer.y) / 2 });
    } else if (tool === 'line' || tool === 'arrow') {
      shape.set({ x2: pointer.x, y2: pointer.y });
    }
    canvas.renderAll();
  }, [isDrawing, canvas, tool, getPointer]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && shapeRef.current && canvas) {
      setIsDrawing(false);
      const state = JSON.stringify(canvas);
      setHistory(prev => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(state);
        return next;
      });
      setHistoryIndex(prev => prev + 1);
      shapeRef.current = null;
    }
  }, [isDrawing, canvas, historyIndex]);

  useEffect(() => {
    if (!canvas) return;
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [canvas, handleMouseDown, handleMouseMove, handleMouseUp]);

  const undo = () => {
    if (historyIndex < 0 || !canvas) return;
    const newIdx = historyIndex - 1;
    if (newIdx >= 0) {
      canvas.loadFromJSON(JSON.parse(history[newIdx]), () => canvas.renderAll());
    } else {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
    setHistoryIndex(newIdx);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1 || !canvas) return;
    const newIdx = historyIndex + 1;
    canvas.loadFromJSON(JSON.parse(history[newIdx]), () => canvas.renderAll());
    setHistoryIndex(newIdx);
  };

  const clear = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    setHistory([]);
    setHistoryIndex(-1);
  };

  const colors = ['#1e293b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#78716c', '#000000'];

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-sm">
        Loading drawing canvas...
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
        <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition ${tool === 'pen' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Pen"><Pencil size={16} /></button>
        <button onClick={() => setTool('rect')} className={`p-2 rounded-lg transition ${tool === 'rect' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Rectangle"><Square size={16} /></button>
        <button onClick={() => setTool('circle')} className={`p-2 rounded-lg transition ${tool === 'circle' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Circle"><Circle size={16} /></button>
        <button onClick={() => setTool('line')} className={`p-2 rounded-lg transition ${tool === 'line' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Line"><Minus size={16} /></button>
        <button onClick={() => setTool('arrow')} className={`p-2 rounded-lg transition ${tool === 'arrow' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Arrow"><ArrowRight size={16} /></button>
        <button onClick={() => setTool('eraser')} className={`p-2 rounded-lg transition ${tool === 'eraser' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Eraser"><Eraser size={16} /></button>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <div className="flex items-center gap-1">
          {colors.map(c => (
            <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 transition ${color === c ? 'border-slate-800 scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0" title="Custom color" />

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <input type="range" min="1" max="20" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-16 h-1 accent-emerald-600" title="Stroke width" />
        <span className="text-xs text-slate-500 w-4">{strokeWidth}</span>

        <div className="w-px h-6 bg-slate-300 mx-1" />

        <button onClick={undo} disabled={historyIndex < 0} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition" title="Undo"><RotateCcw size={16} /></button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition" title="Redo"><RotateCcw size={16} className="scale-x-[-1]" /></button>
        <button onClick={clear} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition" title="Clear"><Trash2 size={16} /></button>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
