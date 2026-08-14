import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import RealApp from './RealApp.tsx'
import { isSupabaseConfigured } from './services/supabaseClient'

// When Supabase credentials are configured (see .env.example), the real, persisted,
// multi-course experience replaces the demo/mock prototype.
const Root = isSupabaseConfigured ? RealApp : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
