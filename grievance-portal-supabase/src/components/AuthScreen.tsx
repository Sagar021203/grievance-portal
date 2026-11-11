import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Heart, LockKeyhole, Mail, UserRound } from 'lucide-react'
import deskArt from '../assets/letter-desk.webp'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'

type AuthMode = 'signin' | 'signup'

interface AuthScreenProps {
  client: SupabaseClient<Database>
}

export function AuthScreen({ client }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'department' | 'user'>('department')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError('')
    setNotice('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const cleanUsername = username.trim().toLowerCase()
        if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(cleanUsername)) {
          throw new Error('Choose a username with 3–24 letters, numbers, dots, dashes or underscores.')
        }
        if (displayName.trim().length < 2) {
          throw new Error('Add the name you would like to appear on your case files.')
        }
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: displayName.trim(),
              role,
            },
          },
        })
        if (signUpError) throw signUpError
        if (data.session) {
          setNotice('Your account is on the record. Welcome to the Department of Us.')
        } else {
          setNotice('One last formality: check your inbox and confirm your email, then come back here to sign in.')
          setMode('signin')
        }
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) throw signInError
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The office could not complete that request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <a className="wordmark" href="#top" aria-label="The Department of Us">
          <span className="wordmark-seal"><Heart size={15} strokeWidth={1.8} /></span>
          <span className="wordmark-type"><strong>the department</strong><small>of us</small></span>
        </a>
        <span className="auth-top-note"><span className="live-dot" /> PRIVATE CORRESPONDENCE OFFICE</span>
      </header>

      <div className="auth-layout">
        <section className="auth-form-panel" aria-labelledby="auth-title">
          <div className="auth-form-inner">
            {/* Mobile-only art strip — hidden on tablet/desktop via CSS */}
            <div className="auth-mobile-art" aria-hidden="true">
              <div className="auth-mobile-art-inner">
                <div className="auth-mobile-art-circle" />
                <img src={deskArt} alt="" />
                <div className="auth-mobile-art-stamp">
                  <span>OFFICE</span><strong>OF<br />US</strong><span>STRICTLY LOVELY</span>
                </div>
              </div>
              <p className="auth-mobile-art-caption">Every letter finds its person. ♥</p>
            </div>
            <div className="auth-kicker"><span className="auth-kicker-rule" /> FORM DUS–00 · MEMBER ACCESS</div>
            <h1 id="auth-title">Some things are<br />better <em>said.</em></h1>
            <p className="auth-lede">
              {isSignup
                ? 'First time at the office? Put your name on the register. There are biscuits. Probably.'
                : 'The office is open. Your case files, replies and unreasonable amounts of affection are right where you left them.'}
            </p>

            <div className="auth-mode-switch" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={!isSignup} className={!isSignup ? 'active' : ''} onClick={() => switchMode('signin')}>Sign in</button>
              <button type="button" role="tab" aria-selected={isSignup} className={isSignup ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isSignup && (
                <>
                  <label className="auth-label" htmlFor="auth-display-name">Your name</label>
                  <div className="auth-input-wrap">
                    <UserRound size={17} aria-hidden="true" />
                    <input id="auth-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="The name on the file" autoComplete="name" maxLength={60} required />
                  </div>

                  <label className="auth-label" htmlFor="auth-username">Username</label>
                  <div className="auth-input-wrap">
                    <span className="auth-at">@</span>
                    <input id="auth-username" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/\s/g, ''))} placeholder="your.lovely.handle" autoComplete="username" minLength={3} maxLength={24} required />
                  </div>
                  <label className="auth-label" htmlFor="auth-role">Your designation in this office</label>
                  <div className="auth-select-wrap">
                    <select id="auth-role" value={role} onChange={(event) => setRole(event.target.value as 'department' | 'user')}>
                      <option value="department">The Department</option>
                      <option value="user">The User (Supreme Leader)</option>
                    </select>
                  </div>
                </>
              )}

              <label className="auth-label" htmlFor="auth-email">Email address</label>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </div>

              <label className="auth-label" htmlFor="auth-password">Password</label>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Your secret password'} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} required />
                <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>

              {error && <p className="auth-message auth-error" role="alert">{error}</p>}
              {notice && <p className="auth-message auth-notice" role="status">{notice}</p>}

              <button className="auth-submit" type="submit" disabled={submitting}>
                <span>{submitting ? 'A moment, please…' : isSignup ? 'Join the Department' : 'Enter the office'}</span>
                <ArrowRight size={17} />
              </button>
              <p className="auth-privacy"><Heart size={12} fill="currentColor" /> Because every detail matters.</p>
            </form>

            <div className="auth-bottom-note"><span>PLEASE KEEP YOUR PASSWORD TO YOURSELF.</span><span>THE DEPARTMENT</span></div>
          </div>
        </section>

        <aside className="auth-art-panel" aria-label="A desk prepared for private correspondence">
          <div className="auth-art-topline"><span>THE PRIVATE RECORDS ROOM</span><span>FIG. 02</span></div>
          <div className="auth-art-frame">
            <div className="auth-art-circle" />
            <img src={deskArt} alt="A watercolor correspondence folder with a sealed burgundy envelope, fountain pen and daisies" />
            <div className="auth-art-stamp"><span>OFFICE</span><strong>OF<br />US</strong><span>STRICTLY LOVELY</span></div>
          </div>
          <div className="auth-art-caption">
            <span>Every letter finds its person.</span>
            <Heart size={14} fill="currentColor" />
          </div>
          <div className="auth-art-foot"><span>CONFIDENTIAL · TENDER · OCCASIONALLY DRAMATIC</span><span>MMXXVI</span></div>
        </aside>
      </div>
    </main>
  )
}
