import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import ImageList from "./components/ImageList";
import ImageViewer from "./components/ImageViewer";

export default function App() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <UploadForm onUploaded={() => window.location.reload()} />
          <ImageList onSelect={(img) => setSelected(img)} />
        </div>
        <div className="col-span-2">
          <ImageViewer image={selected} />
        </div>
      </div>
    </div>
  );
}
