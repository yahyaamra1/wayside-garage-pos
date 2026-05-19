import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Layout from './components/Layout/Layout';
import POSPage from './pages/POS/POSPage';
import ReturnsPage from './pages/Returns/ReturnsPage';
import PurchaseOrdersPage from './pages/PurchaseOrders/PurchaseOrdersPage';
import InventoryPage from './pages/Inventory/InventoryPage';
import CustomersPage from './pages/Customers/CustomersPage';
import ReportsPage from './pages/Reports/ReportsPage';
import UsersPage from './pages/Users/UsersPage';
import EmailQueuePage from './pages/EmailQueue/EmailQueuePage';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('wg_token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/pos" replace />} />
          <Route path="pos" element={<POSPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="orders" element={<PurchaseOrdersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="email-queue" element={<EmailQueuePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
