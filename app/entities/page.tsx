import { prisma } from '@/lib/prisma'
import Image from 'next/image'

export default async function EntitiesPage() {
  const entities = await prisma.entities.findMany({
    include: {
      entity_aliases: true,
      entity_scores: true,
    },
    orderBy: { created_at: 'desc' },
  })

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-8">Entities</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="rounded-2xl shadow-md border p-6 flex flex-col gap-4 hover:shadow-lg transition"
          >
            {/* image */}
            {entity.image_url && (
              <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={entity.image_url}
                  alt={entity.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* name + type */}
            <div>
              <h2 className="text-xl font-semibold">{entity.name}</h2>
              <p className="text-sm text-gray-500 capitalize">
                {entity.type}
              </p>
            </div>

            {/* tags */}
            {entity.tags && entity.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {entity.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {entity.description && (
              <p className="text-sm text-gray-600 line-clamp-3">
                {entity.description}
              </p>
            )}

            {/* scores */}
            {entity.entity_scores && (
              <div className="text-sm mt-auto">
                <p>
                  <span className="font-medium">Momentum:</span>{' '}
                  {entity.entity_scores.momentum_score?.toFixed(2) ?? '—'}
                </p>
                <p>
                  <span className="font-medium">Centrality:</span>{' '}
                  {entity.entity_scores.centrality_score?.toFixed(2) ?? '—'}
                </p>
              </div>
            )}

            {/* aliases */}
            {entity.entity_aliases.length > 0 && (
              <div className="text-xs text-gray-500">
                <p>Also known as:</p>
                <ul className="list-disc ml-4">
                  {entity.entity_aliases.map((alias) => (
                    <li key={alias.id}>
                      {alias.alias} {alias.is_primary ? '(primary)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
