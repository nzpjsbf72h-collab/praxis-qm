import { InteractionType } from '@azure/msal-browser'
import { MsalAuthenticationTemplate } from '@azure/msal-react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.tsx'
import Login from './pages/Login.tsx'
import { useMockAuth } from './authConfig'
import './App.css'

const authRequest = {
  scopes: ['User.Read'],
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (useMockAuth) {
    const mockUser = localStorage.getItem('mockUser')
    if (!mockUser) {
      return <Navigate to="/login" />
    }
    return <>{children}</>
  }
  
  return (
    <MsalAuthenticationTemplate
      interactionType={InteractionType.Redirect}
      authenticationRequest={authRequest}
    >
      {children}
    </MsalAuthenticationTemplate>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
