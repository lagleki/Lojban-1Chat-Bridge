import { common } from "./state"

export function catchError(err: any) {
  const error = JSON.stringify(err)
  console.log(error)
  common.LogToAdmin(err)
}
