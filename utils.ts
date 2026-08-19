import { createDefine } from "fresh";
import type { JwtPayload } from "./lib/auth.ts";

export interface State {
  user: JwtPayload | null;
}

export const define = createDefine<State>();
