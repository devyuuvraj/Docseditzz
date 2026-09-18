import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as fabric from 'fabric';
import { PDFDocument } from 'pdf-lib';
import toast from 'react-hot-toast';
import {
  MousePointer2, Pencil, Highlighter, Underline, Strikethrough, Eraser, Type,
  StickyNote, Square, Circle as CircleIcon, ArrowRight, Image as ImageIcon,
  PenLine, Droplets, Undo2, Redo2, Trash2, Copy, BringToFront, SendToBack,
  RotateCw, Download, Save, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Sparkles, X, Loader2,
} from 'lucide-react';
import { loadPdfDocument, renderPageToCanvas } from '../../lib/pdf.js';
import api, { apiErrorMessage } from '../../lib/axios.js';
import { getDocument as fetchDocMeta } from '../../services/files.service.js';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts.js';
import Dropzone from '../../components/upload/Dropzone.jsx';
import AiSetupNotice from '../../components/tools/AiSetupNotice.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Logo from '../../components/layout/Logo.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';
import PageLoader from '../../components/ui/PageLoader.jsx';
import { cn } from '../../lib/utils.js';

const COLORS = ['#111827', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'];

const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select / Move' },
  { id: 'draw', icon: Pencil, label: 'Freehand draw' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'underline', icon: Underline, label: 'Underline' },
  { id: 'strike', icon: Strikethrough, label: 'Strikethrough' },
  { id: 'erase', icon: Eraser, label: 'Erase (letter → paragraph via size)' },
  { id: 'text', icon: Type, label: 'Add text' },
  { id: 'note', icon: StickyNote, label: 'Sticky note' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: CircleIcon, label: 'Circle' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'image', icon: ImageIcon, label: 'Insert image' },
  { id: 'signature', icon: PenLine, label: 'Signature' },
  { id: 'watermark', icon: Droplets, label: 'Watermark' },
];

const AI_ACTIONS = [
  { value: 'explain', label: 'Explain' }, { value: 'rewrite', label: 'Rewrite' },
  { value: 'grammar', label: 'Fix grammar' }, { value: 'simplify', label: 'Simplify' },
  { value: 'expand', label: 'Expand' }, { value: 'translate', label: 'Translate' },
  { value: 'professional', label: 'Professional tone' }, { value: 'academic', label: 'Academic tone' },
  { value: 'legal', label: 'Legal tone' }, { value: 'medical', label: 'Medical tone' },
];

