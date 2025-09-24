import { z } from "zod"; // using zod for type validation and runtime safety for all entities
// the app will still use supabase/prismas type validation, but for the messy archetype tags and other fields I also need runtime type validation

export const ArchetypeEnum = z.enum([ 
  "individual", 
  "group",
  "venue",
  "organization",
  "media",
  "event",
  "work",
]);

export const EntitySchema = z.object({ // all entities need a name and archetype
  name: z.string().min(1, "Name is required"),
  archetype: ArchetypeEnum,
  culture: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]), // tags are always resolved to an array 
  image_url: z.url().optional(),
  links: z.record(z.string(), z.string()).optional(),
});

