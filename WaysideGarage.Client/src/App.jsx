import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Layout from './components/Layout/Layout';
import POSPage from './pages/POS/POSPage';
import ReturnsPage from './pages/Returns/ReturnsPage';
import PurchaseOrdersPage from './pages/PurchaseOrders/PurchaseOrdersPage';

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
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="orders" element={<PurchaseOrdersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
