// example page to test the prisma client
import { prisma } from '@/lib/prisma'

export default async function ArtistsPage() {
  const artists = await prisma.entities.findMany({
    where: { type: 'artist' },
    select: { id: true, name: true },
  })
  

  return (
    <div className="flex flex-col items-center justify-center mt-32 space-y-2">
      {artists.length === 0 ? (
        <div>No artists found</div>
      ) : (
        artists.map((artist) => (
          <div key={artist.id} className="text-lg font-medium">
            {artist.name}
          </div>
        ))
      )}
    </div>
  )
}