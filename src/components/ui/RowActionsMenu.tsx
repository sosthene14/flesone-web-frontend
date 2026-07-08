import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

interface RowActionsMenuProps {
  children: (close: () => void) => React.ReactNode;
}

// Menu d'actions de ligne de tableau (⋮), réutilisable partout.
// Rendu via un portail dans document.body pour ne pas être rogné par les
// conteneurs "overflow-x-auto" des tableaux, et se ferme au clic extérieur / scroll.
export function RowActionsMenu({ children }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.right - 176 }); // 176px = largeur du menu (w-44)
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={toggle}
        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-muted hover:bg-[#f5f5f5] hover:text-text-primary transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left }}
            className="z-50 w-44 rounded-[6px] border border-border bg-card shadow-lg py-1"
          >
            {children(() => setOpen(false))}
          </div>,
          document.body
        )}
    </div>
  );
}
