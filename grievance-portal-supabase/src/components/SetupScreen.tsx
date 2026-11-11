import { ArrowUpRight, Heart, KeyRound } from 'lucide-react'

export function SetupScreen() {
  return (
    <main className="setup-page">
      <a className="wordmark" href="#top" aria-label="The Department of Us">
        <span className="wordmark-seal"><Heart size={15} strokeWidth={1.8} /></span>
        <span className="wordmark-type"><strong>the department</strong><small>of us</small></span>
      </a>
      <section className="setup-paper">
        <div className="auth-kicker"><span className="auth-kicker-rule" /> ONE LAST BIT OF PAPERWORK</div>
        <div className="setup-icon"><KeyRound size={23} /></div>
        <h1>Before we<br /><em>open the office.</em></h1>
        <p>The Supabase address and publishable key have not been added yet. Put your project details in the local environment file and the sign-in desk will be ready.</p>
        <div className="setup-steps">
          <div><span>01</span><p>Copy <code>.env.example</code> to <code>.env.local</code>.</p></div>
          <div><span>02</span><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</p></div>
          <div><span>03</span><p>Run the SQL migration in <strong>Supabase → SQL Editor</strong>, then restart Vite.</p></div>
        </div>
        <a className="setup-link" href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Open Supabase dashboard <ArrowUpRight size={15} /></a>
        <span className="setup-footnote">THE OFFICE IS CLOSED UNTIL THE DATABASE ARRIVES <Heart size={11} /></span>
      </section>
    </main>
  )
}
