import { z } from "zod";

export const EntitySchema = z
  .object({
    name: z.string().min(1),
    archetype: z.enum([
      "person","group","venue","organization","media","event","artifact",
    ] as const),
    role: z.string().optional(),
    slug: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    image_url: z.string().optional(), 
    links: z.record(z.string(), z.any()).optional(),
    profile: z.record(z.string(), z.any()).optional(),
  })
  .strict();
