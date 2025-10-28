import React, { useState } from "react";

export default function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

  function reset() {
    setFile(null);
    setProgress(0);
    setUploading(false);
  }

  function handleFileChange(e) {
    setFile(e.target.files?.[0] ?? null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Selecione um arquivo.");

    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/upload`, true);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      setProgress(0);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          onUploaded && onUploaded(json);
          alert("Upload enviado com sucesso.");
          reset();
        } catch (err) {
          console.error("Resposta inválida:", xhr.responseText);
          alert("Upload concluído, mas resposta inválida do servidor.");
        }
      } else {
        console.error("Erro upload:", xhr.status, xhr.responseText);
        alert("Erro no upload: " + xhr.status);
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setProgress(0);
      alert("Erro de rede durante o upload.");
    };

    xhr.send(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Enviar imagem
      </label>
      <input
        type="file"
        accept=".tif,.tiff,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="mb-3"
      />
      {uploading && (
        <div className="mb-2">
          <div className="w-full bg-gray-200 rounded">
            <div
              className="h-2 rounded bg-blue-600"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{progress}%</div>
        </div>
      )}
      <div>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {uploading ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
