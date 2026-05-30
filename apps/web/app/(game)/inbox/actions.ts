"use server";
import { db } from "@hoopmanager/db";
import { requireSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(notificationId: string) {
  const session = await requireSession();
  await db.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath("/inbox");
}
