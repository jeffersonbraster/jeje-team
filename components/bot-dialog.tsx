"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon, Trash2Icon } from "lucide-react"
import { nanoid } from "nanoid"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

import { createBot, deleteBot, updateBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { type Bot, botInsertSchema } from "@/lib/db/schema"

type BotFormInput = z.input<typeof botInsertSchema>
type BotFormOutput = z.output<typeof botInsertSchema>

// The fields the form edits, so callers don't need the whole row.
type EditableBot = Pick<Bot, "id" | "name" | "avatar" | "job" | "instructions">

const PRESETS = [
  {
    job: "Research assistant",
    instructions:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    job: "Code reviewer",
    instructions:
      "Look for bugs first, then readability. Suggest concrete fixes and explain why.",
  },
  {
    job: "Writing editor",
    instructions:
      "Tighten the prose without changing the author's voice. Explain each larger edit.",
  },
  {
    job: "Tutor",
    instructions:
      "Teach step by step, check understanding with questions, and don't just hand over answers.",
  },
]

// Pass `bot` to edit it; leave it out to create a new one.
function BotDialog({
  bot,
  trigger,
  open: openProp,
  onOpenChange,
}: Readonly<{
  bot?: EditableBot
  // Optional: leave it out and control the dialog with open/onOpenChange,
  // e.g. when it is opened from a dropdown menu item.
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bot ? "Edit bot" : "New bot"}</DialogTitle>
          <DialogDescription>
            {bot
              ? "Change its face, name, or job."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        {/* Mounts with the dialog, so the form starts fresh every time. */}
        <BotForm bot={bot} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function BotForm({
  bot,
  onSaved,
}: Readonly<{
  bot?: EditableBot
  onSaved: () => void
}>) {
  // Generated once per mount, not on every render.
  const [newAvatar] = React.useState(() => nanoid())

  const form = useForm<BotFormInput, unknown, BotFormOutput>({
    resolver: zodResolver(botInsertSchema),
    defaultValues: {
      name: bot?.name ?? "",
      avatar: bot?.avatar ?? newAvatar,
      job: bot?.job ?? "",
      instructions: bot?.instructions ?? "",
    },
  })
  const avatar = useWatch({ control: form.control, name: "avatar" })
  const { isSubmitting } = form.formState

  function applyPreset(preset: (typeof PRESETS)[number]) {
    const options = {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    }
    form.setValue("job", preset.job, options)
    form.setValue("instructions", preset.instructions, options)
  }

  async function onSubmit(values: BotFormOutput) {
    try {
      const saved = bot
        ? await updateBot(bot.id, values)
        : await createBot(values)
      toast.add({
        title: bot ? `${saved.name} saved` : `${saved.name} is ready`,
      })
      onSaved()
    } catch (error) {
      toast.add({
        type: "error",
        title: bot ? "Couldn't save the bot" : "Couldn't create the bot",
        description: error instanceof Error ? error.message : undefined,
      })
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.job}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => applyPreset(preset)}
          >
            {preset.job}
          </Button>
        ))}
      </div>

      <Item className="px-0">
        <ItemMedia variant="image">
          <ChatAvatar seed={avatar} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Face</ItemTitle>
          <ItemDescription>
            Shuffle until you find one you like.
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              form.setValue("avatar", nanoid(), { shouldDirty: true })
            }
          >
            <ShuffleIcon data-icon="inline-start" />
            Shuffle
          </Button>
        </ItemActions>
      </Item>

      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-form-name">Name</FieldLabel>
              <Input
                {...field}
                id="bot-form-name"
                placeholder="Ada"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="job"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-form-job">Job</FieldLabel>
              <Input
                {...field}
                id="bot-form-job"
                placeholder="Research assistant"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="instructions"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="bot-form-instructions">
                How it should work
              </FieldLabel>
              <Textarea
                {...field}
                value={field.value ?? ""}
                id="bot-form-instructions"
                placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                className="min-h-24 resize-none"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        {bot && <DeleteBotButton bot={bot} onDeleted={onSaved} />}
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {bot ? "Save changes" : "Create bot"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Asks for confirmation, deletes the bot with its direct chat, and leaves the
// chat page, which no longer exists.
function DeleteBotButton({
  bot,
  onDeleted,
}: Readonly<{
  bot: EditableBot
  onDeleted: () => void
}>) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function onDelete() {
    setIsDeleting(true)
    try {
      const deleted = await deleteBot(bot.id)
      toast.add({ title: `${deleted.name} deleted` })
      setOpen(false)
      onDeleted()
      router.push("/")
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn't delete the bot",
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" className="sm:mr-auto" />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the bot and its chat. It can&apos;t be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting && <Spinner data-icon="inline-start" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { BotDialog }
