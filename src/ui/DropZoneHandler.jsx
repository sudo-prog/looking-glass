/**
 * LOOKING GLASS — DropZoneHandler
 * Adds native drag-and-drop support to the canvas for:
 *   • Images (PNG, JPEG, GIF, WebP, HEIC, SVG)
 *   • Video  (MP4, MOV, WebM, AVI)
 *   • PDFs
 *   • Audio  (MP3, WAV, M4A, OGG)
 *   • URLs   (dropped from browser address bar or links)
 *   • Plain text / markdown
 *
 * HOW TO INTEGRATE:
 *   Wrap your <Canvas> element with <DropZoneHandler> in App.jsx:
 *
 *   import { DropZoneHandler } from './ui/DropZoneHandler.jsx';
 *
 *   <DropZoneHandler viewport={viewport} onDrop={handleDrop}>
 *     <Canvas {...canvasProps} />
 *   </DropZoneHandler>
 *
 *   handleDrop in App.jsx:
 *   const handleDrop = useCallback(async (drops) => {
 *     for (const drop of drops) {
 *       switch (drop.kind) {
 *         case 'image': await addImage(drop.objectUrl, drop.name); break;
 *         case 'video': await addVideo(drop.objectUrl, drop.name); break;
 *         case 'pdf':   await addPDF(drop.file);                   break;
 *         case 'audio': await addAudio(drop.file);                 break;
 *         case 'url':   await addUrl(drop.url);                    break;
 *         case 'text':  await addNote(drop.text);                  break;
 *       }
 *     }
 *   }, [addImage, addVideo, addPDF, addAudio, addUrl, addNote]);
 */

import React, {
  useState,
  useCallback,
  useRef,
} from 'react';
import { Image, FilePdf, Microphone, VideoCamera, LinkSimple, TextT } from '@phosphor-icons/react';

// ─────────────────────────────────────────────────────────────
// FILE TYPE DETECTION
// ─────────────────────────────────────────────────────────────

const IMAGE_TYPES = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp',
  'image/tiff', 'image/avif',
]);

const VIDEO_TYPES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm',
  'video/avi', 'video/x-msvideo', 'video/x-matroska',
]);

const AUDIO_TYPES = new Set([
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
  'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/webm',
  'audio/aac', 'audio/flac',
]);

function classifyFile(file) {
  if (IMAGE_TYPES.has(file.type)) return 'image';
  if (VIDEO_TYPES.has(file.type)) return 'video';
  if (AUDIO_TYPES.has(file.type)) return 'audio';
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
  if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) return 'text';
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────
// DROP ZONE OVERLAY (visual feedback during drag)
// ─────────────────────────────────────────────────────────────

