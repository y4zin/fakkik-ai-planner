import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

export function ChatSendButton({ disabled, isLoading = false, label, className = "", type = "submit" }: { disabled?: boolean; isLoading?: boolean; label: string; className?: string; type?: "button" | "submit" }) {
  return <Button type={type} size="icon" disabled={disabled} aria-label={label} title={label} className={`chat-send-button shrink-0 h-[42px] w-[42px] ${className}`}>
    {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
  </Button>;
}
