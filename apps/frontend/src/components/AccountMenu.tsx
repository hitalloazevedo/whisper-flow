import { useRef } from 'react'
import { LogOut } from 'lucide-react'
import { useDismissibleLayer } from '../hooks/useDismissibleLayer'

type AccountMenuProps = {
  open: boolean
  onToggle: () => void
  onDismiss: () => void
  onSignOut: () => void
}

export function AccountMenu({ open, onToggle, onDismiss, onSignOut }: AccountMenuProps) {
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
        HA
      </button>
      {open && (
        <div className="account-menu" role="menu">
          <div className="account-menu-profile">
            <span className="menu-avatar">HA</span>
            <div>
              <strong>Hitallo Azevedo</strong>
              <span>Personal workspace</span>
            </div>
          </div>
          <div className="menu-divider" />
          <button className="sign-out-button" role="menuitem" onClick={onSignOut}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
