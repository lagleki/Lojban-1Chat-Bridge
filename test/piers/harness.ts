/**
 * Shared harness for per-network tests: registers the real piers, gives
 * each test a clean `state.config`, and runs a reliability manager whose
 * adapters use the pier's real `sendTo` and health hooks against a fake
 * library client.
 */
import { buildAdapter } from "../../src/reliability/integration"
import { ReliabilityManager } from "../../src/reliability/manager"
import { setCursorStore } from "../../src/reliability/runtime"
import { hooks } from "../../src/piers/hooks"
import { registerAllPiers } from "../../src/piers/register-all"
import { common, generic, pierObj, state } from "../../src/piers/state"
import { FAST, netError } from "../helpers"

let registered = false

export function resetState(piers: Record<string, any> = {}) {
  state.config = {
    piers,
    MessengersAvailable: Object.fromEntries(
      Object.keys(piers).map((k) => [k, true]),
    ),
    channelMapping: {},
    cache: {},
    generic: {},
  }
  for (const k of Object.keys(generic)) delete generic[k]
  for (const k of Object.keys(piers)) generic[k] = {}
  if (!registered) {
    registerAllPiers(() => ({}) as any)
    registered = true
  }
  common.LogToAdmin = () => {}
  const inbound: any[] = []
  hooks.sendFrom = async (args: any) => {
    inbound.push(args)
  }
  return { state, generic, pierObj, common, inbound }
}

/** Simulated network for a fake client. */
export class Net {
  online = true
  check(code = "ECONNRESET") {
    if (!this.online) throw netError(code)
  }
}

export interface Harness {
  manager: ReliabilityManager
  enqueue: (payload: Record<string, unknown>) => void
  stop: () => Promise<void>
}

/**
 * Supervise `messenger` with the pier's real hooks; `start` stands in for
 * the library connecting (it installs the fake client when the net is up).
 */
export function supervise(
  messenger: string,
  pier: string,
  start: () => Promise<void>,
  overrides: Record<string, unknown> = {},
  supervisor: Record<string, unknown> = {},
  managerOptions: Record<string, unknown> = {},
): Harness {
  const manager = new ReliabilityManager({
    outbox: { path: ":memory:" },
    ...managerOptions,
    connectivity: false,
    supervisor: { ...FAST, ...supervisor } as any,
  })
  const adapter = {
    ...buildAdapter(messenger, pierObj[pier]),
    start,
    ...overrides,
  }
  manager.register(adapter as any)
  manager.start()
  return {
    manager,
    enqueue: (payload) => void manager.enqueue(messenger, payload),
    stop: async () => {
      await manager.stop()
      manager.close()
      setCursorStore(null)
    },
  }
}
