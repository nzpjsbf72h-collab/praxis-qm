import { useMsal } from '@azure/msal-react'
import { useNavigate } from 'react-router-dom'
import { useMockAuth } from '../authConfig'
import { useState, useEffect } from 'react'
import './pages.css'

function Dashboard() {
  const { accounts, instance } = useMsal()
  const navigate = useNavigate()
  const [mockUser, setMockUser] = useState<any>(null)

  useEffect(() => {
    if (useMockAuth) {
      const stored = localStorage.getItem('mockUser')
      if (stored) {
        setMockUser(JSON.parse(stored))
      }
    }
  }, [])

  const user = useMockAuth ? mockUser : accounts[0]

  const handleLogout = () => {
    if (useMockAuth) {
      localStorage.removeItem('mockUser')
      navigate('/login')
    } else {
      instance.logoutRedirect()
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Angemeldet</p>
            <h1>{user?.name ?? 'User'}</h1>
            <p className="subtle">{user?.username}</p>
          </div>
          <button className="ghost" onClick={handleLogout}>
            Abmelden
          </button>
        </div>
        <div className="grid">
          <div className="tile">
            <h2>Dokumente</h2>
            <p>Platzhalter für Dokument- und Link-Übersicht.</p>
          </div>
          <div className="tile">
            <h2>Passwörter/Secrets</h2>
            <p>Verweise auf Key Vault oder Passwort-Manager, nicht im UI speichern.</p>
          </div>
          <div className="tile">
            <h2>E-Mail & Tools</h2>
            <p>Deep Links zu OWA/Teams/Line-of-Business Apps.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
