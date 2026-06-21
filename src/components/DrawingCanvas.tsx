import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Square, Circle, Minus, ArrowRight, Eraser, RotateCcw, Trash2 } from 'lucide-react';

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'line' | 'arrow' | 'eraser'>('pen');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const snapshots = useRef<string[]>([]);
  const snapshotIndex = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.clientWidth || 600;
    canvas.height = 450;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    setCtx(context);

    saveSnapshot(context, canvas.width, canvas.height);
  }, []);

  const saveSnapshot = (c: CanvasRenderingContext2D, w: number, h: number) => {
    const data = c.getImageData(0, 0, w, h);
    const url = JSON.stringify(data);
    snapshots.current = snapshots.current.slice(0, snapshotIndex.current + 1);
    snapshots.current.push(url);
    snapshotIndex.current++;
  };

  const restoreSnapshot = (idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx || idx < 0 || idx >= snapshots.current.length) return;
    const data = JSON.parse(snapshots.current[idx]) as ImageData;
    ctx.putImageData(data, 0, 0);
    snapshotIndex.current = idx;
  };

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return;
    const pos = getPos(e);
    startPos.current = pos;
    lastPos.current = pos;
    setIsDrawing(true);

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? strokeWidth * 6 : strokeWidth;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  }, [ctx, tool, color, strokeWidth, getPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    if (tool === 'pen' || tool === 'eraser') {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? strokeWidth * 6 : strokeWidth;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
      return;
    }

    ctx.putImageData(JSON.parse(snapshots.current[snapshotIndex.current]), 0, 0);
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    const start = startPos.current;

    if (tool === 'rect') {
      ctx.strokeRect(start.x, start.y, pos.x - start.x, pos.y - start.y);
    } else if (tool === 'circle') {
      const rx = Math.abs(pos.x - start.x) / 2;
      const ry = Math.abs(pos.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse((start.x + pos.x) / 2, (start.y + pos.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === 'line' || tool === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      if (tool === 'arrow') {
        const angle = Math.atan2(pos.y - start.y, pos.x - start.x);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  }, [isDrawing, ctx, tool, color, strokeWidth, getPos]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !ctx) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) saveSnapshot(ctx, canvas.width, canvas.height);
  }, [isDrawing, ctx]);

  const undo = () => {
    if (snapshotIndex.current > 0) restoreSnapshot(snapshotIndex.current - 1);
  };

  const redo = () => {
    if (snapshotIndex.current < snapshots.current.length - 1) restoreSnapshot(snapshotIndex.current + 1);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveSnapshot(ctx, canvas.width, canvas.height);
  };

  const colors = ['#1e293b', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#78716c', '#000000'];

  if (!ctx) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl border border-slate-200 text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading drawing canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="flex flex-wrap items-center gap-1.5 mb-3 p-2 bg-slate-50 rounded-xl border border-slate-200">
        <button onClick={() => setTool('pen')} className={`p-2 rounded-lg transition ${tool === 'pen' ? 'bg-emerald-200 text-emerald-900 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`} title="Freehand Pen"><Pencil size={16} /></button>
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
        <button onClick={undo} disabled={snapshotIndex.current <= 0} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition" title="Undo"><RotateCcw size={16} /></button>
        <button onClick={redo} disabled={snapshotIndex.current >= snapshots.current.length - 1} className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition" title="Redo"><RotateCcw size={16} className="scale-x-[-1]" /></button>
        <button onClick={clearCanvas} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition" title="Clear Canvas"><Trash2 size={16} /></button>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white" style={{ height: 450 }}>
        <canvas
          ref={canvasRef}
          className="cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
