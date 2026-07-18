import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * À utiliser avec useActionState : affiche un toast de succès dès qu'une
 * action vient de terminer sans erreur (transition isPending true -> false).
 * Ne déclenche rien à l'affichage initial (wasPending commence à false).
 */
export function useToastOnSuccess(
  isPending: boolean,
  error: string | null,
  message: string
) {
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      toast.success(message);
    }
    wasPending.current = isPending;
    // `message` volontairement exclu des deps : un message qui change de
    // forme entre deux rendus ne doit pas redéclencher l'effet, seul le
    // vrai passage pending -> fini doit le faire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, error]);
}
