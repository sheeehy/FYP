// a slightly over engineered dialog (WIP)
// i want really solid ui/ux so im using this as a reference component

// inspired by this article: https://jakub.kr/components/sign-in-dialog
// liked both the ui + the motion element (using react-use-measure)

// using react hook form + zod + shadcn

"use client"

import type React from "react"
import { useState, useEffect, useRef, useMemo, forwardRef } from "react"
import { useForm, Controller, type FieldError } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EntitySchema } from "@/lib/validation/entity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Plus, ArrowLeft, Upload, ArrowRight } from "lucide-react"
import type { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import useMeasure from 'react-use-measure'
import { cn } from "@/lib/utils"


type EntityFormData = z.infer<typeof EntitySchema> // infer data from zod schema

const archetypes = [ // current list of archetypes (WIP)
  { value: "person", label: "Person" }, 
  { value: "group", label: "Group" },
  { value: "venue", label: "Venue" },
  { value: "organization", label: "Organization" },
  { value: "media", label: "Media" },
  { value: "event", label: "Event" },
  { value: "artifact", label: "Artifact" },
] as const

interface EntityStepDialogProps { // dialog props
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const getErrorMessage = (e: unknown): string | undefined => // readable error message from fields
  typeof (e as FieldError | undefined)?.message === "string" ? (e as FieldError).message : undefined

type AutoGrowTextareaProps = Omit<React.ComponentProps<"textarea">, "rows"> & { onAutoGrow?: () => void }

const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>( // auto growing textarea
  ({ onAutoGrow, className, style, onInput, ...rest }, forwardedRef) => { // nice to have for all fields but needed for description step
    const localRef = useRef<HTMLTextAreaElement | null>(null)
    const setRefs = (node: HTMLTextAreaElement | null) => { // manage local and forwarded refs
      localRef.current = node
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }
    const autoGrow = () => { // expand textarea height to fit content in the step (WIP)
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
        className={`bg-muted border border-border rounded-lg placeholder:text-muted-foreground resize-none leading-6 w-full px-4 py-3 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 ${className ?? ""}`}
        style={{ overflow: "hidden", ...style }}
        autoComplete="off"
        data-lpignore="true"
      />
    )
  },
)
AutoGrowTextarea.displayName = "AutoGrowTextarea"

const steps = [ // form steps configuration, optionality isnt nailed down
  { id: 1, title: "Archetype", field: "archetype", required: true },
  { id: 2, title: "Name", field: "name", required: true },
  { id: 3, title: "Role", field: "role", required: true },
  { id: 4, title: "Tags", field: "tags", required: true },
  { id: 5, title: "Description", field: "description", required: true },
  { id: 6, title: "Venue", field: "Venue", required: true },
  { id: 7, title: "Image", field: "image_url", required: true },
  { id: 8, title: "Links", field: "links", required: true },
  { id: 9, title: "Attributes", field: "profile", required: false }, // attributes make more sense ()
] as const

export function EntityStepDialog({ open, onOpenChange, onSuccess }: EntityStepDialogProps) {

  const [currentStep, setCurrentStep] = useState(1) // step state
  const [isSubmitting, setIsSubmitting] = useState(false) // submission states
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [tags, setTags] = useState<string[]>([]) // tags states
  const [tagInput, setTagInput] = useState("")

  const [links, setLinks] = useState<Array<{ key: string; value: string }>>([]) // link states
  const [linkPlatformInput, setLinkPlatformInput] = useState("")
  const [linkUrlInput, setLinkUrlInput] = useState("")
  const [linkInlineError, setLinkInlineError] = useState<string | null>(null)

  const [profilePairs, setProfilePairs] = useState<Array<{ key: string; value: string }>>([]) //profile states
  const [profileKeyInput, setProfileKeyInput] = useState("")
  const [profileValueInput, setProfileValueInput] = useState("")

  const [activeArchetype, setActiveArchetype] = useState<string | null>(null) // archetype and touched step tracking
  const [touchedSteps, setTouchedSteps] = useState<Record<number, boolean>>({})

  const slugSetRef = useRef<Set<string> | null>(null) // slug cache and live duplicate state
  const loadingSlugsRef = useRef<boolean>(false)
  const [nameDuplicate, setNameDuplicate] = useState(false)
  const [nameChecking, setNameChecking] = useState(false)

  const archetypeFirstBtnRef = useRef<HTMLButtonElement | null>(null) // focus refs for each step
  const nameRef = useRef<HTMLTextAreaElement | null>(null)
  const roleRef = useRef<HTMLTextAreaElement | null>(null)
  const tagInputRef = useRef<HTMLTextAreaElement | null>(null)
  const descRef = useRef<HTMLTextAreaElement | null>(null)
  const locationRef = useRef<HTMLTextAreaElement | null>(null)
  const imageUrlRef = useRef<HTMLInputElement | null>(null)
  const linkPlatformRef = useRef<HTMLInputElement | null>(null)
  const profileKeyRef = useRef<HTMLInputElement | null>(null)

  const [ref, bounds] = useMeasure() // get content height, needed for animation


  const defaultValues = useMemo( // default form values / also i dont think memo actually improves performance here (WIP)
    () => ({
      archetype: undefined as unknown as EntityFormData["archetype"],
      name: "",
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
    // react hook form setup 
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    reset,
    control,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EntityFormData>({
    resolver: zodResolver(EntitySchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues,
  })

  const { ref: nameRegRef, ...nameReg } = register("name") // register fields for refs
  const { ref: roleRegRef, ...roleReg } = register("role")
  const { ref: descRegRef, ...descReg } = register("description")
  const { ref: locRegRef, ...locReg } = register("location")
  const { ref: imgRegRef, ...imgReg } = register("image_url")

  const initializedRef = useRef(false) // run once on mount to sync initial form values (will be needed for update)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    const initialTags = (getValues("tags") as string[] | undefined) ?? [] // also load tags, links, etc. if there needed
    if (initialTags.length) setTags(initialTags)
    const initialLinks = getValues("links") as Record<string, string> | undefined
    if (initialLinks) setLinks(Object.entries(initialLinks).map(([key, value]) => ({ key, value })))
    const initialProfile = getValues("profile") as Record<string, string> | undefined
    if (initialProfile) setProfilePairs(Object.entries(initialProfile).map(([key, value]) => ({ key, value })))
  }, [])

  const focusCurrentStep = () => { // focus the correct input when the step changes / probably a better way to do this natively with shadcn
    requestAnimationFrame(() => {
      switch (currentStep) {
        case 1: archetypeFirstBtnRef.current?.focus(); break
        case 2: nameRef.current?.focus(); break
        case 3: roleRef.current?.focus(); break
        case 4: tagInputRef.current?.focus(); break
        case 5: descRef.current?.focus(); break
        case 6: locationRef.current?.focus(); break
        case 7: imageUrlRef.current?.focus(); break
        case 8: linkPlatformRef.current?.focus(); break
        case 9: profileKeyRef.current?.focus(); break
      }
    })
  }

  useEffect(() => { // reset the form state when dialog opens
    focusCurrentStep()
  }, [currentStep])

  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      setTouchedSteps({})
      setActiveArchetype(null)
      setNameDuplicate(false)
      setNameChecking(false)
      focusCurrentStep()
    }
  }, [open])

  const resetForm = () => { // full reset of form and local state
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
    setTouchedSteps({})
    setActiveArchetype(null)
    slugSetRef.current = null
    setNameDuplicate(false)
    setNameChecking(false)
  }

  const handleClose = (nextOpen: boolean) => { // close handler
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const slugify = (s: string) => // convert string to url for slug
    s
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

  const isValidUrl = (u: string) => { // url validation
    try {
      const url = new URL(u)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  const addTag = () => { // add tag from input
    const t = tagInput.trim().toLowerCase()
    if (!t) return
    const next = Array.from(new Set([...tags, t]))
    setTags(next)
    setTagInput("")
    setValue("tags", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    clearErrors("tags")
    setTouchedSteps((prev) => ({ ...prev, 4: true }))
  }

  const removeTag = (tagToRemove: string) => { // remove tag
    const next = tags.filter((tag) => tag !== tagToRemove)
    setTags(next)
    setValue("tags", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    if (next.length === 0) {
      setError("tags", { type: "required", message: "At least one tag is required" })
    }
  }

  const toObject = (arr: Array<{ key: string; value: string }>) => { // convert array to object
    const out: Record<string, string> = {}
    arr.forEach(({ key, value }) => {
      const k = key.trim()
      const v = value.trim()
      if (k && v) out[k] = v
    })
    return Object.keys(out).length ? out : undefined
  }

  const addLink = () => { // add a link row
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
    clearErrors("links" as any)
    setTouchedSteps((prev) => ({ ...prev, 8: true }))
  }

  const removeLink = (index: number) => { // remove link row by index
    const newLinks = links.filter((_, i) => i !== index)
    setLinks(newLinks)
    setValue("links", toObject(newLinks), { shouldDirty: true, shouldTouch: true, shouldValidate: true })
    if (newLinks.length === 0) {
      setError("links" as any, { type: "required", message: "At least one link is required" } as any)
    }
  }

  // profile pairs are a work in progress, for now they just use a key and value to json
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

  // check slug availability and cache it
  const ensureSlugSet = async () => {
    if (slugSetRef.current || loadingSlugsRef.current) return
    loadingSlugsRef.current = true
    try {
      const res = await fetch("/api/entities", { headers: { "Content-Type": "application/json" } })
      if (!res.ok) throw new Error("Failed")
      const entities = (await res.json()) as Array<{ slug?: string; name?: string }>
      slugSetRef.current = new Set(
        (entities || [])
          .map((e) => (e.slug || slugify(e.name || "")).trim())
          .filter(Boolean),
      )
    } catch {
      slugSetRef.current = null
    } finally {
      loadingSlugsRef.current = false
    }
  }

  const isSlugTaken = async (slug: string): Promise<boolean> => {
    await ensureSlugSet()
    const set = slugSetRef.current
    if (!set) return false
    return set.has(slug)
  }

  const nameValue = watch("name") // live name duplicate check, disables button immediately and clears as user fixes
  const nameDebounceRef = useRef<number | null>(null)
  useEffect(() => {
    if (nameDebounceRef.current) {
      window.clearTimeout(nameDebounceRef.current)
      nameDebounceRef.current = null
    }
    const n = (nameValue || "").trim()
    if (!n) {
      setNameDuplicate(false)
      setNameChecking(false)
      if (getErrorMessage(errors.name) === "That name is already taken") clearErrors("name")
      return
    }
    setNameChecking(true)
    nameDebounceRef.current = window.setTimeout(async () => {
      const slug = slugify(n)
      const taken = await isSlugTaken(slug)
      setNameDuplicate(taken)
      setNameChecking(false)
      if (taken) {
        setError("name", { type: "validate", message: "That name is already taken" })
      } else if (getErrorMessage(errors.name) === "That name is already taken") {
        clearErrors("name")
      }
    }, 250)
    return () => {
      if (nameDebounceRef.current) {
        window.clearTimeout(nameDebounceRef.current)
        nameDebounceRef.current = null
      }
    }
  }, [nameValue])

  const validateCurrentStep = async (): Promise<boolean> => { // validate steps
    setTouchedSteps((prev) => ({ ...prev, [currentStep]: true })) // each step has slightly different validations but theyre straight forward
    switch (currentStep) { // also, as of now, zod, prisma and client have slightly different variations (gulp)
      case 1: return await trigger("archetype", { shouldFocus: true })
      case 2: {
        const ok = await trigger("name", { shouldFocus: true })
        if (!ok) return false
        const n = (getValues("name") || "").trim()
        if (!n) return false
        if (nameChecking) {
          const slug = slugify(n)
          const taken = await isSlugTaken(slug)
          setNameDuplicate(taken)
          if (taken) {
            setError("name", { type: "validate", message: "That name is already taken" })
            return false
          }
        }
        if (nameDuplicate) return false
        return true
      }
      case 3: return await trigger("role", { shouldFocus: true })
      case 4: {
        if (tags.length === 0) {
          setError("tags", { type: "required", message: "At least one tag is required" })
          tagInputRef.current?.focus()
          return false
        }
        clearErrors("tags")
        return true
      }
      case 5: return await trigger("description", { shouldFocus: true })
      case 6: return await trigger("location", { shouldFocus: true })
      case 7: {
        const val = getValues("image_url")?.trim()
        if (!val) {
          setError("image_url", { type: "required", message: "Image URL is required" })
          imageUrlRef.current?.focus()
          return false
        }
        if (!isValidUrl(val)) {
          setError("image_url", { type: "validate", message: "Image URL must be a valid URL" })
          imageUrlRef.current?.focus()
          return false
        }
        clearErrors("image_url")
        return true
      }
      case 8: {
        if (links.length === 0) {
          setError("links" as any, { type: "required", message: "At least one link is required" } as any)
          linkPlatformRef.current?.focus()
          return false
        }
        clearErrors("links" as any)
        return true
      }
      case 9: return true
      default: return true
    }
  }

  const goNext = async () => { // step / dialog navigation
    if (currentStep === steps.length) {
      await handleSubmit(onSubmit)()
      return
    }
    const valid = await validateCurrentStep()
    if (!valid) return
    setCurrentStep((s) => s + 1)
  }

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1)
  }

  const onSubmit = async (data: EntityFormData) => { // submit handler
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const cleanedTags = Array.from(new Set((tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean)))
      data.tags = cleanedTags as any // clean tags

      const linksObj = toObject(links)
      if (linksObj) { // validate links
        for (const [, v] of Object.entries(linksObj)) {
          if (!isValidUrl(v)) throw new Error("One or more links are not valid URLs")
        }
      }
      data.links = linksObj as any
      data.profile = toObject(profilePairs) as any

      const img = (data.image_url || "").trim() // validate img is url (WIP)
      if (!img) throw new Error("Image URL is required")
      if (!isValidUrl(img)) throw new Error("Image URL must be a valid URL")

        // will need to implement drag and drop, file uploads eventually
        // probably will use UploadThing and a drag and drop component

      const name = (data.name || "").trim() // generate slug from name
      const slug = slugify(name)
      ;(data as any).slug = slug

      if (await isSlugTaken(slug)) { // check not duplicate
        setCurrentStep(2)
        setNameDuplicate(true)
        setError("name", { type: "validate", message: "That name is already taken" })
        throw new Error("That name is already taken")
      }

      const res = await fetch("/api/entities", { // post
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        let msg = "Failed to create entity"
        try {
          const j = await res.json()
          if (j?.error) msg = j.error
        } catch {}
        throw new Error(msg)
      }

      slugSetRef.current = null // reset cache and form after success
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEnterToContinue = (e: React.KeyboardEvent) => { // keyboard shortcuts (need more maybe)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void goNext()
    }
  }

  const shouldShowError = (step: number) => touchedSteps[step] === true // helpers for checking step state

  const isStepFilled = (id: number): boolean => {
    switch (id) {
      case 1: return Boolean(watch("archetype"))
      case 2: return Boolean((watch("name") || "").trim())
      case 3: return Boolean((watch("role") || "").trim())
      case 4: return tags.length > 0
      case 5: return Boolean((watch("description") || "").trim())
      case 6: return Boolean((watch("location") || "").trim())
      case 7: return Boolean((watch("image_url") || "").trim())
      case 8: return links.length > 0
      case 9: return true
      default: return false
    }
  }

  const isStepValid = (id: number): boolean => {
    if (!isStepFilled(id)) return false
    switch (id) {
      case 1: return !errors.archetype
      case 2: return !errors.name && !nameDuplicate && !nameChecking
      case 3: return !errors.role
      case 4: return !errors.tags && tags.length > 0
      case 5: return !errors.description
      case 6: return !errors.location
      case 7: {
        const val = (watch("image_url") || "").trim()
        return !errors.image_url && Boolean(val) && isValidUrl(val)
      }
      case 8: return !errors.links && links.length > 0
      case 9: return true
      default: return false
    }
  }

  const disableContinue = isSubmitting || !isStepValid(currentStep) // disable continue button if step invalid or submitting

  const renderStepContent = () => { // display steps
    const stepKey = steps[currentStep - 1].field as keyof EntityFormData
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3" key={stepKey as string}>
            <Controller
              name="archetype"
              control={control}
              render={({ field }) => (
                <div className="space-y-2 relative">
                {archetypes.map((archetype, idx) => {
  const selected = field.value === archetype.value
  return (
    <div key={archetype.value} className="relative">
      <Button
        type="button"
        variant={selected ? "default" : "secondary"}
        aria-pressed={selected}
        className="w-full h-12 justify-start text-left font-medium rounded-lg relative overflow-hidden"
        onClick={() => {
          field.onChange(archetype.value)
          setActiveArchetype(archetype.value)
          setTouchedSteps((prev) => ({ ...prev, 1: true }))
          void trigger("archetype")
        }}
        ref={idx === 0 ? archetypeFirstBtnRef : undefined}
        onMouseEnter={() => setActiveArchetype(archetype.value)}
        onMouseLeave={() => setActiveArchetype((field.value as string) || null)}
      >
        <span className="relative z-10">{archetype.label}</span>
      </Button>
    </div>
  )
})}
                </div>
              )}
            />
            {shouldShowError(1) && getErrorMessage(errors.archetype) && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.archetype)}</p>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-2" key={stepKey as string}>
            <AutoGrowTextarea
              {...nameReg}
              ref={(el) => {
                nameRegRef(el)
                nameRef.current = el
              }}
              placeholder="Add a name"
              onKeyDown={handleEnterToContinue}
              onBlur={(e) => {
                nameReg.onBlur(e)
                setTouchedSteps((prev) => ({ ...prev, 2: true }))
              }}
              className="min-h-[48px]"
            />
            {(shouldShowError(2) || nameDuplicate) && (nameDuplicate || getErrorMessage(errors.name)) && (
              <p className="text-sm text-destructive">
                {nameDuplicate ? "That name is already taken" : getErrorMessage(errors.name)}
              </p>
            )}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4" key={stepKey as string}>
            <AutoGrowTextarea
              {...roleReg}
              ref={(el) => {
                roleRegRef(el)
                roleRef.current = el
              }}
              placeholder="Add a role"
              onKeyDown={handleEnterToContinue}
              onBlur={(e) => {
                roleReg.onBlur(e)
                setTouchedSteps((prev) => ({ ...prev, 3: true }))
              }}
              className="min-h-[48px]"
            />
            {shouldShowError(3) && getErrorMessage(errors.role) && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.role)}</p>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-3" key={stepKey as string}>
            <div className="flex gap-2 min-w-0 ">
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
                ref={tagInputRef}
              />
            <Button
  type="button"
  onClick={addTag}
  variant={tagInput.trim() ? "default" : "secondary"}
  disabled={!tagInput.trim()}
  className="h-12 w-12 rounded-lg border border-border"
  aria-label="Add tag"
>
  <Plus
    className={cn(
      "h-5 w-5 transition-colors",
      tagInput.trim() ? "text-primary-foreground" : "text-muted-foreground"
    )}
  />
</Button>
            </div>
        
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => (
                  <div
                    key={`${tag}-${i}`}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-3 py-1 text-sm border border-border"
                  >
                    <span className="break-words">{tag}</span>
                    <button
  type="button"
  onClick={() => removeTag(tag)}
  className="ml-1 inline-flex rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
>
  <X className="h-3 w-3" />
</button>
                  </div>
                ))}
              </div>
            )}
        
            {shouldShowError(4) && tags.length === 0 && (
              <p className="text-sm text-destructive">At least one tag is needed</p>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-4" key={stepKey as string}>
            <AutoGrowTextarea
              {...descReg}
              ref={(el) => {
                descRegRef(el)
                descRef.current = el
              }}
              placeholder="Add a description"
              onKeyDown={handleEnterToContinue}
              onBlur={(e) => {
                descReg.onBlur(e)
                setTouchedSteps((prev) => ({ ...prev, 5: true }))
              }}
              className="min-h-[96px]"
            />
            {shouldShowError(5) && getErrorMessage(errors.description) && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.description)}</p>
            )}
          </div>
        )

      case 6:
        return (
          <div className="space-y-4" key={stepKey as string}>
            <AutoGrowTextarea
              {...locReg}
              ref={(el) => {
                locRegRef(el)
                locationRef.current = el
              }}
              placeholder="Add a venue"
              onKeyDown={handleEnterToContinue}
              onBlur={(e) => {
                locReg.onBlur(e)
                setTouchedSteps((prev) => ({ ...prev, 6: true }))
              }}
              className="min-h-[48px]"
            />
            {shouldShowError(6) && getErrorMessage(errors.location) && (
              <p className="text-sm text-destructive">{getErrorMessage(errors.location)}</p>
            )}
          </div>
        )

        case 7: { // WIP
                  // image upload doesnt work, replace image doesnt work, ratio is off
          const imageUrl = watch("image_url")
        
          const onFile = (file?: File) => {
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => {
              const v = typeof reader.result === "string" ? reader.result : ""
              setValue("image_url", v, { shouldValidate: true, shouldDirty: true })
              setTouchedSteps((p) => ({ ...p, 7: true }))
              void trigger("image_url")
            }
            reader.readAsDataURL(file)
          }
        
          return (
            <div className="space-y-4" key={stepKey as string}>
              {!imageUrl ? (
                <label
                  htmlFor="image-file"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f && f.type.startsWith("image/")) onFile(f)
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.files
                    if (items && items[0] && items[0].type.startsWith("image/")) onFile(items[0])
                  }}
                  className="relative flex flex-col items-center justify-center aspect-square w-full rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                  aria-label="Upload image"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground/70">or paste an image / URL below</p>
                  <input
                    id="image-file"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />
                </label>
              ) : (
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border">
                  <img
                    src={isValidUrl(imageUrl) ? imageUrl : "/image.png"}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const input = document.getElementById("image-file") as HTMLInputElement | null
                        input?.click()
                      }}
                      aria-label="Replace image"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setValue("image_url", "", { shouldDirty: true })}
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
        
              <Input
                {...imgReg}
                ref={(el) => {
                  imgRegRef(el)
                  imageUrlRef.current = el
                }}
                placeholder="Paste image URL"
                type="url"
                onBlur={(e) => {
                  imgReg.onBlur(e)
                  setTouchedSteps((prev) => ({ ...prev, 7: true }))
                  void trigger("image_url")
                }}
                className="h-12 px-4 bg-muted border-border rounded-lg placeholder:text-muted-foreground w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void trigger("image_url")
                  }
                }}
              />
        
              {shouldShowError(7) && getErrorMessage(errors.image_url) && (
                <p className="text-sm text-destructive">{getErrorMessage(errors.image_url)}</p>
              )}
            </div>
          )
        }
        
        case 8:
          return (
            <div className="space-y-3" key={stepKey as string}>
              <div className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 min-w-0">
                <Input
                  value={linkPlatformInput}
                  onChange={(e) => setLinkPlatformInput(e.target.value)}
                  placeholder="Platform"
                  className="h-12 px-4 bg-muted border-border rounded-lg placeholder:text-muted-foreground w-full"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addLink()
                    }
                  }}
                  ref={linkPlatformRef}
                />
                <Input
                  value={linkUrlInput}
                  onChange={(e) => {
                    setLinkUrlInput(e.target.value)
                    if (linkInlineError) setLinkInlineError(null)
                  }}
                  placeholder="URL"
                  type="url"
                  className="h-12 px-4 bg-muted border-border rounded-lg placeholder:text-muted-foreground w-full"
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
                  variant={linkPlatformInput.trim() && isValidUrl(linkUrlInput.trim()) ? "default" : "secondary"}
                  disabled={!linkPlatformInput.trim() || !isValidUrl(linkUrlInput.trim())}
                  className="h-12 w-12 rounded-lg border border-border"
                  aria-label="Add link"
                >
                  <Plus
                    className={cn(
                      "h-5 w-5 transition-colors",
                      linkPlatformInput.trim() && isValidUrl(linkUrlInput.trim())
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </div>
        
              {linkInlineError && <p className="text-sm text-destructive">{linkInlineError}</p>}
        
              {links.length > 0 && (
                <div className="space-y-2">
                  {links.map((link, index) => (
                    <div
                      key={`${link.key}-${index}`}
                      className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 px-3 py-2 rounded-lg w-full min-w-0 border border-border bg-secondary text-secondary-foreground"
                    >
                      <span
                        className="text-sm font-medium min-w-0 truncate"
                        title={link.key || "Platform"}
                      >
                        {link.key || "Platform"}
                      </span>
                      <span
                        className="text-sm min-w-0 truncate text-muted-foreground"
                        title={link.value || "URL"}
                      >
                        {link.value || "URL"}
                      </span>
                      <Button
                        type="button"
                        onClick={() => removeLink(index)}
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label="Remove link"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
        
              {shouldShowError(8) && links.length === 0 && (
                <p className="text-sm text-destructive">At least one link is needed</p>
              )}
            </div>
          )
        
          case 9: // WIP
          return (
            <div className="space-y-4" key={stepKey as string}>
              <div className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 min-w-0">
                <Input
                  value={profileKeyInput}
                  onChange={(e) => setProfileKeyInput(e.target.value)}
                  placeholder="Key"
                  className="h-12 px-4 bg-muted border-border rounded-lg placeholder:text-muted-foreground w-full"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addProfilePair()
                    }
                  }}
                  ref={profileKeyRef}
                />
                <Input
                  value={profileValueInput}
                  onChange={(e) => setProfileValueInput(e.target.value)}
                  placeholder="Value"
                  className="h-12 px-4 bg-muted border-border rounded-lg placeholder:text-muted-foreground w-full"
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
                  variant={profileKeyInput.trim() && profileValueInput.trim() ? "default" : "secondary"}
                  disabled={!profileKeyInput.trim() || !profileValueInput.trim()}
                  className="h-12 w-12 rounded-lg border border-border"
                  aria-label="Add profile attribute"
                >
                  <Plus
                    className={cn(
                      "h-5 w-5 transition-colors",
                      profileKeyInput.trim() && profileValueInput.trim()
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </div>
        
              {profilePairs.length > 0 && (
                <div className="space-y-2">
                  {profilePairs.map((pair, index) => (
                    <div
                      key={`${pair.key}-${index}`}
                      className="grid grid-cols-[1fr_1.6fr_auto] items-center gap-2 px-3 py-2 rounded-lg w-full min-w-0 border border-border bg-secondary text-secondary-foreground"
                    >
                      <span className="text-sm font-medium min-w-0 truncate" title={pair.key || "Key"}>
                        {pair.key || "Key"}
                      </span>
                      <span className="text-sm min-w-0 truncate text-muted-foreground" title={pair.value || "Value"}>
                        {pair.value || "Value"}
                      </span>
                      <Button
                        type="button"
                        onClick={() => removeProfilePair(index)}
                        variant="ghost"
                        className="h-6 w-6 p-0 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
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

  // i forgot why i liked this transition, mayber better ux/accesibility
  
  // const content = (
  //  <AnimatePresence mode="popLayout" initial={false}>
  //    <motion.div
  //      key={currentStep}
  //      initial={{ opacity: 0, scale: 0.97 }}
  //      animate={{ opacity: 1, scale: 1 }}
  //      exit={{ opacity: 0, scale: 0.97 }}
  //      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
  //    >
  //       <div ref={ref}>{renderStepContent()}</div>
  //     </motion.div>
  //    </AnimatePresence> 
  // )


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="p-0  rounded-[32px] border overflow-hidden sm:max-w-sm">
      <motion.div
  initial={{  opacity: 0, scale: 0.97, filter: "blur(6px)",height: currentStep === 1 ? 560 : 600 }}          // using a hardcoded height for step 1 because i cant get the submit button to be referrenced by useMeasure
  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" , height: currentStep === 1 ? 560 : bounds.height || 600 }}
  exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
  transition={{ type: "spring", bounce: 0, duration: 0.35 }}
  className="will-change-transform sm:max-w-md p-0 overflow-hidden"
>
          <div ref={ref} className="flex flex-col w-full">
            
            <DialogHeader className=" px-6 pt-6 shrink-0">
              <div className="grid grid-cols-3 items-center">
                <div className="justify-self-start">
                  {currentStep > 1 ? (
                    <Button
                      size="icon"
                      onClick={goBack}
                      className="h-8 w-8 rounded-full hover:bg-muted"
                      variant="ghost"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="h-8 w-8 inline-block" />
                  )}
                </div>
                <DialogTitle className="justify-self-center text-base font-semibold text-foreground text-center">
                  {steps[currentStep - 1].title}
                </DialogTitle>
                <div className="justify-self-end">
                  <Button
                    size="icon"
                    onClick={() => handleClose(false)}
                    className="h-8 w-8 rounded-full hover:bg-muted"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
  
            <div className="px-6 py-5 flex-1">
              <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
    key={currentStep}
    initial={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
    exit={{ opacity: 0, scale: 0.97, filter: "blur(6px)" }}
    transition={{ type: "spring", bounce: 0, duration: 0.35 }}
  >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </div>
  
            {submitError && (
              <div className="mx-6 mb-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </div>
            )}
  
            <div className="px-6 pb-6 shrink-0">
            <Button
  onClick={goNext}
  disabled={disableContinue}
  className={cn(
    "w-full h-12 rounded-full font-medium transition-all",
    disableContinue
      ? "bg-muted text-muted-foreground cursor-not-allowed"
      : "shadow-sm hover:shadow-md"
  )}
>
  {isSubmitting ? (
    <span className="flex items-center">Creating...</span>
  ) : currentStep === steps.length ? (
    <span className="flex items-center justify-center gap-2">
      Create entity <ArrowRight className="h-4 w-4" />
    </span>
  ) : (
    <span className="flex items-center justify-center gap-2">
      Continue <ArrowRight className="h-4 w-4" />
    </span>
  )}
</Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
  
  
  
}
