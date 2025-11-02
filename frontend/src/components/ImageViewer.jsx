import React, { useEffect, useRef, useState } from "react";
import GeoTIFF from "geotiff";
import MapPanel from "./MapPanel";

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

useEffect(() => {
    setError(null);
    if (!detail) return;
    const filename = detail.filename || detail.original_name || "";
    const isRaster = /\.(tif|tiff)$/i.test(filename);
    const isImg = /\.(jpg|jpeg|png)$/i.test(filename);
  
    if (isImg) return; 
  
    if (isRaster) {
      (async () => {
        setLoading(true);
        try {
          const resp = await fetch(`${API}/images/${detail.id}/download`);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const arrayBuffer = await resp.arrayBuffer();
  
          let fromArrayBufferFn = null;
          try {
            const mod = await import("geotiff");
            fromArrayBufferFn =
              mod.fromArrayBuffer ||
              (mod.default && mod.default.fromArrayBuffer) ||
              (mod.GeoTIFF && mod.GeoTIFF.fromArrayBuffer) ||
              null;
          } catch (errImport) {
            fromArrayBufferFn = null;
          }
  
          if (!fromArrayBufferFn) {
            throw new Error("geotiff.fromArrayBuffer não disponível na versão do pacote. Verifique a instalação de 'geotiff'.");
          }
  
          const tiff = await fromArrayBufferFn(arrayBuffer);
          const image0 = await tiff.getImage();
          let rasters;
          try {
            rasters = await image0.readRasters({ interleave: true });
          } catch (e) {
            rasters = await image0.readRasters();
          }
  
          const width = image0.getWidth();
          const height = image0.getHeight();
  
          const canvas = canvasRef.current;
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
  
          if (rasters instanceof Uint8Array || Object.prototype.toString.call(rasters).includes("Uint8")) {
            const src = rasters;
            const bands = 3; 
            const step = Math.round(1 / scale) || 1;
            let dstIndex = 0;
            for (let y = 0; y < height; y += step) {
              for (let x = 0; x < width; x += step) {
                const si = (y * width + x) * bands;
                const r = src[si] ?? 0;
                const g = src[si + 1] ?? r;
                const b = src[si + 2] ?? r;
                imgData.data[dstIndex++] = r;
                imgData.data[dstIndex++] = g;
                imgData.data[dstIndex++] = b;
                imgData.data[dstIndex++] = 255;
              }
            }
          } else if (Array.isArray(rasters)) {
            const band0 = rasters[0];
            const band1 = rasters[1];
            const band2 = rasters[2];
            const step = Math.round(1 / scale) || 1;
            let dstIndex = 0;
            for (let y = 0; y < height; y += step) {
              for (let x = 0; x < width; x += step) {
                const idx = y * width + x;
                const r = band0 ? band0[idx] : 0;
                const g = band1 ? band1[idx] : r;
                const b = band2 ? band2[idx] : r;
                imgData.data[dstIndex++] = r;
                imgData.data[dstIndex++] = g;
                imgData.data[dstIndex++] = b;
                imgData.data[dstIndex++] = 255;
              }
            }
          } else {
            throw new Error("Formato de rasters inesperado");
          }
  
          ctx.putImageData(imgData, 0, 0);
        } catch (err) {
          console.error("Erro ao processar TIFF:", err);
          setError("Erro ao renderizar TIFF no browser — veja console para detalhes.");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [detail]);
  
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
      {detail?.meta?.bounds && (
  <div className="my-4">
    <MapPanel bounds={detail.meta.bounds} thumbnailUrl={detail.meta.thumbnail_url ? `${API}${detail.meta.thumbnail_url}` : null} />
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
