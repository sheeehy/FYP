"use client"

// super messy multi step dialog
// good for ux, code isnt clean
// using react hook form + zod + shadcn

import type React from "react"
import { useState, useEffect, useRef, useMemo, forwardRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EntitySchema } from "@/lib/validation/entity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Plus, ArrowLeft, Upload } from "lucide-react"
import type { z } from "zod"

type EntityFormData = z.infer<typeof EntitySchema>

const archetypes = [
  { value: "person", label: "Person" },
  { value: "group", label: "Group" },
  { value: "venue", label: "Venue" }, 
  { value: "organization", label: "Organization" },
  { value: "media", label: "Media" },
  { value: "event", label: "Event" },
  { value: "artifact", label: "Artifact" },
] as const

interface EntityStepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// text area fix
type AutoGrowTextareaProps = Omit<React.ComponentProps<"textarea">, "rows"> & {
  onAutoGrow?: () => void
}
const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ onAutoGrow, className, style, onInput, ...rest }, forwardedRef) => {
    const localRef = useRef<HTMLTextAreaElement | null>(null)
    const setRefs = (node: HTMLTextAreaElement | null) => {
      localRef.current = node
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }
    const autoGrow = () => {
      const el = localRef.current
      if (!el) return
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
      onAutoGrow?.()
    }
    useEffect(() => {
      autoGrow()
   
    }, [])
    return (
      <textarea
        {...rest}
        ref={setRefs}
        rows={1}
        onInput={(e) => {
          autoGrow()
          onInput?.(e)
        }}
        className={`bg-gray-100 border border-gray-200 rounded-lg placeholder:text-gray-500 resize-none leading-6 w-full px-4 py-3 ${className ?? ""}`}
        style={{ overflow: "hidden", ...style }}
        autoComplete="off"
        data-lpignore="true"
      />
    )
  },
)
AutoGrowTextarea.displayName = "AutoGrowTextarea"

const steps = [
  { id: 1, title: "Archetype", field: "archetype", required: true },
  { id: 2, title: "Name", field: "name", required: true },
  { id: 3, title: "Role", field: "role", required: false },
  { id: 4, title: "Tags", field: "tags", required: false },
  { id: 5, title: "Description", field: "description", required: false },
  { id: 6, title: "Location", field: "location", required: false }, 
  { id: 7, title: "Image", field: "image_url", required: false },
  { id: 8, title: "Links", field: "links", required: false },
  { id: 9, title: "Profile", field: "profile", required: false }, 
] as const

