import { Bot, User } from "lucide-react";
import { cn } from "@cortexgrid/ui";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary-600 text-white"
            : "bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "max-w-[75%] rounded-xl px-4 py-3",
          isUser
            ? "bg-primary-600 text-white"
            : "bg-dark-100 text-dark-900 dark:bg-dark-800 dark:text-dark-100"
        )}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </p>
        <p
          className={cn(
            "mt-1.5 text-xs",
            isUser
              ? "text-primary-200"
              : "text-dark-400 dark:text-dark-500"
          )}
        >
          {new Date(timestamp).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
