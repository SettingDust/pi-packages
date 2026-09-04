import type { Todo, TodoCreation, TodoStatus } from "../src/types.js";

export function describedTask(name: string, description = `Detailed description for ${name}.`): TodoCreation {
  return { name, description };
}

export function todo(
  name: string,
  status: TodoStatus = "pending",
  description = `Detailed description for ${name}.`,
): Todo {
  return { name, description, status };
}
