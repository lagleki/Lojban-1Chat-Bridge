import { test } from "node:test"
import assert from "node:assert/strict"
import { resetState } from "./harness"

test("every pier exposes sendTo, StartService and health hooks", () => {
  const { pierObj } = resetState()
  for (const id of [
    "discord",
    "irc",
    "mattermost",
    "max",
    "slack",
    "telegram",
    "vkboard",
    "vkchat",
    "vkwall",
    "webwidget",
  ]) {
    assert.equal(typeof pierObj[id].sendTo, "function", id)
    assert.equal(typeof pierObj[id].StartService, "function", id)
    assert.equal(typeof pierObj[id].health, "function", id)
    const h = pierObj[id].health(`${id}_1`)
    assert.equal(typeof h.isReady, "function", id)
  }
})
