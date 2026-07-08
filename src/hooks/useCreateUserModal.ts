import { useState } from "react"

export function useCreateUserModal() {
  const [isOpen, setIsOpen] = useState(false)
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }
}