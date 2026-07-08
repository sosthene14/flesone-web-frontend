import { useEffect, useState } from "react"
import {
  Building,
  MapPin,
  Globe,
  Layers,
  Pencil,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Plus,
} from "lucide-react"
import { useOrganizationStore } from "../store/useOrganisationStore"
import { useAuthStore } from "../store/useAuthStore"
import toast from "react-hot-toast"
import { RequiredStar } from "./ui/RequiredStar"
import { SECTOR_SUGGESTIONS } from "@/utils/constants"
import CreatableSelect from 'react-select/creatable'
import { SingleValue, StylesConfig } from 'react-select'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
const fieldCls =
  "flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-2.5 focus-within:ring-1 focus-within:ring-[#d0d0d0] transition-shadow"
const labelCls =
  "mb-1.5 block text-md font-semibold uppercase tracking-wide text-text-muted"

type OrgForm = { name: string; sector: string; city: string; country: string }
const emptyForm: OrgForm = { name: "", sector: "", city: "", country: "" }

// ─── Modal ────────────────────────────────────────────────────────────────────

interface OrgModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (e: React.FormEvent, form: OrgForm) => Promise<void>
  initial?: OrgForm
  title: string
  submitting: boolean
}



// Suggestions de secteurs — l'utilisateur peut aussi taper autre chose

type SectorOption = { value: string; label: string }

