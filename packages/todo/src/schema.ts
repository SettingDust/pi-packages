import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { TODO_STATUSES, type TodoRemoval } from "./types.js";

export const TodoCreationSchema = Type.Object({
  name: Type.String(),
  description: Type.String(),
}, { additionalProperties: false });

export const TodoTaskCreationSchema = Type.Object({
  name: Type.String(),
  todos: Type.Array(TodoCreationSchema, { minItems: 0 }),
}, { additionalProperties: false });

export const TodoSetParamsSchema = Type.Object({
  tasks: Type.Array(TodoTaskCreationSchema, { minItems: 0 }),
}, { additionalProperties: false });

export const TodoAddParamsSchema = Type.Object({
  task: Type.String(),
  todos: Type.Array(TodoCreationSchema, { minItems: 1 }),
}, { additionalProperties: false });

export const TodoTransitionSchema = Type.Object({
  task: Type.String(),
  todo: Type.String(),
  status: StringEnum(TODO_STATUSES),
}, { additionalProperties: false });

export const TodoTransitionParamsSchema = Type.Object({
  transitions: Type.Array(TodoTransitionSchema, { minItems: 1 }),
}, { additionalProperties: false });

export const TodoRemovalSchema = Type.Unsafe<TodoRemoval>({
  oneOf: [
    Type.Object({ task: Type.String(), todo: Type.String() }, { additionalProperties: false }),
    Type.Object({ task: Type.String() }, { additionalProperties: false }),
  ],
});

export const TodoRemoveParamsSchema = Type.Object({
  removals: Type.Array(TodoRemovalSchema, { minItems: 1 }),
}, { additionalProperties: false });

export const TodoViewParamsSchema = Type.Object({}, { additionalProperties: false });
