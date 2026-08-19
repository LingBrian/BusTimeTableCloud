import { define } from "../../../../../utils.ts";
import { errorResponse } from "../../../../../lib/auth.ts";

export const handler = define.handlers({
  PUT: (_ctx) => errorResponse(501, "NOT_IMPLEMENTED", "该接口尚未实现"),
  DELETE: (_ctx) => errorResponse(501, "NOT_IMPLEMENTED", "该接口尚未实现"),
});
