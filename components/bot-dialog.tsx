"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { z } from "zod"

import { createBot } from "@/actions/bot"
import { ChatAvatar } from "@/components/chat-avatar"
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
import { insertBotSchema } from "@/lib/db/schema"

type BotFormInput = z.input<typeof insertBotSchema>
type BotFormOutput = z.output<typeof insertBotSchema>

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

function emptyBot(): BotFormInput {
  return { name: "", avatar: nanoid(), job: "", instructions: "" }
}

function BotDialog({
  trigger,
  open: openProp,
  onOpenChange,
}: Readonly<{
  // Optional: leave it out and control the dialog with open/onOpenChange,
  // e.g. when it is opened from a dropdown menu item.
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen

  const form = useForm<BotFormInput, unknown, BotFormOutput>({
    resolver: zodResolver(insertBotSchema),
    defaultValues: emptyBot(),
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
    const result = await createBot(values)

    if (!result.success) {
      toast.add({
        type: "error",
        title: "Couldn't create the bot",
        description: result.error,
      })
      return
    }

    toast.add({ title: `${result.bot.name} is ready` })
    setOpen(false)
    form.reset(emptyBot())
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New bot</DialogTitle>
          <DialogDescription>
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>

        <form
          id="bot-form"
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="bot-form" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Create bot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
