import type { StoredMessage } from "./plannerStore";

type ConversationForTurn = { id: string; title: string; messages: StoredMessage[]; plan: unknown };
type SaveConversation = (input: { workspaceId: string; id: string; title?: string; messages: StoredMessage[]; plan: unknown; status: "draft" }) => Promise<void>;

/** يحفظ رسالة المستخدم فورًا كي تبقى المحادثة قابلة للاستكمال حتى لو تأخر التخطيط أو أخفق. */
export async function persistUserTurnBeforePlanning(input: { workspaceId: string; message: string; conversation: ConversationForTurn; saveConversation: SaveConversation }) {
  const messages = [...input.conversation.messages, { role: "user" as const, content: input.message }];
  await input.saveConversation({ workspaceId: input.workspaceId, id: input.conversation.id, title: input.conversation.title === "محادثة تخطيط جديدة" ? input.message : undefined, messages, plan: input.conversation.plan, status: "draft" });
  return messages;
}
