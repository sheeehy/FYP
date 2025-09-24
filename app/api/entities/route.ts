import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EntitySchema } from "@/lib/validation/entity";

export async function GET() { // list all entities
  try {
    const entities = await prisma.entities.findMany({
      orderBy: { created_at: "desc" }, // newest first
    });
    return NextResponse.json(entities); //(as json*)
  } catch (err: any) {
    console.error("GET /api/entities error:", err);
    return NextResponse.json({ error: "Failed to fetch entities" }, { status: 500 });
  }
}

export async function POST(req: Request) {  // make an entity
  try {
    const body = await req.json();

    const parsed = EntitySchema.parse(body); // validate input 

    const entity = await prisma.entities.create({
      data: parsed, 
    });     // Persist to DB + parsed matches Prisma shape

    return NextResponse.json(entity, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/entities error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
