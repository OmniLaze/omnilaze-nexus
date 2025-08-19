import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
import { NavUser } from '@/components/layout/nav-user'
import { TeamSwitcher } from '@/components/layout/team-switcher'
import { sidebarData } from './data/sidebar-data'
import type { SidebarData } from './types'
import { Command } from 'lucide-react'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const minimal = (import.meta as any).env?.VITE_MINIMAL_NAV !== 'false'
  let data: SidebarData = sidebarData
  if (minimal) {
    data = {
      user: sidebarData.user,
      teams: [
        { name: 'OmniLaze Admin', logo: Command, plan: 'Admin' },
      ],
      navGroups: [
        {
          title: 'Admin',
          items: [
            { title: 'Orders', url: '/orders' },
            { title: 'Users', url: '/users' },
            { title: 'Invite Codes', url: '/invite-codes' },
            { title: 'DevOps', url: '/devops' },
          ],
        },
      ],
    }
  }
  return (
    <Sidebar collapsible='icon' variant='floating' {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        {data.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
