"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { EntityStepDialog } from "@/components/EntityStepDialog"

interface Entity {
  id: string
  name: string
  archetype: string
  role?: string
  tags: string[]
  description?: string
  location?: string
  image_url?: string
  links?: Record<string, string>
  profile?: Record<string, any>
  created_at: string
  updated_at: string
}

function EntitiesList({ entities }: { entities: Entity[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entities.map((entity) => (
        <Card key={entity.id} className="overflow-hidden">
          {entity.image_url && (
            <div className="relative w-full h-40 bg-gray-100 rounded-t-lg overflow-hidden">
              <Image src={entity.image_url || "/placeholder.svg"} alt={entity.name} fill className="object-cover" />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{entity.name}</CardTitle>
                <Badge variant="secondary" className="mt-1">
                  {entity.archetype}
                </Badge>
              </div>
            </div>
            {entity.role && <p className="text-sm text-muted-foreground">{entity.role}</p>}
          </CardHeader>
          <CardContent>
            {entity.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{entity.description}</p>
            )}

            {entity.location && <p className="text-xs text-muted-foreground mb-2">📍 {entity.location}</p>}

            {entity.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {entity.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {entity.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{entity.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {entity.links && Object.keys(entity.links).length > 0 && (
              <div className="flex gap-2">
                {Object.entries(entity.links)
                  .slice(0, 2)
                  .map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {key}
                    </a>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function EntitiesPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/entities`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to fetch entities")
        }

        const data = await response.json()
        setEntities(data)
      } catch (error) {
        console.error("Error fetching entities:", error)
        setEntities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntities()
  }, [])

  const handleEntityCreated = () => {
    setIsLoading(true)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/api/entities`)
      .then((res) => res.json())
      .then((data) => {
        setEntities(data)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Error refetching entities:", error)
        setIsLoading(false)
      })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading entities...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Entities</h1>
          <p className="text-muted-foreground mt-1">Manage your entities and their relationships</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Entity
        </Button>
      </div>

      {entities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No entities found</p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create your first entity
          </Button>
        </div>
      ) : (
        <EntitiesList entities={entities} />
      )}

      <EntityStepDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={handleEntityCreated} />
    </div>
  )
}
