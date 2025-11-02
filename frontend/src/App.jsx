import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import ImageList from "./components/ImageList";
import ImageViewer from "./components/ImageViewer";
import useNotifications from "./hooks/useNotifications";

export default function App() {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [images, setImages] = useState([]);

  function handleUploaded(json) {
    // força atualização da lista (refreshKey muda)
    setRefreshKey((k) => k + 1);
    // opcional: selecionar automaticamente a imagem recém-criada (se id presente)
    if (json && json.id) {
      setTimeout(() => {
        // small delay to let backend insert record
        setSelected({ id: json.id, filename: json.filename, original_name: json.filename, status: json.status });
      }, 800);
    }
  }
  useNotifications((msg) => {
    setImages(prev => {
      const idx = prev.findIndex(i => i.id === msg.id);
      if (idx === -1) {
        return prev;
      } else {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], status: msg.status, meta: msg.meta };
        return copy;
      }
    });
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <UploadForm onUploaded={handleUploaded} />
          <ImageList onSelect={(img) => setSelected(img)} refreshKey={refreshKey} />
        </div>
        <div className="col-span-2">
          <ImageViewer image={selected} />
        </div>
      </div>
    </div>
  );
}
