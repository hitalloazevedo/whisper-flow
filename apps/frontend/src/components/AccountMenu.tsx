import { useRef } from 'react'
import { LogOut } from 'lucide-react'
import { useDismissibleLayer } from '../hooks/useDismissibleLayer'
import type { AuthUser } from '../types'

type AccountMenuProps = {
  open: boolean
  onToggle: () => void
  onDismiss: () => void
  onSignOut: () => Promise<void>
  user: AuthUser
  signingOut: boolean
  error: string | null
}

export function AccountMenu({
  open,
  onToggle,
  onDismiss,
  onSignOut,
  user,
  signingOut,
  error,
}: AccountMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  useDismissibleLayer(open, menuRef, onDismiss)

  return (
    <div className="account-menu-wrapper" ref={menuRef}>
      <button
        className="avatar"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
        onClick={onToggle}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" />
        ) : (
          user.displayName.slice(0, 2).toUpperCase()
        )}
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="account-menu-profile">
            <span className="menu-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" />
              ) : (
                user.displayName.slice(0, 2).toUpperCase()
              )}
            </span>
            <div>
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <div className="menu-divider" />
          {error && (
            <p className="account-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="sign-out-button"
            role="menuitem"
            disabled={signingOut}
            onClick={() => void onSignOut()}
          >
            <LogOut size={15} />
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
