import { render } from '@testing-library/react';
import App from './App';

// Mocks for contexts to allow App to render
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({ currentUser: null, loading: false })
}));

jest.mock('./contexts/ProfessionalAuthContext', () => ({
  ProfessionalAuthProvider: ({ children }) => <>{children}</>,
  useProfessionalAuth: () => ({ professionalData: null, loading: false })
}));

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => <div>{element}</div>,
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => jest.fn(),
  Link: ({ children }) => <a>{children}</a>,
  Navigate: () => <div>Navigate</div>
}));

test('renders without crashing', () => {
  render(<App />);
});
