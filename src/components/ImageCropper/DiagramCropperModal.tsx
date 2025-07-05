"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, {
  type Crop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FaTimes } from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface DiagramCropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (croppedBase64: string, cropArea: Crop) => void;
}

// Utility to create an HTMLImageElement from a data URL
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImage(imageSrc: string, crop: Crop): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("Canvas operations not available on server");
  }

  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const scaleX = img.naturalWidth / (img.width || 1);
  const scaleY = img.naturalHeight / (img.height || 1);

  const pixelCrop = {
    x: Math.round((crop.x || 0) * scaleX),
    y: Math.round((crop.y || 0) * scaleY),
    width: Math.round((crop.width || 0) * scaleX),
    height: Math.round((crop.height || 0) * scaleY),
  };

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not found");

  ctx.drawImage(
    img,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}

export const DiagramCropperModal: React.FC<DiagramCropperModalProps> = ({
  imageSrc,
  onCancel,
  onSave,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>(() => ({
    unit: "%",
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  }));
  const [saving, setSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const onComplete = useCallback((c: Crop) => {
    setCrop(c);
  }, []);

  const handleSave = async () => {
    if (!crop.width || !crop.height || !isClient) return;
    try {
      setSaving(true);
      const base64 = await getCroppedImage(imageSrc, crop);
      onSave(base64, crop);
    } catch (err) {
      console.error("Failed to crop image", err);
    } finally {
      setSaving(false);
    }
  };

  if (!isClient) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading image cropper...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Crop Diagram</h3>
            <p className="text-xs text-gray-500 mt-1">
              (Only needed when the question requires an accompanying
              image/diagram)
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-800"
          >
            <FaTimes />
          </button>
        </div>

        {/* Cropper */}
        <div className="relative flex-1 overflow-auto bg-gray-900 flex items-center justify-center">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={onComplete}
            keepSelection
            aspect={undefined}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="To crop"
              style={{ maxWidth: "100%", maxHeight: "80vh" }}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div className="p-4 flex items-center justify-end border-t bg-gray-50 space-x-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !crop.width}>
            {saving ? "Saving..." : "Save Diagram"}
          </Button>
        </div>
      </div>
    </div>
  );
};
