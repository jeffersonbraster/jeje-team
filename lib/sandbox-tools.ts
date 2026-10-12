import { Daytona, type Sandbox } from "@daytona/sdk"
import type { InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai"
import { tool } from "ai"
import { z } from "zod"

// Tools that let a bot use its own Daytona sandbox: a shell, its files, and
// its desktop. Used by the Trigger.dev chat agent, so this module avoids the
// "server-only" guard that lib/daytona.ts has.

// Keep tool results small enough for the model's context.
const MAX_OUTPUT_CHARS = 20_000

let client: Daytona | undefined
function daytona() {
  client ??= new Daytona()
  return client
}

function truncate(text: string) {
  return text.length > MAX_OUTPUT_CHARS
    ? `${text.slice(0, MAX_OUTPUT_CHARS)}\n…[truncated ${text.length - MAX_OUTPUT_CHARS} characters]`
    : text
}

// Daytona auto-stops idle sandboxes, so wake it before each use.
async function getSandbox(sandboxId: string | null) {
  // Bots created before sandboxes existed don't have one.
  if (!sandboxId) throw new Error("You don't have a sandbox.")
  const sandbox = await daytona().get(sandboxId)
  if (sandbox.state !== "started") await sandbox.start()
  return sandbox
}

// The desktop (Xvfb, xfce4, VNC) only runs once started. Start it on the first
// computer-use call and give the display a moment to come up.
async function getDesktop(sandboxId: string | null) {
  const sandbox = await getSandbox(sandboxId)
  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "active") {
    await sandbox.computerUse.start()
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  return sandbox
}

// Full-resolution JPEG, so pixel coordinates in the image match the screen.
async function takeScreenshot(sandbox: Sandbox) {
  const [shot, display] = await Promise.all([
    sandbox.computerUse.screenshot.takeCompressed({
      format: "jpeg",
      quality: 70,
      showCursor: true,
    }),
    sandbox.computerUse.display.getInfo(),
  ])
  const screen = display.displays?.[0]
  return {
    mediaType: "image/jpeg" as const,
    base64: shot.screenshot ?? "",
    width: screen?.width,
    height: screen?.height,
  }
}

type Screenshot = Awaited<ReturnType<typeof takeScreenshot>>

// The model sees the screenshot as an image, not as base64 text.
function screenshotForModel({ output }: { output: Screenshot }) {
  return {
    type: "content" as const,
    value: [
      {
        type: "text" as const,
        text: `Screen is ${output.width}x${output.height} pixels. Coordinates for mouse tools use this size, with (0, 0) at the top left.`,
      },
      {
        type: "file" as const,
        mediaType: output.mediaType,
        data: { type: "data" as const, data: output.base64 },
      },
    ],
  }
}

const coordinates = {
  x: z.number().int().min(0).describe("Pixels from the left edge"),
  y: z.number().int().min(0).describe("Pixels from the top edge"),
}

export function createSandboxTools(sandboxId: string | null) {
  return {
    bash: tool({
      description:
        "Run a shell command in your sandbox (Linux, user `daytona`, home /home/daytona) and return its exit code and output.",
      inputSchema: z.object({
        command: z.string().describe("The command to run with sh"),
        cwd: z
          .string()
          .optional()
          .describe("Working directory. Defaults to /home/daytona"),
      }),
      execute: async ({ command, cwd }) => {
        const sandbox = await getSandbox(sandboxId)
        const response = await sandbox.process.executeCommand(
          command,
          cwd,
          undefined,
          120
        )
        return {
          exitCode: response.exitCode,
          output: truncate(response.result),
        }
      },
    }),

    read_file: tool({
      description: "Read a text file from your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Absolute path, or relative to /home/daytona"),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox(sandboxId)
        const content = await sandbox.fs.downloadFile(path)
        return { path, content: truncate(content.toString("utf8")) }
      },
    }),

    write_file: tool({
      description:
        "Write a text file in your sandbox, creating or replacing it.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Absolute path, or relative to /home/daytona"),
        content: z.string().describe("The full file contents"),
      }),
      execute: async ({ path, content }) => {
        const sandbox = await getSandbox(sandboxId)
        const data = Buffer.from(content, "utf8")
        await sandbox.fs.uploadFile(data, path)
        return { path, bytes: data.byteLength }
      },
    }),

    list_files: tool({
      description: "List the files and folders in a directory of your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Absolute path, or relative to /home/daytona"),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox(sandboxId)
        const files = await sandbox.fs.listFiles(path)
        return files.map((file) => ({
          name: file.name,
          isDir: file.isDir,
          size: file.size,
        }))
      },
    }),

    mouse_click: tool({
      description:
        "Click the mouse on your sandbox's desktop. Look at the screen with view_screen first to find where to click.",
      inputSchema: z.object({
        ...coordinates,
        button: z.enum(["left", "right", "middle"]).default("left"),
        double: z.boolean().default(false).describe("Double-click"),
      }),
      execute: async ({ x, y, button, double }) => {
        const sandbox = await getDesktop(sandboxId)
        return sandbox.computerUse.mouse.click(x, y, button, double)
      },
    }),

    mouse_move: tool({
      description: "Move the mouse pointer on your sandbox's desktop.",
      inputSchema: z.object(coordinates),
      execute: async ({ x, y }) => {
        const sandbox = await getDesktop(sandboxId)
        return sandbox.computerUse.mouse.move(x, y)
      },
    }),

    mouse_scroll: tool({
      description:
        "Scroll the mouse wheel at a point on your sandbox's desktop.",
      inputSchema: z.object({
        ...coordinates,
        direction: z.enum(["up", "down"]),
        amount: z
          .number()
          .int()
          .min(1)
          .max(20)
          .default(3)
          .describe("Wheel ticks; one tick moves a few lines"),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const sandbox = await getDesktop(sandboxId)
        await sandbox.computerUse.mouse.scroll(x, y, direction, amount)
        return { x, y, direction, amount }
      },
    }),

    keyboard_type: tool({
      description:
        "Type text on your sandbox's desktop, into whatever has focus. Newlines press Enter.",
      inputSchema: z.object({ text: z.string() }),
      execute: async ({ text }) => {
        const sandbox = await getDesktop(sandboxId)
        await sandbox.computerUse.keyboard.type(text)
        return { typed: text.length }
      },
    }),

    keyboard_press: tool({
      description:
        "Press a key on your sandbox's desktop, optionally with modifiers, e.g. key 'enter', or key 'c' with modifiers ['ctrl'].",
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "A key such as enter, escape, tab, backspace, up, f5, a or 1"
          ),
        modifiers: z.array(z.enum(["ctrl", "alt", "shift", "cmd"])).default([]),
      }),
      execute: async ({ key, modifiers }) => {
        const sandbox = await getDesktop(sandboxId)
        await sandbox.computerUse.keyboard.press(key, modifiers)
        return { key, modifiers }
      },
    }),

    view_screen: tool({
      description:
        "Take a screenshot of your sandbox's desktop for yourself, to see what's on screen before or after acting. The user doesn't see it; use show_screen when they ask to see the screen.",
      inputSchema: z.object({}),
      execute: async () => takeScreenshot(await getDesktop(sandboxId)),
      toModelOutput: screenshotForModel,
    }),

    show_screen: tool({
      description:
        "Take a screenshot of your sandbox's desktop and show it to the user in the chat. Use it when the user asks what's on your screen or wants to see it.",
      inputSchema: z.object({}),
      execute: async () => takeScreenshot(await getDesktop(sandboxId)),
      toModelOutput: screenshotForModel,
    }),
  }
}

export type SandboxTools = ReturnType<typeof createSandboxTools>

// A chat message with typed tool parts, for rendering.
export type ChatUIMessage = InferChatUIMessageFromTools<SandboxTools>
