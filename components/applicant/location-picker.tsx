"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { googleMapsUrl, parseMapPoint, serializeMapPoint } from "@/lib/location";

type MapsListener = { remove: () => void };
type MapsPoint = { lat: number; lng: number };
type MapsLatLng = { lat: () => number; lng: () => number };
type MapsMarker = {
  addListener: (event: "dragend", callback: () => void) => MapsListener;
  getPosition: () => MapsLatLng | null;
  setMap: (map: MapsMap | null) => void;
  setPosition: (point: MapsPoint) => void;
};
type MapsMap = {
  addListener: (event: "click", callback: (event: { latLng?: MapsLatLng | null }) => void) => MapsListener;
  setCenter: (point: MapsPoint) => void;
  setZoom: (zoom: number) => void;
};
type MapsApi = {
  Map: new (element: HTMLElement, options: { center: MapsPoint; zoom: number; mapTypeControl: boolean; streetViewControl: boolean; fullscreenControl: boolean }) => MapsMap;
  Marker: new (options: { map: MapsMap; position: MapsPoint; draggable: boolean; title: string }) => MapsMarker;
};

function mapsApi() {
  return (window as Window & { google?: { maps?: MapsApi } }).google?.maps;
}

export function LocationPicker({
  id,
  value,
  onChange,
  invalid = false,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapElement = useRef<HTMLDivElement>(null);
  const map = useRef<MapsMap | null>(null);
  const marker = useRef<MapsMarker | null>(null);
  const listeners = useRef<MapsListener[]>([]);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const point = parseMapPoint(value);
  const coordinates = value.split(",");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const maps = mapsLoaded ? mapsApi() : undefined;
    if (!maps || !mapElement.current) return;
    const initialPoint = parseMapPoint(valueRef.current);
    if (!map.current) {
      map.current = new maps.Map(mapElement.current, {
        center: initialPoint ?? { lat: -2.5, lng: 118 },
        zoom: initialPoint ? 15 : 4,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }
    listeners.current.push(map.current.addListener("click", (event) => {
      if (!event.latLng) return;
      onChangeRef.current(serializeMapPoint({ lat: event.latLng.lat(), lng: event.latLng.lng() }));
    }));
    return () => {
      listeners.current.splice(0).forEach((listener) => listener.remove());
    };
  }, [id, mapsLoaded]);

  useEffect(() => {
    const maps = mapsLoaded ? mapsApi() : undefined;
    if (!maps || !map.current) return;
    const point = parseMapPoint(value);
    if (!point) {
      marker.current?.setMap(null);
      marker.current = null;
      return;
    }
    map.current.setCenter(point);
    map.current.setZoom(15);
    if (!marker.current) {
      marker.current = new maps.Marker({ map: map.current, position: point, draggable: true, title: "Titik lokasi pengajuan" });
      listeners.current.push(marker.current.addListener("dragend", () => {
        const position = marker.current?.getPosition();
        if (position) onChangeRef.current(serializeMapPoint({ lat: position.lat(), lng: position.lng() }));
      }));
    } else {
      marker.current.setMap(map.current);
      marker.current.setPosition(point);
    }
  }, [mapsLoaded, value]);

  function changeCoordinate(index: 0 | 1, next: string) {
    const updated = [coordinates[0] ?? "", coordinates[1] ?? ""];
    updated[index] = next;
    onChange(`${updated[0]},${updated[1]}`);
  }

  return (
    <div className="space-y-3" aria-describedby={describedBy}>
      {apiKey ? (
        <>
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`}
            strategy="afterInteractive"
            onReady={() => setMapsLoaded(true)}
            onError={() => setMapError(true)}
          />
          <div ref={mapElement} className="h-72 w-full border border-border bg-muted" aria-label="Peta Google. Klik atau geser pin untuk memilih lokasi." />
          {!mapsLoaded || mapError ? <p className="text-xs text-muted-foreground" role="status">{mapError ? "Peta tidak dapat dimuat. Masukkan koordinat secara manual." : "Memuat peta…"}</p> : null}
        </>
      ) : (
        <p className="text-xs text-muted-foreground" role="status">Peta belum tersedia. Masukkan koordinat secara manual.</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {(["Latitude", "Longitude"] as const).map((label, index) => (
          <div key={label}>
            <label className="field-label" htmlFor={`${id}-${label.toLowerCase()}`}>{label}</label>
            <Input
              id={`${id}-${label.toLowerCase()}`}
              type="number"
              min={index === 0 ? -90 : -180}
              max={index === 0 ? 90 : 180}
              step="any"
              value={coordinates[index] ?? ""}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              onChange={(event) => changeCoordinate(index as 0 | 1, event.target.value)}
            />
          </div>
        ))}
      </div>
      {googleMapsUrl(value) ? <a className="text-link text-sm" href={googleMapsUrl(value)} target="_blank" rel="noreferrer">Buka titik di Google Maps</a> : null}
    </div>
  );
}
