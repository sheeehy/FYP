// app/api/entities/route.ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { EntitySchema } from "@/lib/validation/entity"
import { Prisma } from "@prisma/client"

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export async function GET() {
  try {
    const entities = await prisma.entities.findMany({
      orderBy: { created_at: "desc" },
    })
    return NextResponse.json(entities)
  } catch (err: any) {
    console.error("GET /api/entities error:", err)
    return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = EntitySchema.parse(body)

    const slug = slugify(parsed.name || "")

    const entity = await prisma.entities.create({
      data: {
        ...parsed,
        slug,
      },
    })

    return NextResponse.json(entity, { status: 201 })
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
