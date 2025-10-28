import React, { useEffect, useState, useRef } from "react";

export default function ImageList({ onSelect, refreshKey }) {
  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  async function fetchImages() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/images`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error("Erro ao buscar imagens:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchImages();
    // polling leve para atualizar status (ex: pending -> done)
    intervalRef.current = setInterval(fetchImages, 5000); // 5s
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // também refaz lista quando refreshKey muda (por exemplo, após upload)
  useEffect(() => {
    if (refreshKey != null) fetchImages();
  }, [refreshKey]);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-3">Imagens</h3>
      {loading ? (
        <div>Carregando...</div>
      ) : images.length === 0 ? (
        <div>Nenhuma imagem encontrada</div>
      ) : (
        <ul className="space-y-2 max-h-[60vh] overflow-auto">
          {images.map((img) => (
            <li
              key={img.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <div>
                <div className="font-medium">{img.original_name || img.filename}</div>
                <div className="text-xs text-gray-500">
                  id: {img.id} — status: {img.status}
                </div>
                {img.meta && (
                  <div className="text-xs text-gray-400">
                    {img.meta.note || (img.meta.width ? `${img.meta.width}×${img.meta.height}` : "")}
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={() => onSelect(img)}
                  className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
                >
                  Ver
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
