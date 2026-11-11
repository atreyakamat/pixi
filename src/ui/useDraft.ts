"use client";
import { useCallback, useRef, useState } from "react";
import type { SavedLook } from "./store";

/** Draft look with undo/redo. Rapid edits with the same key (a slider drag) collapse into one history step. */
export function useDraft() {
  const [draft, setDraft] = useState<SavedLook | null>(null);
  const past = useRef<SavedLook[]>([]);
  const future = useRef<SavedLook[]>([]);
  const lastKey = useRef("");
  const lastT = useRef(0);
  const [, bump] = useState(0);

  const open = useCallback((l: SavedLook | null) => { past.current = []; future.current = []; lastKey.current = ""; setDraft(l); bump((n) => n + 1); }, []);
  const commit = useCallback((next: SavedLook, key = "") => {
    setDraft((cur) => {
      if (cur) {
        const now = Date.now();
        if (!(key && key === lastKey.current && now - lastT.current < 900)) { past.current.push(cur); if (past.current.length > 50) past.current.shift(); }
        lastKey.current = key; lastT.current = now; future.current = [];
      }
      return next;
    });
    bump((n) => n + 1);
  }, []);
  const undo = useCallback(() => {
    setDraft((cur) => { const p = past.current.pop(); if (!p || !cur) return cur; future.current.push(cur); lastKey.current = ""; return p; });
    bump((n) => n + 1);
  }, []);
  const redo = useCallback(() => {
    setDraft((cur) => { const f = future.current.pop(); if (!f || !cur) return cur; past.current.push(cur); lastKey.current = ""; return f; });
    bump((n) => n + 1);
  }, []);
  return { draft, open, commit, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}
