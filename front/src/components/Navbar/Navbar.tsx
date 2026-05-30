// front/src/components/Navbar/Navbar.tsx

import { Link, useLocation } from "react-router-dom";
import { PieChart, BarChart2, PlusCircle, Settings, User, LogOut } from "lucide-react";
import { useAuthStore } from '../../store/authStore';
import { useModal } from "../../hooks/useModal";
import { TransactionForm } from "../TransactionForm/TransactionForm";
import { useMarketSocket } from "../../hooks/useMarketSocket";
import { CircularTtlIndicator } from "../MarketRefreshIndicator/CircularTtlIndicator";
import "./Navbar.css";

export const Navbar = () => {
  const { open, close } = useModal();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  // Подключаем сокет ТОЛЬКО если пользователь авторизован
  // Хук внутри сам проверит isAuthenticated и не создаст соединение без него
  const { nextUpdateAt } = useMarketSocket();

  const navLinks = [
    { href: "/portfolio", label: "Портфель", icon: <PieChart size={20} /> },
    { href: "/analytics", label: "Аналитика", icon: <BarChart2 size={20} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleAddTransaction = () => {
    open(<TransactionForm onClose={close} />);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-desktop">
          <ul className="navbar-links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={`navbar-link ${isActive(link.href) ? "active" : ""}`}
                >
                  {link.icon}
                  <span className="navbar-link-label">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* TTL-индикатор показываем только авторизованным пользователям */}
          {isAuthenticated && (
            <div className="navbar-ttl-wrapper">
              <CircularTtlIndicator nextUpdateAt={nextUpdateAt} />
            </div>
          )}

          <div className="navbar-actions">
            <button className="icon-btn" onClick={handleAddTransaction} aria-label="Добавить транзакцию">
              <PlusCircle size={20} />
            </button>
            <button className="icon-btn" aria-label="Настройки">
              <Settings size={20} />
            </button>
            <button className="icon-btn" aria-label="Профиль">
              <User size={20} />
            </button>
            <button onClick={logout} className="icon-btn" aria-label="Выход">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};