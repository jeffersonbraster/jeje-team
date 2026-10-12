import "server-only"

import { Daytona, DaytonaNotFoundError } from "@daytona/sdk"

// Created on first use. The SDK reads DAYTONA_API_KEY and DAYTONA_API_URL from
// the environment.
let client: Daytona | undefined
function daytona() {
  client ??= new Daytona()
  return client
}

// A new sandbox with Daytona's defaults. Nothing runs in it yet.
export async function createSandbox() {
  const sandbox = await daytona().create()
  return sandbox.id
}

// Deleting a sandbox that is already gone counts as done.
export async function deleteSandbox(sandboxId: string) {
  try {
    const sandbox = await daytona().get(sandboxId)
    await daytona().delete(sandbox)
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return
    throw error
  }
}

// How long a screen link stays valid for new connections.
const SCREEN_URL_TTL_SECONDS = 60 * 60

// Browser-ready links to the sandbox's desktop (noVNC). Wakes the sandbox and
// starts the desktop if needed. The links are signed for the noVNC port only,
// so they grant no other access to the sandbox.
//
// Daytona shows a "Preview URL Warning" page the first time a browser opens a
// preview link, and an iframe can't send the header that skips it. Accepting
// it is a POST to `acceptUrl` that sets a cookie for this link's host and then
// forwards to `url`, so the browser submits that instead of opening `url`.
export async function getScreenUrl(sandboxId: string) {
  const sandbox = await daytona().get(sandboxId)
  if (sandbox.state !== "started") await sandbox.start()

  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "active") await sandbox.computerUse.start()

  const { url } = await sandbox.getSignedPreviewUrl(
    6080,
    SCREEN_URL_TTL_SECONDS
  )
  const screen = new URL("vnc.html", url.endsWith("/") ? url : `${url}/`)
  screen.searchParams.set("autoconnect", "true")
  screen.searchParams.set("reconnect", "true")
  screen.searchParams.set("resize", "scale")

  const accept = new URL("accept-daytona-preview-warning", screen)
  accept.searchParams.set("redirect", screen.toString())

  return { url: screen.toString(), acceptUrl: accept.toString() }
}
