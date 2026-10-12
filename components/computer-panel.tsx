"use client"

import * as React from "react"
import { MonitorIcon, RotateCwIcon } from "lucide-react"
import { usePanelRef } from "react-resizable-panels"

import { getComputerScreenUrl } from "@/actions/computer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ResizablePanel } from "@/components/ui/resizable"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// The bot's computer: a panel on the right of a chat with a live view of the
// bot's sandbox desktop, which opens full screen in a dialog. The page lays
// out the resizable group; these pieces share the panel's state.
//
// The desktop is one noVNC iframe that never moves in the DOM, because moving
// an iframe reloads it. Instead it's positioned over whichever slot is active:
// the preview in the panel, or the dialog's body.

type ScreenLinks = Awaited<ReturnType<typeof getComputerScreenUrl>>

const PANEL_ID = "computer-panel"

type ComputerPanelContextValue = {
  botName: string
  panelRef: ReturnType<typeof usePanelRef>
  open: boolean
  setOpen: (open: boolean) => void
  fullscreen: boolean
  setFullscreen: (fullscreen: boolean) => void
  screen: ScreenLinks | null
  screenError: string | null
  screenLoaded: boolean
  setScreenLoaded: (loaded: boolean) => void
  reloadScreen: () => void
  panelSlotRef: React.RefObject<HTMLButtonElement | null>
  dialogSlotRef: React.RefObject<HTMLDivElement | null>
}

const ComputerPanelContext =
  React.createContext<ComputerPanelContextValue | null>(null)

function useComputerPanel() {
  const context = React.useContext(ComputerPanelContext)
  if (!context) {
    throw new Error(
      "useComputerPanel must be used within ComputerPanelProvider"
    )
  }
  return context
}

function ComputerPanelProvider({
  chatId,
  botName,
  children,
}: Readonly<{
  chatId: string
  botName: string
  children: React.ReactNode
}>) {
  const panelRef = usePanelRef()
  const panelSlotRef = React.useRef<HTMLButtonElement | null>(null)
  const dialogSlotRef = React.useRef<HTMLDivElement | null>(null)
  const [open, setOpenState] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [screen, setScreen] = React.useState<ScreenLinks | null>(null)
  const [screenError, setScreenError] = React.useState<string | null>(null)
  const [screenLoaded, setScreenLoaded] = React.useState(false)
  // True once a link is loaded or loading, so it's only fetched once.
  const requestedRef = React.useRef(false)

  // Fetches a fresh link; a new link reloads the iframe.
  const loadScreen = React.useCallback(async () => {
    requestedRef.current = true
    setScreenError(null)
    setScreenLoaded(false)
    try {
      setScreen(await getComputerScreenUrl(chatId))
    } catch (error) {
      requestedRef.current = false
      setScreen(null)
      setScreenError(
        error instanceof Error ? error.message : "Couldn't load the screen"
      )
    }
  }, [chatId])

  // Loaded once, the first time the panel opens, then reused.
  const setOpen = React.useCallback(
    (next: boolean) => {
      setOpenState(next)
      if (next && !requestedRef.current) void loadScreen()
    },
    [loadScreen]
  )

  const value = React.useMemo(
    () => ({
      botName,
      panelRef,
      open,
      setOpen,
      fullscreen,
      setFullscreen,
      screen,
      screenError,
      screenLoaded,
      setScreenLoaded,
      reloadScreen: () => void loadScreen(),
      panelSlotRef,
      dialogSlotRef,
    }),
    [
      botName,
      panelRef,
      open,
      setOpen,
      fullscreen,
      screen,
      screenError,
      screenLoaded,
      loadScreen,
    ]
  )

  return (
    <ComputerPanelContext.Provider value={value}>
      {children}
      <ComputerScreen />
      <ComputerDialog />
    </ComputerPanelContext.Provider>
  )
}

