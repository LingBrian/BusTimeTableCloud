import { define } from "../../../utils.ts";
import { errorResponse } from "../../../lib/auth.ts";

export const handler = define.handlers({
  GET: () => errorResponse(501, "NOT_IMPLEMENTED", "该接口尚未实现"),
  POST: () => errorResponse(501, "NOT_IMPLEMENTED", "该接口尚未实现"),
});
