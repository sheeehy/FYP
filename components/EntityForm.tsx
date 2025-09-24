"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { EntitySchema } from "@/lib/validation/entity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import type { z } from "zod"

type EntityFormData = z.infer<typeof EntitySchema>

const archetypes = ["person", "group", "venue", "organization", "media", "event", "artifact"] as const

export function EntityForm() { // create an entity form (WIP)


// needs work, referencing https://ui.shadcn.com/docs/components/form but have not included all requirements
// using react-hook form and zod inside a form field

  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [links, setLinks] = useState<Array<{ key: string; value: string }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EntityFormData>({
    resolver: zodResolver(EntitySchema),
    defaultValues: {
      tags: [],
      links: {},
    },
  })

  const watchedArchetype = watch("archetype")

  const addTag = () => { // handle tags
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()]
      setTags(newTags)
      setValue("tags", newTags)
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove)
    setTags(newTags)
    setValue("tags", newTags)
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }


  const addLink = () => { //handle links
    setLinks([...links, { key: "", value: "" }])
  }

  const updateLink = (index: number, field: "key" | "value", value: string) => {
    const newLinks = [...links]
    newLinks[index][field] = value
    setLinks(newLinks)

    const linksObject = newLinks.reduce(
      (acc, link) => {
        if (link.key && link.value) {
          acc[link.key] = link.value
        }
        return acc
      },
      {} as Record<string, string>,
    )

    setValue("links", Object.keys(linksObject).length > 0 ? linksObject : undefined)
  }

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index)
    setLinks(newLinks)

    const linksObject = newLinks.reduce(
      (acc, link) => {
        if (link.key && link.value) {
          acc[link.key] = link.value
        }
        return acc
      },
      {} as Record<string, string>,
    )

    setValue("links", Object.keys(linksObject).length > 0 ? linksObject : undefined)
  }

  const onSubmit = async (data: EntityFormData) => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch("/api/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create entity")
      }

      router.push("/entities")       // success - redirect to entities
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add New Entity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* archetype */}
          <div className="space-y-2">
            <Label htmlFor="archetype">Archetype *</Label>
            <Select onValueChange={(value) => setValue("archetype", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select archetype" />
              </SelectTrigger>
              <SelectContent>
                {archetypes.map((archetype) => (
                  <SelectItem key={archetype} value={archetype}>
                    {archetype.charAt(0).toUpperCase() + archetype.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.archetype && <p className="text-sm text-destructive">{errors.archetype.message}</p>}
          </div>

          {/* name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder="Enter entity name" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {/* role */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" {...register("role")} placeholder="Enter role (optional)" />
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          {/* tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={addTag} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Enter description (optional)"
              rows={3}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register("location")} placeholder="Enter location (optional)" />
            {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
          </div>

          {/* image url */}
         {/* in current form, this is bad practice - will likely use a drag and drop library + uploadThing */}

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input id="image_url" {...register("image_url")} placeholder="Enter image URL (optional)" type="url" />
            {errors.image_url && <p className="text-sm text-destructive">{errors.image_url.message}</p>}
          </div>

          {/* links */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Social Links</Label>
              <Button type="button" onClick={addLink} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Link
              </Button>
            </div>
            {links.map((link, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Platform (e.g., twitter)"
                  value={link.key}
                  onChange={(e) => updateLink(index, "key", e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="URL"
                  value={link.value}
                  onChange={(e) => updateLink(index, "value", e.target.value)}
                  className="flex-1"
                  type="url"
                />
                <Button type="button" onClick={() => removeLink(index)} variant="outline" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* error on submit */}
          {submitError && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{submitError}</div>
          )}

          {/* submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating Entity..." : "Create Entity"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
