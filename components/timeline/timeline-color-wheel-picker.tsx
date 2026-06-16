"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { normalizeTimelineBookmarkCollectionColor } from "@/lib/timeline/bookmark-collections";

type TimelineColorWheelPickerProps = {
  label?: string;
  value: string;
  onChange: (nextColor: string) => void;
};

type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

const WHEEL_PADDING = 14;
const DEFAULT_HSV_COLOR: HsvColor = {
  hue: 42,
  saturation: 1,
  value: 1,
};

export function TimelineColorWheelPicker({
  label = "Color",
  value,
  onChange,
}: TimelineColorWheelPickerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragActiveRef = useRef(false);
  const sizeRef = useRef(0);
  const [size, setSize] = useState(0);
  const [selectedColor, setSelectedColor] = useState<HsvColor>(() =>
    hexToHsv(normalizeTimelineBookmarkCollectionColor(value))
  );

  const normalizedValue = useMemo(
    () => normalizeTimelineBookmarkCollectionColor(value),
    [value]
  );

  useEffect(() => {
    setSelectedColor(hexToHsv(normalizedValue));
  }, [normalizedValue]);

  useEffect(() => {
    const node = wrapperRef.current;

    if (!node) {
      return;
    }

    function updateSize(nextWidth: number) {
      const nextSize = Math.max(0, Math.floor(nextWidth));

      if (sizeRef.current !== nextSize) {
        sizeRef.current = nextSize;
        setSize(nextSize);
      }
    }

    updateSize(node.getBoundingClientRect().width);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];

        if (!entry) {
          return;
        }

        updateSize(entry.contentRect.width);
      });

      observer.observe(node);

      return () => {
        observer.disconnect();
      };
    }

    const handleResize = () => {
      updateSize(node.getBoundingClientRect().width);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || size <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelSize = Math.max(1, Math.floor(size * dpr));
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    canvas.width = pixelSize;
    canvas.height = pixelSize;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    drawColorWheel(context, pixelSize, dpr);
  }, [size]);

  function handlePointerChange(event: ReactPointerEvent<HTMLDivElement>) {
    const node = wrapperRef.current;

    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const nextColor = selectColorFromPoint(event.clientX, event.clientY, rect);

    if (!nextColor) {
      return;
    }

    setSelectedColor(nextColor);
    onChange(hsvToHex(nextColor));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    dragActiveRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    handlePointerChange(event);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragActiveRef.current) {
      return;
    }

    handlePointerChange(event);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragActiveRef.current) {
      return;
    }

    dragActiveRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    handlePointerChange(event);
  }

  function handlePointerLeave() {
    dragActiveRef.current = false;
  }

  const handlePosition = useMemo(
    () => getHandlePosition(selectedColor, size),
    [selectedColor, size]
  );
  const selectedHex = hsvToHex(selectedColor);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          Drag the marker around the wheel to choose any hex color.
        </p>
      </div>

      <div ref={wrapperRef} className="relative mx-auto w-full max-w-[23rem] select-none">
        <div className="relative aspect-square w-full">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full rounded-full"
            aria-hidden="true"
          />

          <div
            className="absolute inset-0 rounded-full"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            role="img"
            aria-label="Color wheel picker"
          />

          {size > 0 ? (
            <div
              className="pointer-events-none absolute top-0 left-0 rounded-full border border-white shadow-[0_0_0_1px_rgba(24,24,27,0.22),0_10px_24px_-10px_rgba(24,24,27,0.45)]"
              style={{
                backgroundColor: selectedHex,
                height: "1.2rem",
                transform: `translate(${handlePosition.x}px, ${handlePosition.y}px) translate(-50%, -50%)`,
                width: "1.2rem",
              }}
            >
              <span
                className="absolute inset-[3px] rounded-full border border-white/70 shadow-[0_0_0_1px_rgba(24,24,27,0.08)]"
                style={{ backgroundColor: selectedHex }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <span
          className="h-8 w-8 shrink-0 rounded-full border border-zinc-200 shadow-[0_6px_18px_-12px_rgba(24,24,27,0.45)]"
          style={{ backgroundColor: selectedHex }}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Hex
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-950">{selectedHex}</p>
        </div>
      </div>
    </div>
  );
}

function drawColorWheel(context: CanvasRenderingContext2D, pixelSize: number, dpr: number) {
  const imageData = context.createImageData(pixelSize, pixelSize);
  const center = pixelSize / 2;
  const radius = center - WHEEL_PADDING * dpr;
  const radiusSquared = radius * radius;
  const data = imageData.data;

  for (let y = 0; y < pixelSize; y += 1) {
    const offsetY = y - center;

    for (let x = 0; x < pixelSize; x += 1) {
      const offsetX = x - center;
      const distanceSquared = offsetX * offsetX + offsetY * offsetY;
      const pixelIndex = (y * pixelSize + x) * 4;

      if (distanceSquared > radiusSquared) {
        data[pixelIndex + 3] = 0;
        continue;
      }

      const distance = Math.sqrt(distanceSquared);
      const saturation = clamp(distance / radius, 0, 1);
      const hue = ((Math.atan2(offsetY, offsetX) * 180) / Math.PI + 360) % 360;
      const { red, green, blue } = hsvToRgb({ hue, saturation, value: 1 });

      data[pixelIndex] = red;
      data[pixelIndex + 1] = green;
      data[pixelIndex + 2] = blue;
      data[pixelIndex + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);

  const halo = context.createRadialGradient(center, center, radius * 0.56, center, center, radius);
  halo.addColorStop(0, "rgba(255,255,255,0.16)");
  halo.addColorStop(1, "rgba(255,255,255,0)");

  context.fillStyle = halo;
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fill();
}

function selectColorFromPoint(
  clientX: number,
  clientY: number,
  rect: DOMRect
): HsvColor | null {
  const radius = Math.min(rect.width, rect.height) / 2 - WHEEL_PADDING;

  if (radius <= 0) {
    return null;
  }

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const offsetX = clientX - centerX;
  const offsetY = clientY - centerY;
  const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const clampedDistance = clamp(distance, 0, radius);
  const hue = ((Math.atan2(offsetY, offsetX) * 180) / Math.PI + 360) % 360;

  return {
    hue,
    saturation: clamp(clampedDistance / radius, 0, 1),
    value: 1,
  };
}

function getHandlePosition(color: HsvColor, size: number) {
  const radius = Math.max(0, size / 2 - WHEEL_PADDING);
  const angle = (color.hue * Math.PI) / 180;
  const distance = radius * clamp(color.saturation, 0, 1);

  return {
    x: size / 2 + Math.cos(angle) * distance,
    y: size / 2 + Math.sin(angle) * distance,
  };
}

function hexToHsv(hex: string): HsvColor {
  const normalized = normalizeTimelineBookmarkCollectionColor(hex);
  const match = normalized.match(/^#([0-9a-f]{6})$/i);

  if (!match) {
    return DEFAULT_HSV_COLOR;
  }

  const red = Number.parseInt(match[1].slice(0, 2), 16) / 255;
  const green = Number.parseInt(match[1].slice(2, 4), 16) / 255;
  const blue = Number.parseInt(match[1].slice(4, 6), 16) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, value: max };
  }

  let hue = 0;

  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  hue *= 60;

  if (hue < 0) {
    hue += 360;
  }

  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

function hsvToHex(color: HsvColor) {
  const { red, green, blue } = hsvToRgb(color);

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function hsvToRgb(color: HsvColor) {
  const hue = ((color.hue % 360) + 360) % 360;
  const saturation = clamp(color.saturation, 0, 1);
  const value = clamp(color.value, 0, 1);
  const chroma = value * saturation;
  const intermediate = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = intermediate;
  } else if (hue < 120) {
    red = intermediate;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = intermediate;
  } else if (hue < 240) {
    green = intermediate;
    blue = chroma;
  } else if (hue < 300) {
    red = intermediate;
    blue = chroma;
  } else {
    red = chroma;
    blue = intermediate;
  }

  return {
    red: Math.round((red + match) * 255),
    green: Math.round((green + match) * 255),
    blue: Math.round((blue + match) * 255),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
