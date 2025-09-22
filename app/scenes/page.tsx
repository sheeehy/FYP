import { prisma } from '@/lib/prisma'

export default async function ScenesPage() {
  const scenes = await prisma.scenes.findMany({
    include: {
      scene_entities: {
        include: {
          entities: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: 50, // just to keep it light
  })

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-8">Scenes</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenes.map((scene) => (
          <div
            key={scene.id}
            className="border rounded-xl shadow-sm hover:shadow-md transition p-6 "
          >
            {/* scene header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{scene.name}</h2>
              {scene.location && (
                <span className="text-sm text-gray-500">{scene.location}</span>
              )}
            </div>

            {/* culture / subculture */}
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">Culture:</span> {scene.culture}
              {scene.subculture_name && (
                <>
                  {' '}
                  → <span className="italic">{scene.subculture_name}</span>
                </>
              )}
            </p>

            {/* tags */}
            {scene.tags && scene.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {scene.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* description */}
            {scene.description && (
              <p className="text-sm text-gray-600 mb-4">{scene.description}</p>
            )}

            {/* entities in scene */}
            {scene.scene_entities.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Entities:</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {scene.scene_entities.map((se) => (
                    <li key={se.id}>
                      {se.entities?.name ?? 'Unknown'}{' '}
                      <span className="text-gray-400 text-xs">
                        ({se.role})
                      </span>
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
