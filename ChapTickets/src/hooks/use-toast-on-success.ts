import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * À utiliser avec useActionState : affiche un toast de succès dès qu'une
 * action vient de terminer sans erreur (transition isPending true -> false).
 * Appelle également onSuccess() si fourni — utile pour déclencher un
 * rechargement d'historique ou toute autre side-effect post-action.
 */
export function useToastOnSuccess(
  isPending: boolean,
  error: string | null,
  message: string,
  onSuccess?: () => void
) {
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      toast.success(message);
      onSuccess?.();
    }
    wasPending.current = isPending;
    // `message` et `onSuccess` volontairement exclus des deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, error]);
}
