import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Crop as CropIcon, Download, RotateCw, FlipHorizontal, FlipVertical, X, ZoomIn } from 'lucide-react';
import ToolShell from '../../components/tools/ToolShell.jsx';
import Dropzone from '../../components/upload/Dropzone.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Select from '../../components/ui/Select.jsx';
import useToolJob from '../../hooks/useToolJob.js';

const ASPECTS = [
  { value: '', label: 'Free' },
  { value: '1', label: 'Square 1:1' },
  { value: String(4 / 3), label: '4:3' },
  { value: String(16 / 9), label: '16:9' },
  { value: String(3 / 4), label: '3:4 (Portrait)' },
];

export default function ImageCropper() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState('');
  const [rotate, setRotate] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(0);
  const [format, setFormat] = useState('png');
  const [croppedArea, setCroppedArea] = useState(null);
  const { run, isLoading, progress } = useToolJob();

  const onFiles = (files) => {
    const f = files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onCropComplete = useCallback((_area, areaPixels) => setCroppedArea(areaPixels), []);

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotate(0);
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(0);
  };

  const exportImage = async () => {
    const form = new FormData();
    form.append('file', file);
    form.append('rotate', String(rotate));
    form.append('flipH', String(flipH));
    form.append('flipV', String(flipV));
    form.append('brightness', String(brightness / 100));
    form.append('contrast', String(contrast));
    form.append('format', format);
    if (croppedArea) {
      form.append(
        'crop',
        JSON.stringify({
          left: croppedArea.x,
          top: croppedArea.y,
          width: croppedArea.width,
          height: croppedArea.height,
        })
      );
    }
    await run('/tools/process-image', form, { fallbackName: `edited.${format}` });
  };

  return (
    <ToolShell
      icon={CropIcon}
      title="Image Studio"
      description="Crop, rotate, flip, zoom and fine-tune brightness & contrast."
      isLoading={isLoading}
      progress={progress}
    >
      {!file ? (
        <Dropzone onFiles={onFiles} multiple={false} accept={{ 'image/*': [] }} label="Drop an image here" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <div
              className="relative h-[420px] overflow-hidden rounded-2xl bg-slate-900"
              style={{ filter: `brightness(${brightness}%) contrast(${100 + contrast}%)` }}
            >
              <Cropper
                image={preview}
                crop={crop}
                zoom={zoom}
                rotation={rotate}
                aspect={aspect ? Number(aspect) : undefined}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                transform={[
                  `translate(${crop.x}px, ${crop.y}px)`,
                  `rotateZ(${rotate}deg)`,
                  `rotateY(${flipH ? 180 : 0}deg)`,
                  `rotateX(${flipV ? 180 : 0}deg)`,
                  `scale(${zoom})`,
                ].join(' ')}
              />
            </div>
          </div>

          {/* Controls */}
          <Card className="space-y-4 self-start">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRotate((r) => (r + 90) % 360)}>
                <RotateCw className="h-4 w-4" /> Rotate
              </Button>
              <Button variant={flipH ? 'primary' : 'secondary'} size="sm" onClick={() => setFlipH((v) => !v)}>
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button variant={flipV ? 'primary' : 'secondary'} size="sm" onClick={() => setFlipV((v) => !v)}>
                <FlipVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" /> Reset
              </Button>
            </div>

            <Select label="Aspect ratio" value={aspect} onChange={(e) => setAspect(e.target.value)} options={ASPECTS} />

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                <ZoomIn className="h-3.5 w-3.5" /> Zoom: {zoom.toFixed(1)}x
              </label>
              <input type="range" min={1} max={5} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-brand-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Brightness: {brightness}%
              </label>
              <input type="range" min={30} max={200} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-brand-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Contrast: {contrast > 0 ? '+' : ''}{contrast}
              </label>
              <input type="range" min={-80} max={80} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-brand-600" />
            </div>

            <Select
              label="Export format"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPG' },
                { value: 'webp', label: 'WEBP' },
              ]}
            />

            <Button onClick={exportImage} loading={isLoading} className="w-full" size="lg">
              <Download className="h-4 w-4" /> Export
            </Button>
          </Card>
        </div>
      )}
    </ToolShell>
  );
}
