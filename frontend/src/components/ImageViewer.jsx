import React, { useEffect, useRef, useState } from "react";
import GeoTIFF from "geotiff";

export default function ImageViewer({ image }) {
  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    setError(null);
    setDetail(null);
    if (!image) return;

    // busca detalhe atualizado (inclui meta)
    (async () => {
      try {
        const res = await fetch(`${API}/images/${image.id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setDetail(json);
      } catch (err) {
        console.error("Erro fetching image detail:", err);
      }
    })();
  }, [image, API]);

  // renderiza TIFF em canvas (se for TIFF)
  useEffect(() => {
    setError(null);
    if (!detail) return;
    const filename = detail.filename || detail.original_name || "";
    const isRaster = /\.(tif|tiff)$/i.test(filename);
    const isImg = /\.(jpg|jpeg|png)$/i.test(filename);

    if (isImg) return; // <img> no JSX fará o trabalho

    if (isRaster) {
      (async () => {
        setLoading(true);
        try {
          const resp = await fetch(`${API}/images/${detail.id}/download`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buffer = await resp.arrayBuffer();
          const tiff = await GeoTIFF.fromArrayBuffer(buffer);
          const image0 = await tiff.getImage();
          const rasters = await image0.readRasters({ interleave: true });
          const width = image0.getWidth();
          const height = image0.getHeight();

          const canvas = canvasRef.current;
          // limit canvas max dimensions to avoid browser OOM (scale if very large)
          const MAX = 1200;
          let scale = 1;
          if (width > MAX || height > MAX) {
            scale = Math.min(MAX / width, MAX / height);
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
          } else {
            canvas.width = width;
            canvas.height = height;
          }
          const ctx = canvas.getContext("2d");
          const imgData = ctx.createImageData(canvas.width, canvas.height);

          // build image data from rasters (simple resampling if scaled)
          const src = rasters; // interleaved
          // naive mapping: sample every nth pixel if scale < 1
          const step = Math.round(1 / scale) || 1;
          let j = 0;
          for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
              const si = (y * width + x) * 3; // assume RGB interleaved
              const r = src[si] ?? 0;
              const g = src[si + 1] ?? r;
              const b = src[si + 2] ?? r;
              imgData.data[j++] = r;
              imgData.data[j++] = g;
              imgData.data[j++] = b;
              imgData.data[j++] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (err) {
          console.error(err);
          setError("Erro ao renderizar TIFF no browser.");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [detail, API]);

  if (!image) return <div className="p-4">Selecione uma imagem à direita.</div>;

  const downloadUrl = `${API}/images/${image.id}/download`;
  const filename = detail?.filename || image.filename || image.original_name || "";
  const isImg = /\.(jpg|jpeg|png)$/i.test(filename);
  const isTiff = /\.(tif|tiff)$/i.test(filename);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">{detail?.original_name || filename}</h3>
      <div className="text-xs text-gray-500 mb-2">Status: {detail?.status || image.status}</div>

      {detail?.meta && (
        <div className="mb-2 text-xs text-gray-600">
          <div>Meta:</div>
          <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(detail.meta, null, 2)}</pre>
        </div>
      )}

      {isImg && <img src={downloadUrl} alt={filename} className="max-w-full border" />}

      {isTiff && (
        <>
          {loading && <div>Renderizando TIFF... (pode demorar)</div>}
          {error && <div className="text-red-600">{error}</div>}
          <canvas ref={canvasRef} style={{ maxWidth: "100%", border: "1px solid #ddd" }} />
          <div className="mt-2">
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-sm underline">
              Baixar original
            </a>
          </div>
        </>
      )}

      {!isImg && !isTiff && (
        <div>
          Preview não disponível — <a href={downloadUrl}>baixar</a>
        </div>
      )}
    </div>
  );
}