function DropOverlay({ active, fileTypes }) {
  if (!active) return null;

  // Determine dominant type for icon and label
  const type  = fileTypes[0] || 'file';
  const icons = {
    image:   <Image      size={32} weight="regular" />,
    video:   <VideoCamera size={32} weight="regular" />,
    audio:   <Microphone size={32} weight="regular" />,
    pdf:     <FilePdf    size={32} weight="regular" />,
    url:     <LinkSimple size={32} weight="regular" />,
    text:    <TextT      size={32} weight="regular" />,
    file:    <Image      size={32} weight="regular" />,
  };
  const labels = {
    image: 'DROP IMAGE ONTO CANVAS',
    video: 'DROP VIDEO ONTO CANVAS',
    audio: 'DROP AUDIO MEMO ONTO CANVAS',
    pdf:   'DROP PDF ONTO CANVAS',
    url:   'DROP LINK ONTO CANVAS',
    text:  'DROP TEXT ONTO CANVAS',
    file:  'DROP FILE ONTO CANVAS',
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,10,10,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        pointerEvents: 'none',
        animation: 'drop-appear 0.15s ease both',
      }}
    >
      <style>{`
        @keyframes drop-appear {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes drop-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.15); }
          50%       { box-shadow: 0 0 0 16px rgba(255,255,255,0); }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          padding: '40px 56px',
          borderRadius: '20px',
          border: '2px dashed rgba(255,255,255,0.30)',
          background: 'rgba(255,255,255,0.05)',
          animation: 'drop-pulse 1.6s ease infinite',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.60)' }}>
          {icons[type] || icons.file}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.60)',
            textAlign: 'center',
          }}
        >
          {labels[type] || labels.file}
        </div>
        {fileTypes.length > 1 && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.30)',
              letterSpacing: '0.10em',
            }}
          >
            + {fileTypes.length - 1} MORE FILE{fileTypes.length > 2 ? 'S' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DROP ZONE HANDLER COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   children    {ReactNode}             Wrap the Canvas
 *   viewport    {{ x, y, scale }}       For world-coordinate calculation
 *   onDrop      {(drops: DropItem[]) => void}
 *
 * DropItem shape:
 *   { kind: 'image'|'video'|'audio'|'pdf'|'url'|'text',
 *     file?: File, objectUrl?: string, url?: string,
 *     text?: string, name?: string,
 *     worldX: number, worldY: number }
 */
export function DropZoneHandler({ children, viewport, onDrop }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileTypes,  setFileTypes]  = useState([]);
  const dragCountRef = useRef(0); // track nested enter/leave

  // ── Infer drag types from dataTransfer ──────────────────
  const inferTypes = useCallback((dt) => {
    const types = new Set();
    if (dt.types.includes('text/uri-list') || dt.types.includes('text/plain')) {
      types.add('url');
    }
    for (const item of dt.items) {
      if (item.kind === 'file') {
        const kind = classifyFile({ type: item.type, name: item.type });
        types.add(kind);
      }
    }
    return [...types];
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCountRef.current++;
    if (dragCountRef.current === 1) {
      setDragActive(true);
      setFileTypes(inferTypes(e.dataTransfer));
    }
  }, [inferTypes]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setDragActive(false);
      setFileTypes([]);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setDragActive(false);
    setFileTypes([]);

    const vp = viewport || { x: 0, y: 0, scale: 1 };
    const rect = e.currentTarget.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - vp.x) / vp.scale;
    const worldY = (e.clientY - rect.top  - vp.y) / vp.scale;

    const drops = [];

    // ── Files ──────────────────────────────────────────
    for (const file of Array.from(e.dataTransfer.files)) {
      const kind = classifyFile(file);

      if (kind === 'image') {
        const objectUrl = URL.createObjectURL(file);
        drops.push({ kind: 'image', file, objectUrl, name: file.name, worldX, worldY });
      } else if (kind === 'video') {
        const objectUrl = URL.createObjectURL(file);
        drops.push({ kind: 'video', file, objectUrl, name: file.name, worldX, worldY });
      } else if (kind === 'audio') {
        drops.push({ kind: 'audio', file, name: file.name, worldX, worldY });
      } else if (kind === 'pdf') {
        drops.push({ kind: 'pdf', file, name: file.name, worldX, worldY });
      } else if (kind === 'text') {
        const text = await file.text();
        drops.push({ kind: 'text', text, name: file.name, worldX, worldY });
      }
    }

    // ── URLs / text (no files) ─────────────────────────
    if (drops.length === 0) {
      const uriList  = e.dataTransfer.getData('text/uri-list');
      const plainText = e.dataTransfer.getData('text/plain');
      const html     = e.dataTransfer.getData('text/html');

      if (uriList) {
        const urls = uriList.split(/[\r\n]+/).filter((u) => u && !u.startsWith('#'));
        for (const url of urls) {
          drops.push({ kind: 'url', url, worldX, worldY });
        }
      } else if (plainText) {
        // Detect if it's a URL
        const trimmed = plainText.trim();
        const isUrl = /^https?:\/\//i.test(trimmed);
        if (isUrl) {
          drops.push({ kind: 'url', url: trimmed, worldX, worldY });
        } else {
          drops.push({ kind: 'text', text: trimmed, worldX, worldY });
        }
      }
    }

    if (drops.length > 0) {
      onDrop?.(drops);
    }
  }, [viewport, onDrop]);

  // ── Paste handler (Cmd+V with image in clipboard) ─────
  const handlePaste = useCallback(async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const vp    = viewport || { x: 0, y: 0, scale: 1 };
    const drops = [];

    for (const it of items) {
      if (it.kind === 'file') {
        const file = it.getAsFile();
        if (!file) continue;
        const kind = classifyFile(file);
        if (kind === 'image') {
          const objectUrl = URL.createObjectURL(file);
          drops.push({ kind: 'image', file, objectUrl, name: 'pasted-image', worldX: (-vp.x + 400) / vp.scale, worldY: (-vp.y + 300) / vp.scale });
        }
      } else if (it.kind === 'string' && it.type === 'text/plain') {
        it.getAsString((text) => {
          const trimmed = text.trim();
          if (/^https?:\/\//i.test(trimmed)) {
            onDrop?.([{ kind: 'url', url: trimmed, worldX: (-vp.x + 400) / vp.scale, worldY: (-vp.y + 300) / vp.scale }]);
          }
        });
      }
    }

    if (drops.length > 0) {
      e.preventDefault();
      onDrop?.(drops);
    }
  }, [viewport, onDrop]);

  return (
    <div
      style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {children}
      <DropOverlay active={dragActive} fileTypes={fileTypes} />
    </div>
  );
}

export default DropZoneHandler;
