import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { authService } from './services/authService';
import { useAppDispatch } from './store/hooks';
import { restoreSession } from './store/slices/authSlice';

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(restoreSession(authService.getSession()));
  }, [dispatch]);

  return <AppRoutes />;
}

export default App;
