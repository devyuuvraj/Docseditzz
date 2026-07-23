import { useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Images, RotateCw, X, GripVertical, Download } from 'lucide-react';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import Input from '../../components/ui/Input.jsx';
import Card from '../../components/ui/Card.jsx';
import useToolJob from '../../hooks/useToolJob.js';

let idCounter = 0;

function SortableImage({ item, onRotate, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="glass group relative overflow-hidden rounded-2xl"
    >
      <img
        src={item.preview}
        alt=""
        className="h-36 w-full object-cover transition-transform duration-300"
        style={{ transform: `rotate(${item.rotate}deg)` }}
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab rounded-lg bg-white/20 p-1.5 text-white backdrop-blur active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          <button
            onClick={() => onRotate(item.id)}
            className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur hover:bg-white/30"
            aria-label="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="rounded-lg bg-rose-500/80 p-1.5 text-white backdrop-blur hover:bg-rose-500"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImagesToPdf() {
  const [items, setItems] = useState([]);
  const [options, setOptions] = useState({
    pageSize: 'a4',
    orientation: 'portrait',
    margin: 24,
    quality: 80,
    fit: 'contain',
    pageNumbers: false,
    watermarkText: '',
  });
  const { run, isLoading, progress } = useToolJob();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const addFiles = useCallback((files) => {
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `img-${idCounter++}`,
        file,
        preview: URL.createObjectURL(file),
        rotate: 0,
      })),
    ]);
  }, []);

  const onDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const rotate = (id) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, rotate: (i.rotate + 90) % 360 } : i)));

  const remove = (id) =>
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });

  const generate = async () => {
    const form = new FormData();
    items.forEach((i) => form.append('files', i.file));
    form.append('transforms', JSON.stringify(items.map((i) => ({ rotate: i.rotate }))));
    Object.entries(options).forEach(([k, v]) => form.append(k, String(v)));
    const ok = await run('/tools/images-to-pdf', form, { fallbackName: 'images.pdf' });
    if (ok) setItems([]);
  };

  return (
    <ToolShell
      icon={Images}
      title="Images to PDF"
      description="Upload, reorder, rotate and compress images into a polished PDF."
      isLoading={isLoading}
      progress={progress}
    >
      <Dropzone
        onFiles={addFiles}
        accept={{ 'image/*': [] }}
        maxFiles={50}
        label="Drop images here"
        sublabel="JPG, PNG, WEBP, BMP, TIFF — up to 50 images"
      />

      {items.length > 0 && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((item) => (
                  <SortableImage key={item.id} item={item} onRotate={rotate} onRemove={remove} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <Card>
            <h3 className="mb-4 text-sm font-bold text-slate-800 dark:text-white">PDF options</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                label="Page size"
                value={options.pageSize}
                onChange={(e) => setOptions({ ...options, pageSize: e.target.value })}
                options={[
                  { value: 'a4', label: 'A4' },
                  { value: 'letter', label: 'Letter' },
                  { value: 'legal', label: 'Legal' },
                ]}
              />
              <Select
                label="Orientation"
                value={options.orientation}
                onChange={(e) => setOptions({ ...options, orientation: e.target.value })}
                options={[
                  { value: 'portrait', label: 'Portrait' },
                  { value: 'landscape', label: 'Landscape' },
                ]}
              />
              <Select
                label="Image fit"
                value={options.fit}
                onChange={(e) => setOptions({ ...options, fit: e.target.value })}
                options={[
                  { value: 'contain', label: 'Fit inside page' },
                  { value: 'cover', label: 'Fill page' },
                ]}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Margin: {options.margin}pt
                </label>
                <input
                  type="range"
                  min={0}
                  max={72}
                  value={options.margin}
                  onChange={(e) => setOptions({ ...options, margin: Number(e.target.value) })}
                  className="w-full accent-brand-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Quality: {options.quality}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={options.quality}
                  onChange={(e) => setOptions({ ...options, quality: Number(e.target.value) })}
                  className="w-full accent-brand-600"
                />
              </div>
              <Input
                label="Watermark (optional)"
                placeholder="e.g. CONFIDENTIAL"
                value={options.watermarkText}
                onChange={(e) => setOptions({ ...options, watermarkText: e.target.value })}
              />
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={options.pageNumbers}
                onChange={(e) => setOptions({ ...options, pageNumbers: e.target.checked })}
                className="h-4 w-4 accent-brand-600"
              />
              Add page numbers
            </label>
          </Card>

          <Button onClick={generate} loading={isLoading} size="lg" className="w-full">
            <Download className="h-4 w-4" />
            Generate PDF ({items.length} image{items.length > 1 ? 's' : ''})
          </Button>
        </>
      )}
    </ToolShell>
  );
}
