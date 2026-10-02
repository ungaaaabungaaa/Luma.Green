import { authComponent } from "./auth";

/** Internal component callbacks; no user callable audit endpoint. */
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();
