import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { AddWordsPage } from '../pages/AddWordsPage'
import { DictationPage } from '../pages/DictationPage'
import { HomePage } from '../pages/HomePage'
import { LibraryPage } from '../pages/LibraryPage'
import { ReviewPage } from '../pages/ReviewPage'
import { SettingsPage } from '../pages/SettingsPage'
import { AppStateProvider } from './AppState'

const router = createBrowserRouter([
  {
    element: (
      <AppStateProvider>
        <AppShell />
      </AppStateProvider>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'add', element: <AddWordsPage /> },
      { path: 'dictation', element: <DictationPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
