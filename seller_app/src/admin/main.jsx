import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminPanel from './AdminPanel' // Import the new controller
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminPanel />
  </React.StrictMode>,
)