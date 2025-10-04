import { prisma } from '@/lib/prisma'

export default async function DebugPage() {
    const entities = await prisma.entities.findMany({
        include: {
          entity_aliases: true,
          entity_scores: true,
          scene_entities: true, // 
          edges_edges_source_idToentities: true,
          edges_edges_target_idToentities: true,
          shortlist_entities: true,
        },
      })

  const scenes = await prisma.scenes.findMany({
    include: {
      scene_entities: {
        include: { entities: true },
      },
    },
  })

  const edges = await prisma.edges.findMany()
  const clients = await prisma.clients.findMany({
    include: { client_preferences: true, shortlists: true },
  })
  const shortlists = await prisma.shortlists.findMany({
    include: { shortlist_entities: true },
  })
  const auditLogs = await prisma.audit_logs.findMany()

  return (
    <div className="p-8 space-y-8 text-sm">
      <h1 className="text-2xl font-bold mb-4">Debug DB</h1>

      <Section title="Entities" data={entities} />
      <Section title="Scenes" data={scenes} />
      <Section title="Edges" data={edges} />
      <Section title="Clients" data={clients} />
      <Section title="Shortlists" data={shortlists} />
      <Section title="Audit Logs" data={auditLogs} />
    </div>
  )
}

function Section({ title, data }: { title: string; data: any }) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {data.length === 0 ? (
        <div className="text-gray-500">Not found</div>
      ) : (
        <pre className=" rounded p-4 overflow-x-auto max-h-[400px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