// Styles custom pour matcher le design du reste du formulaire
const selectStyles: StylesConfig<SectorOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '38px',
    borderRadius: '6px',
    borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
    boxShadow: state.isFocused ? '0 0 0 1px var(--accent)' : 'none',
    fontSize: '13px',
    cursor: 'text',
    '&:hover': {
      borderColor: 'var(--accent)',
    },
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '13px',
    backgroundColor: state.isSelected
      ? 'var(--accent)'
      : state.isFocused
      ? '#f5f5f5'
      : 'white',
    color: state.isSelected ? 'white' : 'var(--text-primary)',
    cursor: 'pointer',
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: '13px',
    color: 'var(--text-muted)',
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: '13px',
  }),
  input: (base) => ({
    ...base,
    fontSize: '13px',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '6px',
    overflow: 'hidden',
    zIndex: 50,
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
}

function OrgModal({ isOpen, onClose, onSave, initial = emptyForm, title, submitting }: OrgModalProps) {
  const [form, setForm] = useState<OrgForm>(initial)

  useEffect(() => {
    setForm(initial)
  }, [isOpen])

  if (!isOpen) return null

  const handleSectorChange = (selected: SingleValue<SectorOption>) => {
    setForm(p => ({ ...p, sector: selected?.label ?? '' }))
  }

  // Valeur actuelle du select : cherche une correspondance dans les suggestions,
  // sinon construit une option "custom" à partir du texte déjà présent en form.sector
  const currentSelectValue: SectorOption | null = form.sector
    ? SECTOR_SUGGESTIONS.find(opt => opt.label === form.sector) ?? {
        value: form.sector,
        label: form.sector,
      }
    : null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-[10px] border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-accent">
              <Building className="h-3.5 w-3.5 text-white" />
            </div>
            <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => onSave(e, form)} className="px-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nom */}
            <div className="col-span-2">
              <label className={labelCls}>
                Nom <RequiredStar />
              </label>
              <div className={fieldCls}>
                <Building className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  id="org-name"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex. GATS BUS Dakar"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Secteur — CreatableSelect */}
            <div className="col-span-2">
              <label className={labelCls}>Secteur</label>
              <div className="flex items-center gap-2 rounded-[6px] border border-border px-0">
                <CreatableSelect<SectorOption, false>
                  inputId="org-sector"
                  value={currentSelectValue}
                  onChange={handleSectorChange}
                  options={SECTOR_SUGGESTIONS}
                  styles={selectStyles}
                  placeholder="Ex. Transport scolaire, BTP..."
                  formatCreateLabel={(inputValue) => `Utiliser "${inputValue}"`}
                  noOptionsMessage={() => 'Tapez pour créer un secteur'}
                  isClearable
                  className="w-full"
                  classNamePrefix="sector-select"
                />
              </div>
            </div>

            {/* Ville */}
            <div>
              <label className={labelCls}>Ville</label>
              <div className={fieldCls}>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  id="org-city"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  placeholder="Ex. Dakar"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Pays */}
            <div>
              <label className={labelCls}>Pays</label>
              <div className={fieldCls}>
                <Globe className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                <input
                  id="org-country"
                  value={form.country}
                  onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  placeholder="Ex. Sénégal"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[6px] border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-[#f5f5f5] transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-[6px] bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Detail field (read mode) ─────────────────────────────────────────────────

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className={labelCls}>{label}</p>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] bg-[#f5f5f5]">
        <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" />
        <span className={`text-sm ${value ? "text-text-primary" : "text-text-muted italic"}`}>
          {value || "Non renseigné"}
        </span>
      </div>
    </div>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function OrganizationsView() {
  const { user } = useAuthStore()
  const { currentOrganization, isLoading, fetchById, createOrganization, updateOrganization } =
    useOrganizationStore()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user?.organization_id) fetchById(user.organization_id)
  }, [user?.organization_id, fetchById])

  async function handleCreate(e: React.FormEvent, form: OrgForm) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createOrganization({
        name: form.name,
        sector: form.sector || null,
        city: form.city || null,
        country: form.country || null,
      })
      toast.success("Organisation créée avec succès")
      setCreateModalOpen(false)
    } catch {
      toast.error("Erreur lors de la création")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e: React.FormEvent, form: OrgForm) {
    e.preventDefault()
    if (!currentOrganization) return
    setSubmitting(true)
    try {
      const res = await updateOrganization(currentOrganization.id, {
        name: form.name,
        sector: form.sector || null,
        city: form.city || null,
        country: form.country || null,
      })
      if (res) {
        setEditModalOpen(false)
      }
       
    } catch {
      //
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading && !currentOrganization) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Chargement de l'organisation…</span>
      </div>
    )
  }

  // ── No org linked ──────────────────────────────────────────────────────────
  if (!user?.organization_id && !currentOrganization) {
    return (
      <>
        <div className=" rounded-[8px] border border-border bg-card p-10 flex flex-col items-center text-center gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f5]">
            <AlertCircle className="h-6 w-6 text-text-muted" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text-primary">Aucune organisation liée</p>
            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">
              Votre compte n'est rattaché à aucune organisation pour le moment.
            </p>
          </div>
          <button
            id="org-create-btn"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-[6px] bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer une organisation
          </button>
        </div>

        <OrgModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSave={handleCreate}
          title="Nouvelle organisation"
          submitting={submitting}
        />
      </>
    )
  }

  // ── Org exists ─────────────────────────────────────────────────────────────
  const org = currentOrganization
  const initials = org
    ? org.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "—"

  return (
    <>
      <div className="flex flex-col gap-6  ">
        {/* Header card */}
        <div className="rounded-[8px] border border-border bg-card overflow-hidden">
          <div className="h-20 bg-accent-soft" />
          <div className="px-6 pb-5">
            <div className="-mt-8 flex items-end justify-between gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border-2 border-card bg-accent text-[18px] font-bold text-white shadow-sm">
                {initials}
              </div>
              <button
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-2 rounded-[6px] bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                <Pencil className="h-3.5 w-3.5 text-white" />
                Modifier
              </button>
            </div>

            <div className="mt-3">
              <h1 className="text-[18px] font-bold text-text-primary leading-tight">
                {org?.name ?? "—"}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-text-muted">
                {org?.sector && (
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {org.sector}
                  </span>
                )}
                {(org?.city || org?.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[org?.city, org?.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {org && (
                  <span className={`inline-flex items-center gap-1 font-medium ${org.is_active ? "text-success" : "text-text-muted"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${org.is_active ? "bg-success" : "bg-[#d0d0d0]"}`} />
                    {org.is_active ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detail card */}
        <div className="rounded-[8px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Informations de l'organisation
              </h2>
              {org && (
                <p className="text-md text-text-muted mt-0.5">
                  Créée le{" "}
                  {new Date(org.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            {isLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-text-muted" />}
          </div>

          <div className="px-5 py-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <DetailField icon={Building} label="Nom" value={org?.name} />
            </div>
            <DetailField icon={Layers} label="Secteur" value={org?.sector} />
            <DetailField icon={Globe} label="Pays" value={org?.country} />
            <div className="sm:col-span-2">
              <DetailField icon={MapPin} label="Ville" value={org?.city} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <OrgModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleEdit}
        title="Modifier l'organisation"
        submitting={submitting}
        initial={
          org
            ? { name: org.name, sector: org.sector ?? "", city: org.city ?? "", country: org.country ?? "" }
            : emptyForm
        }
      />
    </>
  )
}
