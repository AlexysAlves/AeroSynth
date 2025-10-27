import React, { useEffect, useRef, useState } from "react";
import GeoTIFF from "geotiff"; 

export default function ImageViewer({ image }) {
  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    if (!image) return;
    const ext = (image.filename || "").toLowerCase();
    const downloadUrl = `${API}/images/${image.id}/download`;

    if (/\.(jpg|jpeg|png)$/i.test(ext) || (image.original_name && /\.(jpg|jpeg|png)$/i.test(image.original_name))) {
      return;
    }

    if (/\.(tif|tiff)$/i.test(ext) || (image.original_name && /\.(tif|tiff)$/i.test(image.original_name))) {
      (async () => {
        setLoading(true);
        try {
          const resp = await fetch(downloadUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const arrayBuffer = await resp.arrayBuffer();
          const tiff = await GeoTIFF.fromArrayBuffer(arrayBuffer);
          const image0 = await tiff.getImage();
          const rasters = await image0.readRasters({ interleave: true });
          const width = image0.getWidth();
          const height = image0.getHeight();

          const canvas = canvasRef.current;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          const imgData = ctx.createImageData(width, height);
          if (rasters.length === width * height * 3 || rasters instanceof Uint8Array) {
            const src = rasters;
            for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
              imgData.data[j] = src[i];     // R
              imgData.data[j + 1] = src[i + 1]; // G
              imgData.data[j + 2] = src[i + 2]; // B
              imgData.data[j + 3] = 255;
            }
          } else {
            const band = rasters[0];
            for (let i = 0, j = 0; i < band.length; i++, j += 4) {
              const v = band[i];
              imgData.data[j] = v;
              imgData.data[j + 1] = v;
              imgData.data[j + 2] = v;
              imgData.data[j + 3] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (err) {
          console.error(err);
          setError("Erro ao renderizar TIFF no browser. Talvez seja grande ou formato incomum.");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [image]);

  if (!image) return <div className="p-4">Selecione uma imagem à direita.</div>;

  const downloadUrl = `${API}/images/${image.id}/download`;
  const isRasterPreview = /\.(tif|tiff)$/i.test(image.filename || "") || (image.original_name && /\.(tif|tiff)$/i.test(image.original_name));
  const isImg = /\.(jpg|jpeg|png)$/i.test(image.filename || "") || (image.original_name && /\.(jpg|jpeg|png)$/i.test(image.original_name));

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">{image.original_name || image.filename}</h3>
      <div className="text-xs text-gray-500 mb-2">Status: {image.status}</div>

      {isImg && (
        <img src={downloadUrl} alt={image.original_name} className="max-w-full border" />
      )}

      {isRasterPreview && (
        <>
          {loading && <div>Renderizando TIFF... (pode demorar)</div>}
          {error && <div className="text-red-600">{error}</div>}
          <canvas ref={canvasRef} style={{ maxWidth: "100%", border: "1px solid #ddd" }} />
          <div className="mt-2">
            <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-sm underline">Baixar original</a>
          </div>
        </>
      )}

      {!isImg && !isRasterPreview && (
        <div>
          Preview não disponível — <a href={downloadUrl}>baixar</a>
        </div>
      )}
    </div>
  );
}
