// example page to test the supabase client
'use client'

import { useEffect, useState } from 'react'
import supabase from '@/lib/supabaseClient'

export default function Artists() {
  type Artist = { id: string | number; name: string }
  const [artists, setArtists] = useState<Artist[]>([])

  useEffect(() => { // useEffect to get the data from the database of type artist
    async function getData() {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('type', 'artist')

      if (error) console.error(error)
      else setArtists((data ?? []) as Artist[])
    }

    getData()
  }, [])

  return ( // return the data
    <div className='flex flex-col items-center justify-center mt-64' >
      {artists.map((a) => (
        <div key={a.id} className=''>{a.name}</div>
      ))}
    </div>
  )
}