export function EntityStepDialog({ open, onOpenChange, onSuccess }: EntityStepDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const [links, setLinks] = useState<Array<{ key: string; value: string }>>([])
  const [linkPlatformInput, setLinkPlatformInput] = useState("")
  const [linkUrlInput, setLinkUrlInput] = useState("")
  const [linkInlineError, setLinkInlineError] = useState<string | null>(null)

  const [profilePairs, setProfilePairs] = useState<Array<{ key: string; value: string }>>([])
  const [profileKeyInput, setProfileKeyInput] = useState("")
  const [profileValueInput, setProfileValueInput] = useState("")

  const defaultValues = useMemo(
    () => ({
      archetype: undefined as unknown as EntityFormData["archetype"],
      name: "",   // no slug in form i just always generated from name 
      role: "",
      tags: [] as string[],
      description: "",
      location: "",
      image_url: "",
      links: {} as Record<string, string> | undefined,
      profile: {} as Record<string, string> | undefined,
    
      
    }),
    [],
  )

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<EntityFormData>({
    resolver: zodResolver(EntitySchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  })

  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const initialTags = (getValues("tags") as string[] | undefined) ?? []
    if (initialTags.length) setTags(initialTags)
    const initialLinks = getValues("links") as Record<string, string> | undefined
    if (initialLinks) setLinks(Object.entries(initialLinks).map(([key, value]) => ({ key, value })))
    const initialProfile = getValues("profile") as Record<string, string> | undefined
    if (initialProfile) setProfilePairs(Object.entries(initialProfile).map(([key, value]) => ({ key, value })))
  }, [])

  const resetForm = () => {
    reset(defaultValues)
    setCurrentStep(1)
    setTags([])
    setTagInput("")
    setLinks([])
    setLinkPlatformInput("")
    setLinkUrlInput("")
    setLinkInlineError(null)
    setProfilePairs([])
    setProfileKeyInput("")
    setProfileValueInput("")
    setSubmitError(null)
  }

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const currentStepData = steps[currentStep - 1]

  const goNext = async () => {
    if (currentStep === steps.length) {
      await handleSubmit(onSubmit)()
      return
    }
    const field = currentStepData.field as keyof EntityFormData
    const valid = await trigger(field, { shouldFocus: true })
    if (currentStepData.required && !valid) return
    setCurrentStep((s) => s + 1)
  }

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

  const isValidUrl = (u: string) => {
    try {
      const url = new URL(u)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (!t) return
    const next = Array.from(new Set([...tags, t]))
    setTags(next)
    setTagInput("")
    setValue("tags", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const removeTag = (tagToRemove: string) => {
    const next = tags.filter((tag) => tag !== tagToRemove)
    setTags(next)
    setValue("tags", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const toObject = (arr: Array<{ key: string; value: string }>) => {
    const out: Record<string, string> = {}
    arr.forEach(({ key, value }) => {
      const k = key.trim()
      const v = value.trim()
      if (k && v) out[k] = v
    })
    return Object.keys(out).length ? out : undefined
  }

  const addLink = () => {
    setLinkInlineError(null)
    const platform = linkPlatformInput.trim()
    const url = linkUrlInput.trim()
    if (!platform || !url) return
    if (!isValidUrl(url)) {
      setLinkInlineError("Enter a valid URL (https://…)")
      return
    }
    const newLinks = [...links, { key: platform, value: url }]
    setLinks(newLinks)
    setValue("links", toObject(newLinks), { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setLinkPlatformInput("")
    setLinkUrlInput("")
  }

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index)
    setLinks(newLinks)
    setValue("links", toObject(newLinks), { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const addProfilePair = () => {
    const k = profileKeyInput.trim()
    const v = profileValueInput.trim()
    if (!k || !v) return
    const next = [...profilePairs.filter((p) => p.key !== k), { key: k, value: v }]
    setProfilePairs(next)
    setValue("profile", toObject(next), { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    setProfileKeyInput("")
    setProfileValueInput("")
  }

  const removeProfilePair = (index: number) => {
    const next = profilePairs.filter((_, i) => i !== index)
    setProfilePairs(next)
    setValue("profile", toObject(next), { shouldDirty: true, shouldTouch: true, shouldValidate: true })
  }

  const onSubmit = async (data: EntityFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      // apparantly lowercase is standard - dont know why
      const cleanedTags = Array.from(new Set((tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean)))
      data.tags = cleanedTags as any


      const linksObj = toObject(links)
      if (linksObj) {
        for (const [, v] of Object.entries(linksObj)) {
          if (!isValidUrl(v)) throw new Error("One or more links are not valid URLs")
        }
      }
      data.links = linksObj as any

   
      data.profile = toObject(profilePairs) as any    // profile JSON

    
      if (data.image_url && data.image_url.trim().length && !isValidUrl(data.image_url)) {
        throw new Error("Image URL must be a valid URL")
      }

    
      ;(data as any).slug = slugify(data.name || "")   // slug always comes from name (spaces -> "-", lowercase, punctuation removed too)

      const response = await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const raw = String(errorData?.error ?? "Failed to create entity")

    
        if (/P2002/.test(raw) || (/unique/i.test(raw) && /slug/i.test(raw))) {     // prisma unique constraint for slug
          throw new Error("Entity with this slug already exists") // displaying at wrong step
        }

        throw new Error(raw)
      }

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnterToContinue = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void goNext()
    }
  }

  const watched = watch()
  const fieldName = currentStepData.field as keyof EntityFormData
  const fieldVal = watched[fieldName]
  const isEmpty = fieldVal === undefined || fieldVal === "" || (Array.isArray(fieldVal) && fieldVal.length === 0)
  const stepHasError = Boolean(errors[fieldName])
  const disableContinue = currentStepData.required && (isEmpty || stepHasError)
  const stepKey = currentStepData.field

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4" key={stepKey}>
            <Controller
              name="archetype"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  {archetypes.map((archetype) => (
                    <Button
                      key={archetype.value}
                      type="button"
                      className={`w-full h-12 justify-start text-left font-medium rounded-lg ${
                        field.value === archetype.value ? "bg-black text-white" : "bg-zinc-100 text-gray-900"
                      }`}
                      onClick={() => field.onChange(archetype.value)}
                    >
                      {archetype.label}
                    </Button>
                  ))}
                </div>
              )}
            />
            {errors.archetype && <p className="text-sm text-red-500">{errors.archetype.message}</p>}
          </div>
        )
      case 2:
        return (
          <div className="space-y-4" key={stepKey}>
            <AutoGrowTextarea
              {...register("name")}
              placeholder="Add a name"
              onKeyDown={handleEnterToContinue}
              className="min-h-[48px]"
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
        )
      case 3:
        return (
          <div className="space-y-4" key={stepKey}>
            <AutoGrowTextarea
              {...register("role")}
              placeholder="Add a role"
              onKeyDown={handleEnterToContinue}
              className="min-h-[48px]"
            />
            {errors.role && <p className="text-sm text-red-500">{errors.role.message}</p>}
          </div>
        )
      case 4:
        return (
          <div className="space-y-4" key={stepKey}>
            <div className="flex gap-2 min-w-0">
              <AutoGrowTextarea
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  } else {
                    handleEnterToContinue(e)
                  }
                }}
                placeholder="Add a tag"
                className="min-h-[48px] flex-1"
              />
              <Button
                type="button"
                onClick={addTag}
                className="h-12 w-12 bg-gray-100 border border-gray-200 rounded-lg"
                aria-label="Add tag"
              >
                <Plus className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <div
                    key={`${tag}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-500 text-white px-3 py-1 text-sm"
                    data-tag
                  >
                    <span className="break-words">{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 inline-flex rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 5:
        return (
          <div className="space-y-4" key={stepKey}>
            <AutoGrowTextarea
              {...register("description")}
              placeholder="Add a description"
              onKeyDown={handleEnterToContinue}
              className="min-h-[96px]"
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>
        )
      case 6:
        return (
          <div className="space-y-4" key={stepKey}>
            <AutoGrowTextarea
              {...register("location")}
              placeholder="Add a venue"
              onKeyDown={handleEnterToContinue}
              className="min-h-[48px]"
            />
            {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
          </div>
        )
      case 7: {
        const imageUrl = watch("image_url")
        return (
          <div className="space-y-4" key={stepKey}>
            {!imageUrl ? (
              <div className="flex flex-col items-center justify-center h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Drag and drop</p>
                <p className="text-xs text-gray-400">or paste a URL below</p>
              </div>
            ) : (
              <div className="relative">
      
                <img src={imageUrl || "/something.png"} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              </div>
            )}
            <Input
              {...register("image_url")}
              placeholder="Paste image URL"
              type="url"
              className="h-12 px-4 bg-gray-100 border-gray-200 rounded-lg placeholder:text-gray-500 w-full"
            />
            {errors.image_url && <p className="text-sm text-red-500">{errors.image_url.message}</p>}
          </div>
        )
      }
      case 8:
        return (
          <div className="space-y-4" key={stepKey}>
            <div className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 min-w-0">
              <Input
                value={linkPlatformInput}
                onChange={(e) => setLinkPlatformInput(e.target.value)}
                placeholder="Platform"
                className="h-12 px-4 bg-gray-100 border-gray-200 rounded-lg placeholder:text-gray-500 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLink()
                  }
                }}
              />
              <Input
                value={linkUrlInput}
                onChange={(e) => setLinkUrlInput(e.target.value)}
                placeholder="URL"
                type="url"
                className="h-12 px-4 bg-gray-100 border-gray-200 rounded-lg placeholder:text-gray-500 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLink()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addLink}
                className="h-12 w-12 bg-gray-100 border border-gray-200 rounded-lg"
                aria-label="Add link"
              >
                <Plus className="h-5 w-5 text-gray-600" />
              </Button>
            </div>

            {linkInlineError && <p className="text-sm text-red-500">{linkInlineError}</p>}

            {links.length > 0 && (
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div
                    key={`${link.key}-${index}`}
                    className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 p-3 bg-gray-100 rounded-lg w-full min-w-0"
                    data-link
                  >
                    <span className="text-sm font-medium min-w-0 truncate" title={link.key || "Platform"}>
                      {link.key || "Platform"}
                    </span>
                    <span className="text-sm text-gray-600 min-w-0 truncate" title={link.value || "URL"}>
                      {link.value || "URL"}
                    </span>
                    <Button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="h-6 w-6 p-0 shrink-0"
                      aria-label="Remove link"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 9:
        return (
          <div className="space-y-4" key={stepKey}>
            <div className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 min-w-0">
              <Input
                value={profileKeyInput}
                onChange={(e) => setProfileKeyInput(e.target.value)}
                placeholder='Key (e.g. "capacity")'
                className="h-12 px-4 bg-gray-100 border-gray-200 rounded-lg placeholder:text-gray-500 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addProfilePair()
                  }
                }}
              />
              <Input
                value={profileValueInput}
                onChange={(e) => setProfileValueInput(e.target.value)}
                placeholder='Value (e.g. "2000")'
                className="h-12 px-4 bg-gray-100 border-gray-200 rounded-lg placeholder:text-gray-500 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addProfilePair()
                  }
                }}
              />
              <Button
                type="button"
                onClick={addProfilePair}
                className="h-12 w-12 bg-gray-100 border border-gray-200 rounded-lg"
                aria-label="Add profile attribute"
              >
                <Plus className="h-5 w-5 text-gray-600" />
              </Button>
            </div>

            {profilePairs.length > 0 && (
              <div className="space-y-2">
                {profilePairs.map((pair, index) => (
                  <div
                    key={`${pair.key}-${index}`}
                    className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 p-3 bg-gray-100 rounded-lg w-full min-w-0"
                    data-profile
                  >
                    <span className="text-sm font-medium min-w-0 truncate" title={pair.key || "Key"}>
                      {pair.key || "Key"}
                    </span>
                    <span className="text-sm text-gray-600 min-w-0 truncate" title={pair.value || "Value"}>
                      {pair.value || "Value"}
                    </span>
                    <Button
                      type="button"
                      onClick={() => removeProfilePair(index)}
                      className="h-6 w-6 p-0 shrink-0"
                      aria-label="Remove profile attribute"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-4xl border-0">
        <div className="w-full">
          <DialogHeader className="px-6 py-6">
            <div className="grid grid-cols-3 items-center">
              <div className="justify-self-start">
                {currentStep > 1 ? (
                  <Button size="icon" onClick={goBack} className="h-8 w-8 rounded-full" variant={"secondary"}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <span className="h-8 w-8 inline-block" />
                )}
              </div>

              <DialogTitle className="justify-self-center text-lg font-semibold text-black text-center">
                {currentStepData.title}
              </DialogTitle>

              <div className="justify-self-end">
                <Button
                  size="icon"
                  onClick={() => handleClose(false)}
                  className="h-8 w-8 rounded-full"
                  variant={"secondary"}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pb-6" key={stepKey}>
            {renderStepContent()}
          </div>

          {submitError && (
            <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          <div className="px-6 pb-6">
            <Button
              onClick={goNext}
              disabled={disableContinue || isSubmitting}
              className={`w-full h-12 rounded-lg font-medium ${
                disableContinue ? "bg-gray-400 text-white" : "bg-black text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Creating...
                </>
              ) : currentStep === steps.length ? (
                "Create entity →"
              ) : (
                "Continue →"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
