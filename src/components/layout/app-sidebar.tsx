import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from '@/components/ui/sidebar'
import { NavGroup } from '@/components/layout/nav-group'
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
            { title: 'Orders', url: '/admin/orders' },
            { title: 'Users', url: '/admin/users' },
            { title: 'Invite Codes', url: '/admin/invite-codes' },
            { title: 'Notifications', url: '/admin/notifications' },
            { title: 'DevOps', url: '/admin/devops' },
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
      <SidebarRail />
    </Sidebar>
  )
}
