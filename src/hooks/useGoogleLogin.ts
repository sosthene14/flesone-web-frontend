// hooks/useGoogleLogin.ts
//
// Encapsule tout le flux "Se connecter avec Google" (Google Identity
// Services -> ID token -> useAuthStore.googleLogin -> POST /auth/google côté
// backend). Un seul hook, branché à l'identique sur LoginView et
// RegisterView : même bouton Google, même comportement (connexion si le
// compte existe déjà, création automatique côté backend sinon — voir
// AuthService.GoogleLogin).
//
// On utilise google.accounts.id.prompt() (Google Identity Services / "One
// Tap") plutôt que le bouton officiel Google (google.accounts.id.renderButton),
// pour garder le bouton "Google" déjà stylé dans LoginView/RegisterView —
// prompt() est explicitement prévu par Google pour être déclenché depuis un
// geste utilisateur (clic sur un bouton personnalisé).
import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/store/useAuthStore"

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client"
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

declare global {
  interface Window {
    google?: any
  }
}

// Partagé entre tous les composants qui utilisent ce hook en même temps
// (LoginView + RegisterView) : on ne charge le script Google qu'une seule
// fois, peu importe le nombre de montages.
let scriptLoadingPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
  if (scriptLoadingPromise) {
    return scriptLoadingPromise
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Impossible de charger Google Identity Services")))
      return
    }

    const script = document.createElement("script")
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Impossible de charger Google Identity Services"))
    document.head.appendChild(script)
  })

  return scriptLoadingPromise
}

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleSignupSuggestion {
  firstName: string
  lastName: string
  email: string
}

interface UseGoogleLoginOptions {
  // Appelé quand le compte Google trouvé a la 2FA active : aucun token n'est
  // émis, au composant appelant de basculer vers son étape de vérification
  // (le challenge_token est déjà stocké dans useAuthStore, exactement comme
  // après un login() classique).
  onRequires2FA?: (methods: string[]) => void
  // Appelé quand AUCUN compte n'existe pour cet email Google : il manque le
  // nom d'organisation (obligatoire dans ce système) avant de pouvoir créer
  // le compte — voir useAuthStore.completeGoogleSignup et GoogleOrgSetupModal.
  onNeedsOrgInfo?: (suggestion: GoogleSignupSuggestion) => void
}

interface UseGoogleLoginResult {
  signInWithGoogle: () => void
  isGoogleLoading: boolean
  googleError: string
}

export function useGoogleLogin(options?: UseGoogleLoginOptions): UseGoogleLoginResult {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState("")
  const [isReady, setIsReady] = useState(false)
  const googleLogin = useAuthStore((s) => s.googleLogin)

  // Réf pour ne jamais fermer sur une version périmée des callbacks fournis
  // par le composant (le callback Google, lui, n'est initialisé qu'une fois).
  const onRequires2FARef = useRef(options?.onRequires2FA)
  const onNeedsOrgInfoRef = useRef(options?.onNeedsOrgInfo)
  useEffect(() => {
    onRequires2FARef.current = options?.onRequires2FA
    onNeedsOrgInfoRef.current = options?.onNeedsOrgInfo
  })

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError("Connexion Google non configurée (VITE_GOOGLE_CLIENT_ID manquant)")
      return
    }

    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled) return

        window.google!.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: GoogleCredentialResponse) => {
            setGoogleError("")
            setIsGoogleLoading(true)
            try {
              const result = await googleLogin(response.credential)
              if (result.needsOrgInfo) {
                onNeedsOrgInfoRef.current?.({
                  firstName: result.data?.suggested_first_name || "",
                  lastName: result.data?.suggested_last_name || "",
                  email: result.data?.email || "",
                })
              } else if (result.requires2FA) {
                const methods: string[] = result.data?.methods || []
                onRequires2FARef.current?.(methods)
              }
            } catch (err: any) {
              setGoogleError(err?.message || "Connexion Google impossible")
            } finally {
              setIsGoogleLoading(false)
            }
          },
          // Désactive le One Tap automatique au chargement de la page : on ne
          // veut afficher la fenêtre Google qu'au clic explicite sur le
          // bouton (voir signInWithGoogle), pas à l'ouverture de /login.
          auto_select: false,
          cancel_on_tap_outside: true,
          // Opt-in FedCM (Federated Credential Management) : Google migre le
          // prompt One Tap vers l'API navigateur FedCM et déprécie les
          // anciennes méthodes de "moment notification" (isNotDisplayed(),
          // isSkippedMoment()...) utilisées par signInWithGoogle ci-dessous.
          // Sans cet opt-in, la console log un warning et le prompt finira
          // par ne plus fonctionner du tout à terme.
          use_fedcm_for_prompt: true,
        })
        setIsReady(true)
      })
      .catch((err: Error) => {
        if (!cancelled) setGoogleError(err.message)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLogin])

  const signInWithGoogle = useCallback(() => {
    setGoogleError("")

    if (!GOOGLE_CLIENT_ID) {
      setGoogleError("Connexion Google non configurée (VITE_GOOGLE_CLIENT_ID manquant)")
      return
    }
    if (!isReady || !window.google) {
      setGoogleError("Google n'est pas encore prêt, réessayez dans un instant.")
      return
    }

    window.google.accounts.id.prompt((notification: any) => {
      // Avec FedCM (use_fedcm_for_prompt ci-dessus), Google ne garantit plus
      // isNotDisplayed()/isSkippedMoment() (dépréciées, pour préserver la vie
      // privée : le site ne doit pas pouvoir déduire si l'utilisateur a un
      // compte Google ou a déjà refusé le prompt). On ne construit donc plus
      // de message d'erreur bloquant là-dessus — seul un log console pour le
      // debug ; le formulaire email/mot de passe reste de toute façon
      // disponible en repli sur le même écran si le prompt ne s'affiche pas.
      try {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          console.warn("[Google Sign-In] prompt non affiché", notification)
        }
      } catch {
        // Méthode indisponible sous FedCM — sans conséquence, voir commentaire ci-dessus.
      }
    })
  }, [isReady])

  return { signInWithGoogle, isGoogleLoading, googleError }
}
