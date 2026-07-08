import { useState } from "react"
import { X, User, Mail, Phone, Bus } from "lucide-react"
import { NewUserInput, roleLabels, UserRole } from "../../types/types"

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (user: NewUserInput) => void
  defaultRole?: UserRole
}

const roles: UserRole[] = ["chauffeur", "admin", "user"]

export function CreateUserModal({ isOpen, onClose, onCreate, defaultRole = "chauffeur" }: CreateUserModalProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<UserRole>(defaultRole)
  const [vehicle, setVehicle] = useState("")

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onCreate({ fullName, email, phone, role, vehicle: role === "chauffeur" ? vehicle : undefined })
    setFullName("")
    setEmail("")
    setPhone("")
    setVehicle("")
    setRole(defaultRole)
    onClose()
  }

  const fieldCls = "flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-2.5 focus-within:ring-1 focus-within:ring-[#d0d0d0] transition-shadow"
  const inputCls = "w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
  const labelCls = "mb-1.5 block text-md font-semibold uppercase tracking-wide text-text-muted"

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-[10px] border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-accent">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">Nouvel utilisateur</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          {/* Rôle */}
          <div>
            <label className={labelCls}>Rôle</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-[6px] border py-2 text-[12px] font-medium transition-colors ${
                    role === r
                      ? "border-[#111] bg-[#111] text-white"
                      : "border-border bg-transparent text-text-secondary hover:bg-[#f5f5f5]"
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Nom complet */}
          <div>
            <label className={labelCls}>Nom complet</label>
            <div className={fieldCls}>
              <User className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex. Moussa Diop"
                className={inputCls}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email</label>
            <div className={fieldCls}>
              <Mail className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@rosteltrack.sn"
                className={inputCls}
              />
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <label className={labelCls}>Téléphone</label>
            <div className={fieldCls}>
              <Phone className="h-3.5 w-3.5 shrink-0 text-text-muted" />
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+221 77 000 00 00"
                className={inputCls}
              />
            </div>
          </div>

          {/* Véhicule — chauffeurs seulement */}
          {role === "chauffeur" && (
            <div>
              <label className={labelCls}>Véhicule assigné</label>
              <div className={fieldCls}>
                <Bus className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="Ex. DK-2234"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          <div className="mt-1 flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-[#f5f5f5] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-[6px] bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Créer l'utilisateur
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}