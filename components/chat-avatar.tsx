import { Avatar, Style } from "@dicebear/core"
import gaze from "@dicebear/styles/gaze.json"
import Image from "next/image"

import { cn } from "@/lib/utils"

const style = new Style(gaze)

// Every speed except "none"; the seed picks which one a bot gets.
const ANIMATION_SPEEDS = [
  "fastest",
  "fast",
  "medium",
  "slow",
  "slowest",
] as const

// A bot's face as an SVG data URI, for places that need a plain image URL.
function chatAvatarUri(seed: string, animated = false) {
  // The animation only adds CSS, so a seed keeps the same face either way.
  return new Avatar(style, {
    seed,
    animationVariant: animated ? ANIMATION_SPEEDS : "none",
  }).toDataUri()
}

function ChatAvatar({
  seed,
  animated = false,
  className,
}: Readonly<{
  seed: string
  animated?: boolean
  className?: string
}>) {
  const src = chatAvatarUri(seed, animated)

  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      unoptimized
      className={cn("size-8 shrink-0", className)}
    />
  )
}

export { ChatAvatar, chatAvatarUri }