// The single noVNC iframe, kept over the active slot every frame so it
// follows panel resizes and the dialog's open animation.
function ComputerScreen() {
  const {
    botName,
    fullscreen,
    screen,
    screenLoaded,
    setScreenLoaded,
    panelSlotRef,
    dialogSlotRef,
  } = useComputerPanel()
  const layerRef = React.useRef<HTMLDivElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const frameName = `computer-screen-${React.useId()}`
  // Loads since the form was submitted: Daytona's redirect page, then noVNC.
  const loadsRef = React.useRef(0)

  // Each new link opens by accepting Daytona's preview warning in the iframe
  // itself, which sets its cookie and forwards to the desktop. Without this the
  // warning page shows before every new link.
  React.useEffect(() => {
    if (!screen) return
    loadsRef.current = 0
    formRef.current?.submit()
  }, [screen])

  React.useEffect(() => {
    let frame = 0
    const follow = () => {
      const layer = layerRef.current
      const slot = fullscreen ? dialogSlotRef.current : panelSlotRef.current
      if (layer) {
        const rect = slot?.getBoundingClientRect()
        // Hidden, not removed, while there is nowhere to show it (panel
        // closed), so the connection stays open.
        const visible = !!rect && rect.width > 1 && rect.height > 1
        layer.style.visibility = visible ? "visible" : "hidden"
        if (rect) {
          layer.style.left = `${rect.left}px`
          layer.style.top = `${rect.top}px`
          layer.style.width = `${rect.width}px`
          layer.style.height = `${rect.height}px`
        }
      }
      frame = requestAnimationFrame(follow)
    }
    frame = requestAnimationFrame(follow)
    return () => cancelAnimationFrame(frame)
  }, [fullscreen, panelSlotRef, dialogSlotRef])

  if (!screen) return null

  return (
    <div
      ref={layerRef}
      className={cn(
        "invisible fixed overflow-hidden rounded-lg",
        // Above the dialog's popup when full screen; in the panel it stays
        // below other dialogs. Clicks in the panel fall through to the
        // preview button underneath, which opens the dialog.
        fullscreen ? "z-60" : "pointer-events-none",
        !screenLoaded && "opacity-0"
      )}
    >
      <form
        ref={formRef}
        method="post"
        action={screen.acceptUrl}
        target={frameName}
        hidden
      />
      <iframe
        name={frameName}
        title={`${botName}'s screen`}
        // Not focusable from the panel, where it's only a preview.
        tabIndex={fullscreen ? undefined : -1}
        onLoad={() => {
          loadsRef.current += 1
          if (loadsRef.current >= 2) setScreenLoaded(true)
        }}
        className="size-full border-0"
      />
    </div>
  )
}

function ComputerPanelToggle() {
  const { panelRef, open, setOpen } = useComputerPanel()

  function toggle() {
    if (open) panelRef.current?.collapse()
    else panelRef.current?.expand()
    setOpen(!open)
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={open ? "Hide computer" : "Show computer"}
      aria-expanded={open}
      aria-controls={PANEL_ID}
      onClick={toggle}
    >
      <MonitorIcon />
    </Button>
  )
}

// Starts closed. Dragging the handle opens and closes it too, so the open
// state follows the panel's size rather than only the button.
function ComputerPanel() {
  const {
    botName,
    panelRef,
    setOpen,
    setFullscreen,
    screen,
    screenError,
    screenLoaded,
    reloadScreen,
    panelSlotRef,
  } = useComputerPanel()

  return (
    <ResizablePanel
      id={PANEL_ID}
      panelRef={panelRef}
      collapsible
      collapsedSize="0"
      defaultSize="0"
      minSize="30"
      style={{ overflow: "hidden" }}
      onResize={(size) => setOpen(size.asPercentage > 0)}
    >
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reload screen"
            onClick={reloadScreen}
          >
            <RotateCwIcon />
          </Button>
        </div>
        <button
          ref={panelSlotRef}
          type="button"
          aria-label={`Open ${botName}'s screen full screen`}
          disabled={!screen}
          onClick={() => setFullscreen(true)}
          className="relative aspect-4/3 w-full overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {screenError ? (
            <span className="absolute inset-0 flex items-center justify-center p-4 text-sm text-muted-foreground">
              {screenError}
            </span>
          ) : (
            !screenLoaded && <Skeleton className="absolute inset-0" />
          )}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          {botName}&apos;s screen
        </p>
      </div>
    </ResizablePanel>
  )
}

// Full screen view that accepts input. It only closes through its close
// button: Escape, clicks and focus moving into the iframe are all ignored, so
// working on the desktop never closes it by accident. Non-modal, because a
// modal dialog traps focus and pointer input inside its popup, and the iframe
// sits outside it.
function ComputerDialog() {
  const { botName, fullscreen, setFullscreen, dialogSlotRef } =
    useComputerPanel()

  return (
    <Dialog
      open={fullscreen}
      modal={false}
      disablePointerDismissal
      onOpenChange={(open, details) => {
        if (!open && details.reason !== "close-press") return
        setFullscreen(open)
      }}
    >
      <DialogContent className="flex h-[calc(100svh-2rem)] flex-col sm:max-w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{botName}&apos;s screen</DialogTitle>
          <DialogDescription className="sr-only">
            A live view of {botName}&apos;s desktop. You can use it directly.
          </DialogDescription>
        </DialogHeader>
        <div
          ref={dialogSlotRef}
          className="min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted"
        />
      </DialogContent>
    </Dialog>
  )
}

export { ComputerPanel, ComputerPanelProvider, ComputerPanelToggle }
