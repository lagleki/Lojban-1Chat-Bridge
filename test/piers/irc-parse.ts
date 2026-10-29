// irc-upd's own line parser (what its "raw" event carries)
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const parseMessage: (
  line: string,
  stripColors?: boolean,
) => any = require("irc-upd/lib/parse_message")
