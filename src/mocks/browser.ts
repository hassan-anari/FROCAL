import { setupWorker } from "msw/browser";
import { bootstrapHandlers } from "./handlers/bootstrap.handlers";

export const worker = setupWorker(...bootstrapHandlers);
