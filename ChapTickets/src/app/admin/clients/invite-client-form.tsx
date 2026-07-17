"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClientAccount, type CreateClientState } from "./actions";

const initialState: CreateClientState = { error: null, success: false };

export function InviteClientForm() {
  const [state, formAction, isPending] = useActionState(
    createClientAccount,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email du client</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nom (optionnel)</Label>
        <Input id="full_name" name="full_name" type="text" />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-muted-foreground">
          Invitation envoyée.
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Envoi..." : "Inviter"}
      </Button>
    </form>
  );
}
