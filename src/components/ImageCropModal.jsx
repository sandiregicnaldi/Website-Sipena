import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Check, RotateCw, ZoomIn, ZoomOut, Maximize2, 
  FlipHorizontal, RefreshCw, Crop as CropIcon 
} from 'lucide-react';
import './ImageCropModal.css';

const PRESET_RATIOS = [
  { label: 'Bebas', value: null },
  { label: '1:1 (Avatar)', value: 1 / 1 },
  { label: '3:4 (Buku)', value: 3 / 4 },
  { label: '16:9 (Banner)', value: 16 / 9 },
  { label: '21:9 (Hero)', value: 21 / 9 },
];

/**
 * Universal Image Crop & Preview Modal
 * Pure HTML5 Canvas implementation - zero external dependencies, React 19 ready.
 */
const ImageCropModal = ({
  isOpen,
  imageSrc,
  aspectRatio: initialAspect = null,
  cropShape = 'rect', // 'rect' | 'round'
  title = 'Sesuaikan & Potong Gambar',
  fileName = 'cropped-image.jpg',
  onConfirm,
  onCancel,
}) => {
  const [selectedRatio, setSelectedRatio] = useState(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Crop rectangle in container coordinate space (pixels)
  const [cropBox, setCropBox] = useState({ x: 40, y: 40, width: 280, height: 280 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [imagePos, setImagePos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const previewCanvasRef = useRef(null);

  // Sync initial aspect ratio when modal opens or initialAspect changes
  useEffect(() => {
    if (isOpen) {
      setSelectedRatio(initialAspect);
      setZoom(1);
      setRotation(0);
      setFlipH(false);
    }
  }, [isOpen, initialAspect]);

  // Adjust crop box dimensions based on selected aspect ratio
  const applyAspectRatio = useCallback((ratio, containerWidth, containerHeight) => {
    const pad = 30;
    const maxW = Math.max(100, containerWidth - pad * 2);
    const maxH = Math.max(100, containerHeight - pad * 2);

    let w = maxW;
    let h = maxH;

    if (ratio) {
      if (maxW / maxH > ratio) {
        h = maxH;
        w = h * ratio;
      } else {
        w = maxW;
        h = w / ratio;
      }
    } else {
      w = maxW * 0.8;
      h = maxH * 0.8;
    }

    const x = Math.max(pad, (containerWidth - w) / 2);
    const y = Math.max(pad, (containerHeight - h) / 2);

    setCropBox({ x, y, width: w, height: h });
  }, []);

  // When image loads or container mounts, size and center image & crop box
  const handleImageLoad = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current;
    const container = containerRef.current;
    const cWidth = container.clientWidth || 500;
    const cHeight = container.clientHeight || 400;

    const natW = img.naturalWidth;
    const natH = img.naturalHeight;

    // Fit image inside container with padding
    const scale = Math.min((cWidth - 40) / natW, (cHeight - 40) / natH);
    const dispW = natW * scale;
    const dispH = natH * scale;

    setImageSize({
      width: dispW,
      height: dispH,
      naturalWidth: natW,
      naturalHeight: natH,
    });

    setImagePos({
      x: (cWidth - dispW) / 2,
      y: (cHeight - dispH) / 2,
    });

    applyAspectRatio(selectedRatio, cWidth, cHeight);
  };

  // Change ratio button handler
  const handleSelectRatio = (ratio) => {
    setSelectedRatio(ratio);
    if (containerRef.current) {
      applyAspectRatio(ratio, containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  };

  // Zoom controls
  const handleZoomChange = (newZoom) => {
    const clamped = Math.max(0.5, Math.min(3, newZoom));
    setZoom(clamped);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleFlip = () => {
    setFlipH(prev => !prev);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    if (containerRef.current) {
      applyAspectRatio(selectedRatio, containerRef.current.clientWidth, containerRef.current.clientHeight);
    }
  };

  // Drag and Resize Crop Box logic
  const handleMouseDown = (e, action, handle = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragStart({ x: e.clientX, y: e.clientY });
    if (action === 'move') {
      setIsDragging(true);
    } else if (action === 'resize') {
      setIsResizing(true);
      setResizeHandle(handle);
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const container = containerRef.current;
    if (!container) return;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;

    if (isDragging) {
      setCropBox(prev => {
        const nextX = Math.max(0, Math.min(maxW - prev.width, prev.x + dx));
        const nextY = Math.max(0, Math.min(maxH - prev.height, prev.y + dy));
        return { ...prev, x: nextX, y: nextY };
      });
    } else if (isResizing && resizeHandle) {
      setCropBox(prev => {
        let { x, y, width, height } = prev;

        if (resizeHandle.includes('e')) width = Math.max(50, Math.min(maxW - x, width + dx));
        if (resizeHandle.includes('s')) height = Math.max(50, Math.min(maxH - y, height + dy));
        if (resizeHandle.includes('w')) {
          const newW = Math.max(50, width - dx);
          x += width - newW;
          width = newW;
        }
        if (resizeHandle.includes('n')) {
          const newH = Math.max(50, height - dy);
          y += height - newH;
          height = newH;
        }

        // Maintain aspect ratio if set
        if (selectedRatio) {
          if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
            height = width / selectedRatio;
          } else {
            width = height * selectedRatio;
          }
        }

        return { x: Math.max(0, x), y: Math.max(0, y), width, height };
      });
    }
  }, [isDragging, isResizing, dragStart, resizeHandle, selectedRatio]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoomChange(zoom + delta);
  };

  // Render live preview on preview canvas
  const updateLivePreview = useCallback(() => {
    if (!previewCanvasRef.current || !imageRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    const outW = 200;
    const outH = selectedRatio ? Math.round(outW / selectedRatio) : Math.round(outW * (cropBox.height / cropBox.width));
    canvas.width = outW;
    canvas.height = outH;

    ctx.clearRect(0, 0, outW, outH);

    // Calculate crop coordinates relative to rendered image
    const relX = (cropBox.x - imagePos.x) / zoom;
    const relY = (cropBox.y - imagePos.y) / zoom;
    const relW = cropBox.width / zoom;
    const relH = cropBox.height / zoom;

    const scaleX = imageSize.naturalWidth / imageSize.width;
    const scaleY = imageSize.naturalHeight / imageSize.height;

    const srcX = relX * scaleX;
    const srcY = relY * scaleY;
    const srcW = relW * scaleX;
    const srcH = relH * scaleY;

    ctx.save();
    if (cropShape === 'round') {
      ctx.beginPath();
      ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    try {
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
    } catch (e) {
      // Ignore initial render frame error
    }
    ctx.restore();
  }, [cropBox, imagePos, imageSize, zoom, selectedRatio, cropShape]);

  useEffect(() => {
    if (isOpen && imageSize.width > 0) {
      updateLivePreview();
    }
  }, [isOpen, imageSize, cropBox, zoom, rotation, flipH, updateLivePreview]);

  // Produce final cropped File and DataURL
  const handleApply = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const relX = (cropBox.x - imagePos.x) / zoom;
    const relY = (cropBox.y - imagePos.y) / zoom;
    const relW = cropBox.width / zoom;
    const relH = cropBox.height / zoom;

    const scaleX = imageSize.naturalWidth / imageSize.width;
    const scaleY = imageSize.naturalHeight / imageSize.height;

    const srcX = Math.max(0, relX * scaleX);
    const srcY = Math.max(0, relY * scaleY);
    const srcW = Math.min(imageSize.naturalWidth - srcX, relW * scaleX);
    const srcH = Math.min(imageSize.naturalHeight - srcY, relH * scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcW));
    canvas.height = Math.max(1, Math.round(srcH));
    const ctx = canvas.getContext('2d');

    ctx.save();
    if (rotation !== 0 || flipH) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, 1);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob) {
        onCancel();
        return;
      }
      const file = new File([blob], fileName.replace(/\.[^/.]+$/, '') + '.webp', {
        type: 'image/webp',
        lastModified: Date.now()
      });
      const dataUrl = canvas.toDataURL('image/webp', 0.92);
      onConfirm(file, dataUrl);
    }, 'image/webp', 0.92);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal-card">
        {/* Header */}
        <div className="crop-modal-header">
          <div className="crop-header-title">
            <CropIcon size={20} className="crop-header-icon" />
            <div>
              <h3>{title}</h3>
              <p>Sesuaikan posisi, rasio, dan perbesaran gambar sebelum diunggah.</p>
            </div>
          </div>
          <button className="crop-close-btn" onClick={onCancel} title="Tutup">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="crop-modal-body">
          {/* Main Interactive Stage */}
          <div 
            className="crop-stage" 
            ref={containerRef}
            onWheel={handleWheel}
          >
            {/* The Image being cropped */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source to crop"
              className="crop-source-image"
              onLoad={handleImageLoad}
              style={{
                left: `${imagePos.x}px`,
                top: `${imagePos.y}px`,
                width: `${imageSize.width}px`,
                height: `${imageSize.height}px`,
                transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1})`,
                transformOrigin: 'center center',
              }}
            />

            {/* Darkened backdrop with transparent cutout */}
            <div className="crop-backdrop">
              {/* Top */}
              <div style={{ top: 0, left: 0, right: 0, height: `${cropBox.y}px` }} className="backdrop-block" />
              {/* Bottom */}
              <div style={{ top: `${cropBox.y + cropBox.height}px`, left: 0, right: 0, bottom: 0 }} className="backdrop-block" />
              {/* Left */}
              <div style={{ top: `${cropBox.y}px`, left: 0, width: `${cropBox.x}px`, height: `${cropBox.height}px` }} className="backdrop-block" />
              {/* Right */}
              <div style={{ top: `${cropBox.y}px`, left: `${cropBox.x + cropBox.width}px`, right: 0, height: `${cropBox.height}px` }} className="backdrop-block" />
            </div>

            {/* The Active Crop Box */}
            <div
              className={`crop-selection-box ${cropShape === 'round' ? 'is-round' : ''}`}
              style={{
                left: `${cropBox.x}px`,
                top: `${cropBox.y}px`,
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`,
              }}
              onMouseDown={(e) => handleMouseDown(e, 'move')}
            >
              {/* Rule of thirds grid lines */}
              <div className="crop-grid-h line-1" />
              <div className="crop-grid-h line-2" />
              <div className="crop-grid-v line-1" />
              <div className="crop-grid-v line-2" />

              {/* Resize handles */}
              {['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w'].map((h) => (
                <div
                  key={h}
                  className={`crop-handle handle-${h}`}
                  onMouseDown={(e) => handleMouseDown(e, 'resize', h)}
                />
              ))}
            </div>
          </div>

          {/* Right Sidebar Controls & Live Preview */}
          <div className="crop-sidebar">
            {/* Live Preview Box */}
            <div className="crop-preview-card">
              <h4>Pratinjau Hasil</h4>
              <div className={`preview-canvas-wrapper ${cropShape === 'round' ? 'is-round' : ''}`}>
                <canvas ref={previewCanvasRef} className="preview-canvas" />
              </div>
              <span className="preview-caption">
                {Math.round(cropBox.width)} × {Math.round(cropBox.height)} px
              </span>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="crop-control-group">
              <label>Pilihan Aspek Rasio</label>
              <div className="ratio-chips">
                {PRESET_RATIOS.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`ratio-chip ${selectedRatio === r.value ? 'active' : ''}`}
                    onClick={() => handleSelectRatio(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="crop-control-group">
              <div className="control-label-row">
                <label>Perbesaran (Zoom)</label>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <div className="zoom-slider-row">
                <button type="button" onClick={() => handleZoomChange(zoom - 0.2)} className="tool-icon-btn">
                  <ZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="crop-slider"
                />
                <button type="button" onClick={() => handleZoomChange(zoom + 0.2)} className="tool-icon-btn">
                  <ZoomIn size={16} />
                </button>
              </div>
            </div>

            {/* Transformation Tools */}
            <div className="crop-tools-row">
              <button type="button" className="tool-btn" onClick={handleRotate} title="Putar 90 Derajat">
                <RotateCw size={15} /> Putar 90°
              </button>
              <button type="button" className="tool-btn" onClick={handleFlip} title="Balik Horizontal">
                <FlipHorizontal size={15} /> Balik
              </button>
              <button type="button" className="tool-btn" onClick={handleReset} title="Kembalikan Pengaturan Asli">
                <RefreshCw size={15} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="crop-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="btn btn-primary btn-apply-crop" onClick={handleApply}>
            <Check size={16} /> Terapkan &amp; Unggah
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
