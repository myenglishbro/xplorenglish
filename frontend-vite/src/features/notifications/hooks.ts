import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/auth/useAuth";

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  read: boolean;
}

/**
 * Últimas 30 notificaciones del usuario (RLS: solo las propias). Se actualiza en vivo por Realtime
 * (INSERT filtrado por user_id); el polling cada 60 s y el refetch al volver a la pestaña son la
 * red de seguridad si el canal se cae.
 */
export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  React.useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: queryKeys.notifications(userId),
    queryFn: async (): Promise<NotificationItem[]> => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error("No pudimos cargar tus notificaciones.");
      return data.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, createdAt: n.created_at, read: n.read_at !== null }));
    },
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
      if (error) throw new Error("No pudimos actualizar la notificación.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id) }),
  });
}

export function useMarkAllNotificationsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_all_notifications_read");
      if (error) throw new Error("No pudimos actualizar las notificaciones.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications(user?.id) }),
  });
}
