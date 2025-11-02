import React, { useMemo } from "react";
import { MapContainer, TileLayer, Rectangle, Marker, Popup, ImageOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconRetinaUrl = new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href;
const iconUrl = new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href;
const shadowUrl = new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

export default function MapPanel({ bounds, thumbnailUrl = null }) {
  const boundsArray = useMemo(() => {
    if (!bounds) return null;
    return [
      [bounds.bottom, bounds.left], 
      [bounds.top, bounds.right],   
    ];
  }, [bounds]);

  if (!boundsArray && thumbnailUrl) {
    return (
      <div className="p-4 bg-white rounded shadow text-sm text-gray-600">
        <div className="font-medium mb-2">Preview (sem metadados de geolocalização)</div>
        <div className="w-full h-60 bg-gray-100 flex items-center justify-center overflow-hidden border">
          <img src={thumbnailUrl} alt="thumbnail preview" style={{ maxWidth: "100%", maxHeight: "100%" }} />
        </div>
        <div className="mt-2 text-xs text-gray-500">A imagem não tem bbox; não é possível posicioná-la no mapa.</div>
      </div>
    );
  }

  if (!boundsArray) {
    return (
      <div className="p-4 bg-white rounded shadow text-sm text-gray-600">
        Sem metadados de geolocalização disponíveis para essa imagem.
      </div>
    );
  }

  const center = [
    (bounds.bottom + bounds.top) / 2,
    (bounds.left + bounds.right) / 2,
  ];

  return (
    <div className="rounded shadow overflow-hidden" style={{ height: 360 }}>
      <MapContainer bounds={boundsArray} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* overlay da thumbnail se existir */}
        {thumbnailUrl && (
          <ImageOverlay url={thumbnailUrl} bounds={boundsArray} opacity={0.8} />
        )}

        {/* bbox visual */}
        <Rectangle bounds={boundsArray} pathOptions={{ color: "#3b82f6", weight: 2, fillOpacity: 0.05 }} />

        {/* marcador no centro */}
        <Marker position={center}>
          <Popup>
            Centro do BBox<br />
            [{center[0].toFixed(6)}, {center[1].toFixed(6)}]
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
