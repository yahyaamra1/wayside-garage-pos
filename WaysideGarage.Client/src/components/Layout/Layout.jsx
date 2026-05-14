import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, RotateCcw, FileText, Users, BarChart2, LogOut } from 'lucide-react';
import './Layout.css';

const NAV = [
  { to: '/pos',       icon: ShoppingCart, label: 'POS Terminal' },
  { to: '/inventory', icon: Package,      label: 'Inventory' },
  { to: '/returns',   icon: RotateCcw,    label: 'Returns' },
  { to: '/orders',    icon: FileText,     label: 'Purchase Orders' },
  { to: '/customers', icon: Users,        label: 'Customers' },
  { to: '/reports',   icon: BarChart2,    label: 'Reports' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('wg_user') ?? '{}');

  function logout() {
    localStorage.removeItem('wg_token');
    localStorage.removeItem('wg_user');
    navigate('/login');
  }

  return (
    <div className="layout">
      <nav className="layout-nav">
        <div className="layout-nav-top">
          <div className="layout-brand">
            <div className="layout-brand-icon" />
            <div>
              <span className="layout-brand-title">WAYSIDE</span>
              <span className="layout-brand-sub">GARAGE</span>
            </div>
          </div>

          <ul className="layout-nav-links">
            {NAV.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) =>
                  'layout-nav-link' + (isActive ? ' active' : '')
                }>
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="layout-nav-bottom">
          <div className="layout-user">
            <span className="layout-user-name">{user.fullName}</span>
            <span className="layout-user-role">{user.role}</span>
          </div>
          <button className="layout-logout" onClick={logout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
