import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerTodoTools } from "./tool.js";

export default function todoExtension(pi: ExtensionAPI): void {
  registerTodoTools(pi);
}
