import Timeout from "await-timeout"
import to from "await-to-js"

export async function tot(
  arg: Promise<any>,
  timeout = 5000,
  rejectResponse = true,
) {
  return to(Timeout.wrap(arg, timeout, rejectResponse))
}
