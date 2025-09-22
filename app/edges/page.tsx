import { prisma } from '@/lib/prisma'

export default async function EdgesPage() {
  const edges = await prisma.edges.findMany({
    include: {
      entities_edges_source_idToentities: true,
      entities_edges_target_idToentities: true,
    },
    orderBy: { created_at: 'desc' },
    take: 50, // limit for performance
  })

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold mb-8">Edges (Connections)</h1>

      <div className="grid grid-cols-1 gap-4">
        {edges.map((edge) => {
          const source = edge.entities_edges_source_idToentities
          const target = edge.entities_edges_target_idToentities

          return (
            <div
              key={edge.id}
              className="flex items-center justify-between border rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              {/* source */}
              <div className="flex-1 text-right pr-4">
                <p className="font-semibold">{source?.name ?? 'Unknown'}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {source?.type}
                </p>
              </div>

              {/* relationship */}
              <div className="flex flex-col items-center w-40">
                <span className="text-sm font-medium capitalize">
                  {edge.type.replace('_', ' ')}
                </span>
                {edge.weight && (
                  <span className="text-xs text-gray-400">
                    weight {edge.weight}
                  </span>
                )}
                {edge.date && (
                  <span className="text-xs text-gray-400">
                    {new Date(edge.date).getFullYear()}
                  </span>
                )}
              </div>

              {/* target */}
              <div className="flex-1 pl-4">
                <p className="font-semibold">{target?.name ?? 'Unknown'}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {target?.type}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
