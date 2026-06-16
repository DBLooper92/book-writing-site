"use client";

import { useEffect, useRef, useState } from "react";

type TimelineDraftMenuProps = {
  onNewWindow: () => void;
  onSplitScreen: () => void;
};

export function TimelineDraftMenu({ onNewWindow, onSplitScreen }: TimelineDraftMenuProps) {
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        setOpen(false);
        return;
      }

      if (menuButtonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  function openMenu() {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setOpen(true);
  }

  function closeMenuSoon() {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 250);
  }

  function handleButtonClick() {
    if (open) {
      setOpen(false);
      return;
    }

    openMenu();
  }

  return (
    <div className="relative" onMouseEnter={openMenu} onMouseLeave={closeMenuSoon}>
      <button
        ref={menuButtonRef}
        type="button"
        onClick={handleButtonClick}
        onFocus={openMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50"
      >
        Manuscript
      </button>

      {open ? (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-2 shadow-[0_16px_40px_-24px_rgba(24,24,27,0.5)]"
          role="menu"
          onMouseEnter={openMenu}
          onMouseLeave={closeMenuSoon}
          onPointerDownCapture={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Manuscript
            </p>
          </div>

          <div className="space-y-1 pr-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewWindow();
              }}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
              role="menuitem"
            >
              <span>New Window</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSplitScreen();
              }}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-950"
              role="menuitem"
            >
              <span>Split Screen</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
