import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Logo } from './Logo'
import { ProfileMenu } from './ProfileMenu'

export function Layout() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label="CampusIQ home">
              <Logo />
            </Link>
            <nav className="flex items-center gap-1" aria-label="Main">
              <NavItem to="/" end>
                Courses
              </NavItem>
              {user.role === 'student' && <NavItem to="/results">My results</NavItem>}
              {user.role === 'admin' && <NavItem to="/admin/users">Users</NavItem>}
            </nav>
          </div>

          <ProfileMenu />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-rule py-6 text-center font-mono text-xs text-ink-soft">
        CampusIQ · online exams
      </footer>
    </div>
  )
}

function NavItem({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
          isActive ? 'bg-ink/5 text-ink' : 'text-ink-soft hover:bg-paper-deep hover:text-ink'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

