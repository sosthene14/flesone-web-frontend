/** Petit astérisque rouge à placer après le libellé d'un champ requis. */
export function RequiredStar() {
  return (
    <span className="ml-0.5 text-danger leading-none" aria-hidden="true">
      *
    </span>
  )
}
