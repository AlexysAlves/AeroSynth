import React, { useEffect, useState } from "react";

export default function ImageList({ onSelect }) {
  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchImages() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/images`);
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar imagens");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchImages();
    const id = setInterval(fetchImages, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-3">Imagens</h3>
      {loading ? (
        <div>Carregando...</div>
      ) : images.length === 0 ? (
        <div>Nenhuma imagem encontrada</div>
      ) : (
        <ul className="space-y-2">
          {images.map((img) => (
            <li key={img.id} className="flex items-center justify-between">
              <div>
                <div className="font-medium">{img.original_name || img.filename}</div>
                <div className="text-xs text-gray-500">
                  id: {img.id} — status: {img.status}
                </div>
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
