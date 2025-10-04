import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { EntitySchema } from "@/lib/validation/entity"
import { Prisma } from "@prisma/client"

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim()

type IncomingAlias = { alias: string; is_primary?: boolean | null }

export async function GET() {
  try {
    const entities = await prisma.entities.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        entity_aliases: { select: { alias: true, is_primary: true } },
      },
    })
    return NextResponse.json(entities)
  } catch (err: any) {
    console.error("GET /api/entities error:", err)
    return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const raw = await req.json()

    const { aliases: rawAliases, ...rest } = raw as { aliases?: IncomingAlias[] }
    const parsed = EntitySchema.parse(rest)

    const aliases = (rawAliases ?? [])
      .filter(a => a && typeof a.alias === "string" && a.alias.trim().length)
      .map(a => ({ alias: a.alias.trim(), is_primary: !!a.is_primary }))

    const slug = slugify(parsed.name || "")

    const existing = await prisma.entities.findMany({
      select: { name: true, entity_aliases: { select: { alias: true } } },
    })
    const taken = new Set<string>()
    for (const e of existing) {
      taken.add(norm(e.name || ""))
      for (const a of e.entity_aliases) taken.add(norm(a.alias || ""))
    }
    if (taken.has(norm(parsed.name))) {
      return NextResponse.json({ error: "Name matches an existing entity/alias" }, { status: 409 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const entity = await tx.entities.create({ data: { ...parsed, slug } })

      if (aliases.length) {
        const seen = new Set<string>()
        let primaryId: string | null = null

        for (const a of aliases) {
          const key = norm(a.alias)
          if (seen.has(key)) continue
          seen.add(key)

          const created = await tx.entity_aliases.create({
            data: {
              entity_id: entity.id,
              alias: a.alias,
              is_primary: !!a.is_primary,
            },
          })
          if (!primaryId && a.is_primary) primaryId = created.id
        }

        if (primaryId) {
          await tx.entity_aliases.updateMany({
            where: { entity_id: entity.id, id: { not: primaryId } },
            data: { is_primary: false },
          })
        }
      }

      return entity
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/entities error:", err)
    // Unique constraint handler
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray((err.meta as any)?.target) &&
      (err.meta as any).target.includes("slug")
    ) {
      return NextResponse.json({ error: "That name/slug is already taken" }, { status: 409 })
    }
    return NextResponse.json({ error: err.message ?? "Bad request" }, { status: 400 })
  }
}
