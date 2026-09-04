import type { TodoToolVisibility } from "./settings.js";
import { TODO_RESULTS, type TodoResult } from "./types.js";

/** Returns whether a successful canonical Todo result should be shown in tool output. */
export function shouldRenderTodoAction(action: unknown, visibility: TodoToolVisibility): boolean {
  if (typeof action !== "string" || !TODO_RESULTS.includes(action as TodoResult)) return false;

  switch (visibility) {
    case "all":
      return true;
    case "set-only":
      return action === "set";
    case "none":
      return false;
  }
}
