"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Les deux vues sont déjà rendues côté serveur (JSX passé en props, pas des
 * fonctions) — ce composant ne fait que basculer laquelle est affichée,
 * il ne recharge rien. Simple useState, pas de persistance de l'onglet
 * choisi : ce n'est qu'une préférence d'affichage ponctuelle, contrairement
 * au repli/dépli de la sidebar qui, lui, mérite un cookie.
 */
export function ProjetsViewTabs({
  listView,
  kanbanView,
}: {
  listView: ReactNode;
  kanbanView: ReactNode;
}) {
  return (
    <Tabs defaultValue="liste">
      <TabsList>
        <TabsTrigger value="liste">Liste</TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
      </TabsList>
      <TabsContent value="liste" className="flex flex-col gap-4 mt-4">
        {listView}
      </TabsContent>
      <TabsContent value="kanban" className="mt-4">
        {kanbanView}
      </TabsContent>
    </Tabs>
  );
}
