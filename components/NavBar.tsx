'use client'

import Link from 'next/link'
import { ModeToggle } from '@/components/Theme'

const navItems = [
  { name: 'Entities', href: '/entities' },
  { name: 'Edges', href: '/edges' },
  { name: 'Scenes', href: '/scenes' },
  // probably some more idk yet  
]

export default function NavBar() {


  return (
    <nav className="  px-6 py-3">
      <ul className="flex items-center justify-center space-x-6">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className=
                'text-sm font-medium  transition'
            
            >
              {item.name}
            </Link>
          </li>
        ))}
             <ModeToggle />

      </ul>
    </nav>
  )
}