export default function PdfEditor() {
  const { documentId } = useParams();
  const containerRef = useRef(null);
  const pdfCanvasRef = useRef(null);
  const fabricElRef = useRef(null);
  const fabricRef = useRef(null);
  const pdfDocRef = useRef(null);
  const originalBytesRef = useRef(null);
  const annotationsRef = useRef({}); // pageNumber -> fabric JSON
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const suppressHistoryRef = useRef(false);
  const imageInputRef = useRef(null);
  const applyToolRef = useRef(() => {});

  const [docMeta, setDocMeta] = useState(null);
  const [loading, setLoading] = useState(!!documentId);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [zoom, setZoom] = useState(1.4);
  const [tool, setTool] = useState('select');
  const toolRef = useRef(tool);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(4);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);

  const syncColor = useCallback((nextColor) => {
    colorRef.current = nextColor;
    setColor(nextColor);
  }, []);

  const syncBrushSize = useCallback((nextSize) => {
    brushSizeRef.current = nextSize;
    setBrushSize(nextSize);
  }, []);

  const lineThickness = (size = brushSizeRef.current) => Math.max(2, Math.round(size * 0.75));
  const textFontSize = (size = brushSizeRef.current) => Math.max(12, Math.round(size * 1.8));
  const [hasSelection, setHasSelection] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  // Signature modal
  const [sigOpen, setSigOpen] = useState(false);
  const sigCanvasRef = useRef(null);
  const sigFabricRef = useRef(null);
  // AI panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiAction, setAiAction] = useState('explain');
  const [aiLanguage, setAiLanguage] = useState('Spanish');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  /* ---------------- History ---------------- */

  const pushHistory = useCallback(() => {
    if (suppressHistoryRef.current || !fabricRef.current) return;
    const snapshot = JSON.stringify(fabricRef.current.toJSON());
    const stack = undoStackRef.current;
    if (stack[stack.length - 1] === snapshot) return;
    stack.push(snapshot);
    if (stack.length > 60) stack.shift();
    redoStackRef.current = [];
  }, []);

  const seedHistory = useCallback((canvas = fabricRef.current) => {
    if (!canvas) return;
    undoStackRef.current = [JSON.stringify(canvas.toJSON())];
    redoStackRef.current = [];
  }, []);

  const applyState = async (json) => {
    suppressHistoryRef.current = true;
    await fabricRef.current.loadFromJSON(JSON.parse(json));
    fabricRef.current.renderAll();
    suppressHistoryRef.current = false;
    applyToolRef.current(toolRef.current, fabricRef.current);
  };

  const undo = useCallback(async () => {
    const stack = undoStackRef.current;
    if (stack.length <= 1 || !fabricRef.current) return;
    const current = stack.pop();
    redoStackRef.current.push(current);
    await applyState(stack[stack.length - 1]);
  }, []);

  const redo = useCallback(async () => {
    if (!redoStackRef.current.length || !fabricRef.current) return;
    const next = redoStackRef.current.pop();
    undoStackRef.current.push(next);
    await applyState(next);
  }, []);

  const updateActiveObjectStyle = useCallback((canvas, { nextColor, nextSize } = {}) => {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    if (obj.type === 'i-text' || obj.type === 'textbox') {
      if (nextColor) obj.set({ fill: nextColor });
      if (nextSize) obj.set({ fontSize: textFontSize(nextSize) });
    } else if (obj.type === 'rect' && (obj.height || 0) <= 12) {
      if (nextColor) obj.set({ fill: nextColor });
      if (nextSize) obj.set({ height: lineThickness(nextSize) });
    } else if (nextColor && obj.stroke) {
      obj.set({ stroke: nextColor });
      if (obj.fill && obj.fill !== 'transparent') obj.set({ fill: nextColor });
    } else if (nextColor && obj.fill && obj.fill !== 'transparent') {
      obj.set({ fill: nextColor });
    }

    obj.setCoords();
    canvas.fire('object:modified', { target: obj });
    canvas.requestRenderAll();
  }, []);

  /* ---------------- Page rendering ---------------- */

  const saveCurrentAnnotations = useCallback(() => {
    if (fabricRef.current) {
      annotationsRef.current[pageNum] = fabricRef.current.toJSON();
    }
  }, [pageNum]);

  const renderPage = useCallback(
    async (targetPage, targetZoom = zoom) => {
      const pdf = pdfDocRef.current;
      if (!pdf) return;
      const page = await pdf.getPage(targetPage);
      const { width, height } = await renderPageToCanvas(page, pdfCanvasRef.current, targetZoom);

      // (Re)create fabric canvas at the right size
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
      const canvas = new fabric.Canvas(fabricElRef.current, {
        width,
        height,
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // Restore annotations for this page
      const saved = annotationsRef.current[targetPage];
      if (saved) {
        suppressHistoryRef.current = true;
        await canvas.loadFromJSON(saved);
        canvas.renderAll();
        suppressHistoryRef.current = false;
      }

      undoStackRef.current = [];
      redoStackRef.current = [];

      canvas.on('path:created', pushHistory);
      canvas.on('object:added', pushHistory);
      canvas.on('object:modified', pushHistory);
      canvas.on('object:removed', pushHistory);
      canvas.on('selection:created', () => setHasSelection(true));
      canvas.on('selection:updated', () => setHasSelection(true));
      canvas.on('selection:cleared', () => setHasSelection(false));

      seedHistory(canvas);
      applyTool(tool, canvas);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zoom, tool, pushHistory, seedHistory]
  );

  const openPdf = useCallback(
    async (bytes) => {
      originalBytesRef.current = bytes;
      const pdf = await loadPdfDocument(bytes.slice(0));
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setPageNum(1);
      setTimeout(() => renderPage(1), 0);
    },
    [renderPage]
  );

  // Load a stored document if /editor/:documentId
  useEffect(() => {
    if (!documentId) return;
    (async () => {
      try {
        const meta = await fetchDocMeta(documentId);
        setDocMeta(meta);
        if (meta.annotations) annotationsRef.current = meta.annotations;
        const res = await api.get(`/documents/${documentId}/download`, { responseType: 'arraybuffer' });
        await openPdf(res.data);
      } catch (error) {
        toast.error(apiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId, openPdf]);

  const goToPage = async (target) => {
    if (target < 1 || target > numPages) return;
    saveCurrentAnnotations();
    setPageNum(target);
    await renderPage(target);
  };

  const changeZoom = async (delta) => {
    const next = Math.min(4, Math.max(0.5, zoom + delta));
    saveCurrentAnnotations();
    setZoom(next);
    await renderPage(pageNum, next);
  };

  /* ---------------- Tools ---------------- */

  const toolHandlerRef = useRef(null);

  const applyTool = (toolId, canvas = fabricRef.current) => {
    if (!canvas) return;
    canvas.isDrawingMode = false;
    canvas.defaultCursor = 'default';
    if (toolHandlerRef.current) {
      canvas.off('mouse:down', toolHandlerRef.current);
      toolHandlerRef.current = null;
    }

    const activeColor = colorRef.current;
    const activeSize = brushSizeRef.current;

    if (toolId === 'draw' || toolId === 'erase' || toolId === 'highlight') {
      const brush = new fabric.PencilBrush(canvas);
      if (toolId === 'draw') {
        brush.color = activeColor;
        brush.width = activeSize;
      } else if (toolId === 'highlight') {
        brush.color = activeColor + '55';
        brush.width = Math.max(12, activeSize * 4);
      } else {
        brush.color = '#ffffff';
        brush.width = activeSize * 4;
      }
      canvas.freeDrawingBrush = brush;
      canvas.isDrawingMode = true;
    } else if (['underline', 'strike', 'text', 'note', 'rect', 'circle', 'arrow'].includes(toolId)) {
      canvas.defaultCursor = 'crosshair';
      const handler = (opt) => {
        if (opt.target) return; // clicked an existing object
        const { x, y } = canvas.getScenePoint(opt.e);
        addObjectAt(toolId, x, y, canvas);
      };
      toolHandlerRef.current = handler;
      canvas.on('mouse:down', handler);
    }
  };
  applyToolRef.current = applyTool;

  const addObjectAt = (toolId, x, y, canvas) => {
    const activeColor = colorRef.current;
    const activeSize = brushSizeRef.current;
    let obj;
    if (toolId === 'underline' || toolId === 'strike') {
      const height = lineThickness(activeSize);
      obj = new fabric.Rect({
        left: x, top: y, width: 120, height,
        fill: activeColor, rx: 1.5, ry: 1.5,
      });
    } else if (toolId === 'text') {
      obj = new fabric.IText('Edit me', {
        left: x, top: y, fontSize: textFontSize(activeSize), fill: activeColor, fontFamily: 'Helvetica',
      });
    } else if (toolId === 'note') {
      const rect = new fabric.Rect({
        width: 160, height: 120, fill: '#fef08a', rx: 8, ry: 8,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.25)', blur: 8, offsetY: 3 }),
      });
      const textbox = new fabric.Textbox('Sticky note…', {
        width: 140, left: 10, top: 12, fontSize: 13, fill: '#713f12', fontFamily: 'Helvetica',
      });
      obj = new fabric.Group([rect, textbox], { left: x, top: y });
    } else if (toolId === 'rect') {
      obj = new fabric.Rect({
        left: x, top: y, width: 120, height: 80, fill: 'transparent',
        stroke: activeColor, strokeWidth: Math.max(1.5, activeSize * 0.6), rx: 4, ry: 4,
      });
    } else if (toolId === 'circle') {
      obj = new fabric.Circle({
        left: x, top: y, radius: 48, fill: 'transparent', stroke: activeColor, strokeWidth: Math.max(1.5, activeSize * 0.6),
      });
    } else if (toolId === 'arrow') {
      const line = new fabric.Line([0, 0, 110, 0], { stroke: activeColor, strokeWidth: Math.max(2, activeSize * 0.75) });
      const head = new fabric.Triangle({
        left: 110, top: -7, width: 14, height: 14, angle: 90, fill: activeColor,
      });
      obj = new fabric.Group([line, head], { left: x, top: y });
    }
    if (obj) {
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      setTool('select');
      applyTool('select', canvas);
      setToolState('select');
    }
  };

  // small helper so the toolbar reflects auto-switch back to select
  const setToolState = (id) => setTool(id);

  const selectTool = (id) => {
    if (id === 'image') {
      imageInputRef.current?.click();
      return;
    }
    if (id === 'signature') {
      setSigOpen(true);
      return;
    }
    if (id === 'watermark') {
      addWatermark();
      return;
    }
    setTool(id);
    applyTool(id);
  };

  const addWatermark = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = window.prompt('Watermark text:', 'CONFIDENTIAL');
    if (!text) return;
    const wm = new fabric.IText(text, {
      left: canvas.getWidth() / 2, top: canvas.getHeight() / 2,
      originX: 'center', originY: 'center',
      fontSize: 52, fill: '#9ca3af', opacity: 0.35, angle: -35, fontFamily: 'Helvetica',
    });
    canvas.add(wm);
    canvas.renderAll();
  };

  const onImagePicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await fabric.FabricImage.fromURL(reader.result);
      const canvas = fabricRef.current;
      const maxW = canvas.getWidth() * 0.5;
      if (img.width > maxW) img.scaleToWidth(maxW);
      img.set({ left: 60, top: 60 });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    };
    reader.readAsDataURL(file);
  };

  /* ---------------- Selection actions ---------------- */

  const withSelection = (fn) => {
    const canvas = fabricRef.current;
    const objs = canvas?.getActiveObjects() || [];
    if (!objs.length) return toast('Select an object first', { icon: '👆' });
    fn(canvas, objs);
    canvas.discardActiveObject();
    canvas.renderAll();
    pushHistory();
  };

  const deleteSelected = () => withSelection((c, objs) => objs.forEach((o) => c.remove(o)));
  const duplicateSelected = () =>
    withSelection(async (c, objs) => {
      for (const o of objs) {
        const clone = await o.clone();
        clone.set({ left: o.left + 24, top: o.top + 24 });
        c.add(clone);
      }
    });
  const rotateSelected = () => withSelection((_c, objs) => objs.forEach((o) => o.rotate(((o.angle || 0) + 45) % 360)));
  const bringForward = () => withSelection((c, objs) => objs.forEach((o) => c.bringObjectForward(o)));
  const sendBackward = () => withSelection((c, objs) => objs.forEach((o) => c.sendObjectBackwards(o)));

  useKeyboardShortcuts(
    {
      'ctrl+z': undo,
      'ctrl+shift+z': redo,
      'ctrl+y': redo,
      delete: deleteSelected,
      backspace: deleteSelected,
      'ctrl+d': duplicateSelected,
      'ctrl+s': () => saveToLibrary(),
    },
    !!pdfDocRef.current
  );

  /* ---------------- Signature modal ---------------- */

  useEffect(() => {
    if (!sigOpen) return;
    const t = setTimeout(() => {
      const canvas = new fabric.Canvas(sigCanvasRef.current, { width: 420, height: 180, isDrawingMode: true });
      const brush = new fabric.PencilBrush(canvas);
      brush.color = '#1e293b';
      brush.width = 3;
      canvas.freeDrawingBrush = brush;
      sigFabricRef.current = canvas;
    }, 60);
    return () => {
      clearTimeout(t);
      sigFabricRef.current?.dispose();
      sigFabricRef.current = null;
    };
  }, [sigOpen]);

  const insertSignature = async () => {
    const sig = sigFabricRef.current;
    if (!sig || !sig.getObjects().length) return toast.error('Draw your signature first');
    const dataUrl = sig.toDataURL({ format: 'png', multiplier: 2 });
    setSigOpen(false);
    const img = await fabric.FabricImage.fromURL(dataUrl);
    img.scaleToWidth(200);
    img.set({ left: 80, top: fabricRef.current.getHeight() - 160 });
    fabricRef.current.add(img);
    fabricRef.current.setActiveObject(img);
    fabricRef.current.renderAll();
  };

  /* ---------------- Export / save ---------------- */

  const buildFlattenedPdf = async () => {
    saveCurrentAnnotations();
    const srcPdf = pdfDocRef.current;
    const out = await PDFDocument.create();
    const exportScale = 2;

    for (let p = 1; p <= numPages; p++) {
      const page = await srcPdf.getPage(p);
      const viewport = page.getViewport({ scale: exportScale });

      // Render the original page
      const base = document.createElement('canvas');
      base.width = viewport.width;
      base.height = viewport.height;
      await page.render({ canvasContext: base.getContext('2d'), viewport }).promise;

      // Overlay annotations (fabric JSON was captured at current zoom scale)
      const saved = annotationsRef.current[p];
      if (saved && saved.objects?.length) {
        const overlayEl = document.createElement('canvas');
        const overlay = new fabric.StaticCanvas(overlayEl, {
          width: viewport.width,
          height: viewport.height,
        });
        await overlay.loadFromJSON(saved);
        // annotations were drawn at `zoom` scale; rescale to export scale
        const factor = exportScale / zoom;
        overlay.getObjects().forEach((o) => {
          o.scaleX *= factor;
          o.scaleY *= factor;
          o.left *= factor;
          o.top *= factor;
          o.setCoords();
        });
        overlay.renderAll();
        base.getContext('2d').drawImage(overlayEl, 0, 0);
        overlay.dispose();
      }

      const jpegDataUrl = base.toDataURL('image/jpeg', 0.92);
      const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
      const img = await out.embedJpg(jpegBytes);
      const pdfPage = out.addPage([viewport.width / exportScale, viewport.height / exportScale]);
      pdfPage.drawImage(img, { x: 0, y: 0, width: pdfPage.getWidth(), height: pdfPage.getHeight() });
    }
    return out.save();
  };

  const downloadPdf = async () => {
    setExporting(true);
    try {
      const bytes = await buildFlattenedPdf();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (docMeta?.name || 'edited').replace(/\.pdf$/i, '') + '-edited.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('PDF exported');
    } catch (error) {
      toast.error('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const saveToLibrary = async () => {
    if (!documentId) return downloadPdf();
    setSaving(true);
    try {
      saveCurrentAnnotations();
      const bytes = await buildFlattenedPdf();
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'application/pdf' }), docMeta?.name || 'edited.pdf');
      form.append('label', 'Editor save');
      form.append('annotations', JSON.stringify(annotationsRef.current));
      await api.post(`/documents/${documentId}/version`, form);
      toast.success('Saved to your library (previous version kept)');
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- AI panel ---------------- */

  const runAi = async () => {
    if (!aiText.trim()) return toast.error('Paste or type some text first');
    setAiLoading(true);
    setAiResult('');
    try {
      const { data } = await api.post('/ai/transform', {
        text: aiText,
        action: aiAction,
        ...(aiAction === 'translate' ? { language: aiLanguage } : {}),
      });
      setAiResult(data.data.result);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setAiLoading(false);
    }
  };

  /* ---------------- Render ---------------- */

  if (loading) return <PageLoader fullscreen label="Opening document…" />;

  if (!pdfDocRef.current && !documentId) {
    return (
      <div className="gradient-bg flex min-h-screen flex-col bg-surface-50 dark:bg-surface-950">
        <header className="flex items-center justify-between px-6 py-4">
          <Logo to="/dashboard" />
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-xl">
            <h1 className="mb-2 text-center text-2xl font-black text-slate-900 dark:text-white">
              Advanced PDF Editor
            </h1>
            <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Draw, highlight, erase, sign, annotate — then export a flattened PDF.
            </p>
            <Dropzone
              onFiles={async (files) => {
                const buf = await files[0].arrayBuffer();
                await openPdf(buf);
              }}
              multiple={false}
              accept={{ 'application/pdf': ['.pdf'] }}
              label="Drop a PDF to start editing"
            />
            <p className="mt-4 text-center">
              <Link to="/dashboard" className="text-sm text-brand-600 hover:underline dark:text-brand-300">
                ← Back to dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-surface-950">
      {/* Top bar */}
      <header className="glass-strong z-10 flex items-center gap-2 border-b border-slate-200/60 px-3 py-2 dark:border-white/5 sm:px-4">
        <Logo to="/dashboard" compact />
        <p className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
          {docMeta?.name || 'Untitled.pdf'}
        </p>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">AI</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={saveToLibrary} loading={saving}>
            <Save className="h-4 w-4" /> <span className="hidden sm:inline">Save</span>
          </Button>
          <Button size="sm" onClick={downloadPdf} loading={exporting}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left toolbar */}
        <aside className="glass-strong flex w-14 flex-col items-center gap-1 overflow-y-auto border-r border-slate-200/60 py-3 dark:border-white/5">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              title={label}
              onClick={() => selectTool(id)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                tool === id
                  ? 'bg-gradient-to-br from-brand-600 to-accent-600 text-white shadow-lg'
                  : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-white/10'
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </button>
          ))}

          <div className="my-2 h-px w-8 bg-slate-200 dark:bg-white/10" />

          {/* Colors */}
          <div className="flex flex-col gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  syncColor(c);
                  applyTool(tool);
                  updateActiveObjectStyle(fabricRef.current, { nextColor: c });
                }}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                  color === c ? 'border-brand-500 scale-110' : 'border-slate-300 dark:border-white/20'
                )}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>

          <div className="my-2 h-px w-8 bg-slate-200 dark:bg-white/10" />
          <div className="flex flex-col items-center gap-1">
            <span
              className="rounded-full border border-slate-300 dark:border-white/20"
              style={{
                width: 18,
                height: ['underline', 'strike'].includes(tool)
                  ? lineThickness()
                  : tool === 'text'
                  ? Math.min(18, textFontSize() / 2)
                  : Math.max(4, brushSize),
                backgroundColor: color,
              }}
              title="Preview"
            />
            <input
              type="range"
              min={1}
              max={20}
              value={brushSize}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                syncBrushSize(nextSize);
                applyTool(tool);
                updateActiveObjectStyle(fabricRef.current, { nextSize });
              }}
              className="h-20 w-6 accent-brand-600"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              title={
                tool === 'text'
                  ? `Text size: ${textFontSize()}px`
                  : ['underline', 'strike'].includes(tool)
                  ? `Line thickness: ${lineThickness()}px`
                  : `Brush size: ${brushSize}`
              }
            />
            <span className="text-[10px] font-semibold text-slate-400">
              {tool === 'text'
                ? textFontSize()
                : ['underline', 'strike'].includes(tool)
                ? lineThickness()
                : brushSize}
            </span>
          </div>
        </aside>

        {/* Canvas area */}
        <main ref={containerRef} className="flex-1 overflow-auto p-6">
          <div className="relative mx-auto w-fit shadow-2xl">
            <canvas ref={pdfCanvasRef} className="block rounded-sm" />
            <div className="absolute inset-0">
              <canvas ref={fabricElRef} />
            </div>
          </div>
        </main>

        {/* Right: object actions */}
        <aside className="glass-strong hidden w-14 flex-col items-center gap-1 border-l border-slate-200/60 py-3 dark:border-white/5 md:flex">
          {[
            { icon: Undo2, label: 'Undo (Ctrl+Z)', onClick: undo },
            { icon: Redo2, label: 'Redo (Ctrl+Shift+Z)', onClick: redo },
            { icon: Copy, label: 'Duplicate (Ctrl+D)', onClick: duplicateSelected, needsSel: true },
            { icon: RotateCw, label: 'Rotate 45°', onClick: rotateSelected, needsSel: true },
            { icon: BringToFront, label: 'Bring forward', onClick: bringForward, needsSel: true },
            { icon: SendToBack, label: 'Send backward', onClick: sendBackward, needsSel: true },
            { icon: Trash2, label: 'Delete (Del)', onClick: deleteSelected, needsSel: true, danger: true },
          ].map(({ icon: Icon, label, onClick, needsSel, danger }) => (
            <button
              key={label}
              title={label}
              onClick={onClick}
              disabled={needsSel && !hasSelection}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-30',
                danger
                  ? 'text-rose-500 hover:bg-rose-500/10'
                  : 'text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-white/10'
              )}
            >
              <Icon className="h-4.5 w-4.5" />
            </button>
          ))}
        </aside>
      </div>

      {/* Bottom bar: pages + zoom */}
      <footer className="glass-strong flex items-center justify-center gap-4 border-t border-slate-200/60 px-4 py-2 dark:border-white/5">
        <div className="flex items-center gap-2">
          <button onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 disabled:opacity-30 dark:hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Page {pageNum} / {numPages}
          </span>
          <button onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= numPages} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 disabled:opacity-30 dark:hover:bg-white/10">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="h-4 w-px bg-slate-300 dark:bg-white/10" />
        <div className="flex items-center gap-2">
          <button onClick={() => changeZoom(-0.2)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-sm text-slate-600 dark:text-slate-300">{Math.round(zoom * 100)}%</span>
          <button onClick={() => changeZoom(0.2)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 dark:hover:bg-white/10">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </footer>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onImagePicked} />

      {/* Signature modal */}
      <Modal open={sigOpen} onClose={() => setSigOpen(false)} title="Draw your signature" size="md">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10">
            <canvas ref={sigCanvasRef} />
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                sigFabricRef.current?.clear();
              }}
            >
              Clear
            </Button>
            <Button className="flex-1" onClick={insertSignature}>
              Insert signature
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI side panel */}
      {aiOpen && (
        <div className="glass-strong fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-slate-200/60 shadow-2xl dark:border-white/10">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
              <Sparkles className="h-4 w-4 text-brand-500" /> AI Assistant
            </h3>
            <button onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <AiSetupNotice />
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Paste text from the document (or type anything)…"
              rows={5}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
            <div className="flex flex-wrap gap-1.5">
              {AI_ACTIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAiAction(a.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    aiAction === a.value ? 'bg-brand-600 text-white' : 'glass text-slate-500 dark:text-slate-400'
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {aiAction === 'translate' && (
              <input
                value={aiLanguage}
                onChange={(e) => setAiLanguage(e.target.value)}
                placeholder="Target language (e.g. Spanish)"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            )}
            <Button onClick={runAi} loading={aiLoading} className="w-full">
              {aiLoading ? 'Thinking…' : 'Run AI'}
            </Button>
            {aiResult && (
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                <div className="mb-2 flex justify-end">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult);
                      toast.success('Copied');
                    }}
                    className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                  >
                    Copy result
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{aiResult}</p>
              </div>
            )}
            {aiLoading && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
