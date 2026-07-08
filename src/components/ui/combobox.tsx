"use client";

import { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Check } from "lucide-react";

interface ComboboxOption {
  value: string;
  label: string;
  icon?: string;
  sub?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selectionner...",
  searchPlaceholder = "Search...",
  allowCustom = false,
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Si le Combobox est ouvert à l'intérieur d'un Dialog (Radix), son FocusScope
  // reprend de force le focus dès qu'il sort du sous-arbre de la modale. Un portail
  // vers document.body est donc "en dehors" et perd le focus en boucle (impossible
  // de taper). Dans ce cas on ne porte PAS le dropdown : on le rend normalement,
  // à l'intérieur de la modale, en position absolute plutôt que fixed+portal.
  const [inDialog, setInDialog] = useState(false);
  useEffect(() => {
    setInDialog(!!containerRef.current?.closest('[data-slot="dialog-content"]'));
  }, []);

  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase()) ||
      (o.sub && o.sub.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = options.find((o) => o.value === value);

  // Calcule la position du dropdown en fonction du bouton trigger.
  // Inutile (et non appelé) quand on est dans un Dialog : le dropdown est alors
  // rendu inline, positionné en absolute via CSS plutôt que calculé en JS.
  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 260; // max-height approximative

    const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: "fixed",
      width: rect.width,
      left: rect.left,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
      zIndex: 9999,
      // Quand ce Combobox est ouvert à l'intérieur d'un Dialog (Radix), le Dialog
      // met `pointer-events: none` sur <body> pour bloquer tout ce qui est en dehors
      // de sa propre modale. Notre dropdown est un portail séparé (enfant direct de
      // body) : sans ce override explicite, il hérite de ce blocage → plus de hover,
      // les clics ne sélectionnent rien et semblent "traverser" jusqu'à l'overlay.
      pointerEvents: "auto",
    });
  }, []);

  const selectOption = useCallback(
    (val: string) => {
      onChange(val);
      setOpen(false);
      setSearch("");
      setHighlightIndex(-1);
    },
    [onChange]
  );

  // Ferme si clic en dehors
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdownEl = document.getElementById(`portal-${listboxId}`);
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownEl &&
        !dropdownEl.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, listboxId]);

  // Recalcule la position au scroll/resize (seulement en mode portail)
  useEffect(() => {
    if (!open || inDialog) return;
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [open, updateDropdownPosition]);

  // Focus l'input à l'ouverture
  useEffect(() => {
    if (open && inputRef.current) {
        inputRef.current.focus({ preventScroll: true }); // ← ajouter ça

    }
    if (!open) {
      setHighlightIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setOpen(true);
          setSearch("");
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) => {
            const next = prev < filtered.length - 1 ? prev + 1 : 0;
            const el = listRef.current?.children[next] as HTMLElement | undefined;
            el?.scrollIntoView({ block: "nearest" });
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) => {
            const next = prev > 0 ? prev - 1 : filtered.length - 1;
            const el = listRef.current?.children[next] as HTMLElement | undefined;
            el?.scrollIntoView({ block: "nearest" });
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < filtered.length) {
            selectOption(filtered[highlightIndex].value);
          } else if (allowCustom && search && filtered.length === 0) {
            selectOption(search);
          }
          break;
      }
    },
    [open, filtered, highlightIndex, allowCustom, search, selectOption]
  );

  const dropdown = open ? (
    <div
      id={`portal-${listboxId}`}
      style={inDialog ? undefined : dropdownStyle}
      className={cn(
        "rounded-sm border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#0c1023] shadow-lg animate-in fade-in-0 zoom-in-95",
        // Mode inline (dans un Dialog) : positionné en absolute juste sous le bouton,
        // au lieu de fixed+portal (qui casserait le focus trap de la modale).
        inDialog && "absolute left-0 top-full z-50 mt-1 w-full"
      )}
    >
      {/* Barre de recherche */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/[0.08] px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // placeholder={searchPlaceholder}
          className="flex-1 bg-transparent text-md text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            highlightIndex >= 0 ? `${listboxId}-${highlightIndex}` : undefined
          }
        />
      </div>

      {/* Liste des options */}
      <div
        ref={listRef}
        id={listboxId}
        role="listbox"
        className="max-h-[220px] overflow-y-auto p-1"
      >
        {filtered.length === 0 ? (
          <div className="px-3 py-6 text-center text-md text-gray-500 dark:text-gray-400">
            {allowCustom && search ? (
              <button
                type="button"
                onClick={() => selectOption(search)}
                className="text-rht-violet-light hover:underline"
              >
                Utiliser &quot;{search}&quot;
              </button>
            ) : (
              "Aucun résultat"
            )}
          </div>
        ) : (
          filtered.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={value === option.value}
              onClick={() => selectOption(option.value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-md text-gray-900 dark:text-white transition-colors hover:bg-gray-100 dark:hover:bg-slate-800",
                value === option.value && "bg-gray-100 dark:bg-slate-800",
                highlightIndex === index &&
                  "bg-gray-200 dark:bg-slate-700 ring-1 ring-gray-300 dark:ring-white/10"
              )}
            >
              {option.icon && <span className="text-base">{option.icon}</span>}
              <span className="flex-1 text-left">{option.label}</span>
              {option.sub && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.sub}
                </span>
              )}
              {value === option.value && (
                <Check className="h-4 w-4 text-rht-violet-light" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((prev) => !prev);
          setSearch("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 px-3 py-1 text-md shadow-xs transition-colors",
          "hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-gray-500",
          value && "text-gray-900 dark:text-white"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.icon && <span>{selected.icon}</span>}
          {selected?.label || value || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dans un Dialog : rendu inline (reste dans le focus trap de la modale).
          Sinon : rendu via portal → échappe tout overflow:hidden et z-index des parents. */}
      {inDialog
        ? dropdown
        : typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}