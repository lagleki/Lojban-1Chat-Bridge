import { common } from "./state"

export function catchError(err: unknown) {
  const error = JSON.stringify(err)
  console.log(error)
  common.LogToAdmin(err)
}
