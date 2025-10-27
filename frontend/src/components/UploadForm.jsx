import React, { useState } from "react";

export default function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Selecione um arquivo.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Erro ${res.status}`);
      }
      const json = await res.json();
      setFile(null);
      onUploaded && onUploaded(json);
      alert("Upload enviado com sucesso.");
    } catch (err) {
      console.error(err);
      alert("Erro no upload: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow">
      <label className="block text-sm font-medium text-gray-700 mb-2">Enviar imagem</label>
      <input
        type="file"
        accept=".tif,.tiff,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="mb-3"
      />
      <div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
