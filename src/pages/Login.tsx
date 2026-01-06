import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'
import { useMockAuth } from '../authConfig'
import './pages.css'

function Login() {
  const { instance } = useMsal()
  const navigate = useNavigate()

  const handleLogin = () => {
    if (useMockAuth) {
      localStorage.setItem('mockUser', JSON.stringify({
        name: 'Demo User',
        username: 'demo@praxis.local'
      }))
      navigate('/')
    } else {
      instance.loginRedirect()
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Praxis Portal</h1>
        <p>Anmelden mit deinem Praxis-Konto {useMockAuth ? '(Demo-Modus)' : '(Azure AD / Entra ID)'}.</p>
        <button className="primary" onClick={handleLogin}>
          Anmelden
        </button>
      </div>
    </div>
  )
}

export default Login
