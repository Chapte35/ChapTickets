"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cloturerSprint, type SprintFormState } from "@/lib/actions/sprints";

const initialState: SprintFormState = { error: null };

export function CloturerSprintDialog({
  sprintId,
  sprintNom,
}: {
  sprintId: string;
  sprintNom: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(cloturerSprint, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!isPending && state.error === null && state !== initialState) {
      setOpen(false);
      router.refresh();
    }
  }, [isPending, state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Clôturer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clôturer « {sprintNom} »</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          La clôture crée une release regroupant tous les tickets du sprint.
          Les tickets sans release existante seront automatiquement assignés.
        </p>

        <form action={formAction} className="flex flex-col gap-4 pt-2">
          <input type="hidden" name="sprint_id" value={sprintId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="version_release">
              Numéro de version <span className="text-destructive">*</span>
            </Label>
            <Input
              id="version_release"
              name="version_release"
              placeholder="v1.2.0"
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description_release">Description (optionnel)</Label>
            <Textarea
              id="description_release"
              name="description_release"
              placeholder="Notes de version…"
              rows={3}
            />
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Clôture en cours…" : "Clôturer et créer la release"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
