import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowDown, ArrowUpRight, ClipboardList, Heart, LogOut, Plus, Search, Sparkles, Wifi, WifiOff } from 'lucide-react'
import postbox from './assets/love-letter-postbox.webp'
import { AuthScreen } from './components/AuthScreen'
import { ComplaintDetailDialog } from './components/ComplaintDetailDialog'
import { NewRantDialog } from './components/NewRantDialog'
import { SetupScreen } from './components/SetupScreen'
import { SuccessDialog } from './components/SuccessDialog'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import type { Profile, ComplaintRecord, ReplyRecord } from './lib/database.types'
import { CATEGORIES, type Category, type Complaint, type NewComplaintInput, type Person } from './types'
import './styles.css'

type Filter = 'All cases' | Category
const filters: Filter[] = ['All cases', ...CATEGORIES]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(date))
}

function statusLabel(status: Complaint['status'], isSender: boolean) {
  if (status === 'awaiting_response') return 'Awaiting response'
  if (status === 'awaiting_acknowledgement') return isSender ? 'Your verdict, please' : 'Awaiting sender verdict'
  return 'Drama concluded'
}

function toPerson(profile: Profile): Person {
  return { id: profile.id, username: profile.username, display_name: profile.display_name, role: profile.role }
}

function AccessDeniedScreen({ onReturn, onSwitchAccount }: { onReturn: () => void; onSwitchAccount: () => void }) {
  return (
    <main className="not-for-you-page">
      <div className="not-for-you-paper">
        <span className="document-label">OFFICE OF US · ACCESS NOTICE</span>
        <img src={postbox} alt="A vintage mailbox overflowing with sealed love letters" />
        <h1>This rant is not meant for you, <em>fortunately.</em></h1>
        <p>This file is addressed to someone else. The Department takes its correspondence very seriously, and its boundaries even more so.</p>
        <button className="submit-button" type="button" onClick={onReturn}>Back to my own affairs <ArrowUpRight size={16} /></button>
        <button className="not-for-you-switch" type="button" onClick={onSwitchAccount}>This is the wrong account? Switch accounts</button>
        <span className="setup-footnote">NO SNOOPING · NO EXCEPTIONS <Heart size={11} /></span>
      </div>
    </main>
  )
}

function App() {
  const client = supabase
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [people, setPeople] = useState<Person[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataError, setDataError] = useState('')
  const [activeFilter, setActiveFilter] = useState<Filter>('All cases')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [successRecipient, setSuccessRecipient] = useState('')
  const [requestedComplaintId, setRequestedComplaintId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('complaint'))
  const [deepLinkHandled, setDeepLinkHandled] = useState(false)
  const [notForYou, setNotForYou] = useState(false)
  // Depend on the stable user ID, not the Session object: Supabase can emit a new
  // Session object after token refresh when a tab regains focus.
  const authenticatedUserId = session?.user.id ?? null

  useEffect(() => {
    if (!client) {
      setAuthLoading(false)
      return
    }
    let active = true
    client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setAuthLoading(false)
      }
    }).catch(() => {
      if (active) setAuthLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      if (!nextSession) {
        setProfile(null)
        setPeople([])
        setComplaints([])
        setDataLoaded(false)
        setSelectedComplaintId(null)
        setNotForYou(false)
        setDeepLinkHandled(false)
      }
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  const refreshData = useCallback(async (showLoader = true) => {
    if (!client || !authenticatedUserId) return
    if (showLoader) setDataLoading(true)
    setDataError('')
    try {
      const [profileResult, peopleResult, complaintResult] = await Promise.all([
        client.from('profiles').select('id, username, display_name, role, created_at').eq('id', authenticatedUserId).maybeSingle(),
        client.from('profiles').select('id, username, display_name, role, created_at').order('display_name', { ascending: true }),
        client.from('complaints').select('*').order('created_at', { ascending: false }),
      ])

      if (profileResult.error) throw profileResult.error
      if (peopleResult.error) throw peopleResult.error
      if (complaintResult.error) throw complaintResult.error
      if (!profileResult.data) {
        throw new Error('Your profile is missing. Run the included database migration, then sign out and back in.')
      }

      const profiles = (peopleResult.data ?? []).map((person) => toPerson(person))
      const rows = (complaintResult.data ?? []) as ComplaintRecord[]
      let replies: ReplyRecord[] = []
      if (rows.length) {
        const replyResult = await client.from('complaint_replies').select('*').in('complaint_id', rows.map((row) => row.id))
        if (replyResult.error) throw replyResult.error
        replies = (replyResult.data ?? []) as ReplyRecord[]
      }

      const peopleById = new Map<string, Person>(profiles.map((person) => [person.id, person] as const))
      const replyByComplaintId = new Map<string, ReplyRecord>(replies.map((reply) => [reply.complaint_id, reply] as const))
      const mapped: Complaint[] = rows.flatMap((row) => {
        const sender = peopleById.get(row.sender_id)
        const recipient = peopleById.get(row.recipient_id)
        if (!sender || !recipient) return []
        return [{
          id: row.id,
          reference: row.reference,
          title: row.title,
          category: row.category,
          body: row.body,
          created_at: row.created_at,
          severity: row.severity,
          status: row.status,
          sender_id: row.sender_id,
          recipient_id: row.recipient_id,
          sender,
          recipient,
          reply: replyByComplaintId.get(row.id) ?? null,
        }]
      })

      setProfile(profileResult.data)
      setPeople(profiles)
      setComplaints(mapped)
      setDataLoaded(true)
    } catch (caught) {
      setDataError(caught instanceof Error ? caught.message : 'The register could not be loaded. Please try again.')
      setDataLoaded(true)
    } finally {
      if (showLoader) setDataLoading(false)
    }
  }, [client, authenticatedUserId])

  useEffect(() => {
    if (!authenticatedUserId) {
      setProfile(null)
      setPeople([])
      setComplaints([])
      setDataLoaded(false)
      setDataLoading(false)
      setDataError('')
      return
    }

    // A different account needs a fresh initial load. A token refresh for the
    // same account does not change authenticatedUserId, so it won't flash the
    // full-screen loader or refetch every case file.
    setProfile(null)
    setPeople([])
    setComplaints([])
    setDataLoaded(false)
    setDataError('')
    void refreshData(true)
  }, [authenticatedUserId, refreshData])

  useEffect(() => {
    if (!client || !session?.user.id || !profile) return
    const channel = client
      .channel(`department-of-us:${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => { void refreshData(false) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaint_replies' }, () => { void refreshData(false) })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [client, session?.user.id, profile?.id, refreshData])

  useEffect(() => {
    if (!session || !profile || dataLoading || !dataLoaded || !requestedComplaintId || deepLinkHandled) return
    const permittedCase = complaints.find((item) => item.id === requestedComplaintId)
    if (permittedCase) setSelectedComplaintId(permittedCase.id)
    else setNotForYou(true)
    setDeepLinkHandled(true)
  }, [session, profile, dataLoading, dataLoaded, complaints, requestedComplaintId, deepLinkHandled])

  const visibleComplaints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return complaints.filter((complaint) => {
      const matchesFilter = activeFilter === 'All cases' || complaint.category === activeFilter
      const matchesSearch = !query || `${complaint.title} ${complaint.body} ${complaint.category} ${complaint.sender.display_name} ${complaint.recipient.display_name}`.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [complaints, activeFilter, searchQuery])

  const openComplaints = visibleComplaints.filter((complaint) => complaint.status !== 'closed')
  const closedComplaints = visibleComplaints.filter((complaint) => complaint.status === 'closed')
  const hasActiveCaseFilter = Boolean(searchQuery.trim()) || activeFilter !== 'All cases'

  const renderComplaintCard = (complaint: Complaint, index: number) => {
    const sentByMe = complaint.sender_id === profile?.id
    return (
      <button className={`complaint-card card-variation-${index % 4}`} key={complaint.id} type="button" onClick={() => setSelectedComplaintId(complaint.id)}>
        <div className="card-topline"><span className="card-reference">{complaint.reference}</span><span className="card-date">{formatDate(complaint.created_at)}</span></div>
        <h3>{complaint.title}</h3>
        <p className="card-excerpt">{complaint.body}</p>
        <div className="card-context"><span>{sentByMe ? `To ${complaint.recipient.display_name}` : `From ${complaint.sender.display_name}`}</span><span className={`status-tag status-${complaint.status.replace(/_/g, '-')}`}>{statusLabel(complaint.status, sentByMe)}</span></div>
        <div className="card-bottomline"><span className="category-tag">{complaint.category}</span><span className="card-open">Open case <ArrowUpRight size={15} /></span></div>
        <span className="card-corner-mark" aria-hidden="true"><Heart size={14} /></span>
      </button>
    )
  }

  const selectedComplaint = complaints.find((complaint) => complaint.id === selectedComplaintId) ?? null

  const submitComplaint = async (input: NewComplaintInput) => {
    if (!client || !profile) throw new Error('Please sign in again before filing a grievance.')
    const target = people.find((person) => person.id === input.recipientId)
    const { error } = await client.from('complaints').insert({
      sender_id: profile.id,
      recipient_id: input.recipientId,
      title: input.title,
      category: input.category,
      body: input.body,
      severity: input.severity,
    })
    if (error) throw error
    setSuccessRecipient(target?.display_name ?? 'your chosen recipient')
    setIsFormOpen(false)
    setActiveFilter('All cases')
    setSearchQuery('')
    await refreshData(false)
    setIsSuccessOpen(true)
  }

  const sendReply = async (complaint: Complaint, body: string) => {
    if (!client || !profile) throw new Error('Please sign in again before replying.')
    const { error } = await client.from('complaint_replies').insert({
      complaint_id: complaint.id,
      responder_id: profile.id,
      body,
    })
    if (error) {
      if (error.code === '23505') throw new Error('An official response has already been filed for this case.')
      throw error
    }
    await refreshData(false)
  }

  const finishDrama = async (complaint: Complaint) => {
    if (!client) throw new Error('The database connection is unavailable.')
    const { error } = await client.rpc('finish_the_drama', { p_complaint_id: complaint.id })
    if (error) throw error
    await refreshData(false)
  }

  const shareOnWhatsApp = (complaint: Complaint) => {
    const shareUrl = new URL(window.location.href)
    shareUrl.search = ''
    shareUrl.hash = ''
    shareUrl.searchParams.set('complaint', complaint.id)
    const message = [
      'An official response has been filed on your private case.',
      '',
      'Open the case file here:',
      shareUrl.toString(),
    ].join('\n')
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const clearRequestedLink = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('complaint')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    setRequestedComplaintId(null)
    setDeepLinkHandled(false)
  }

  const closeDetail = () => {
    setSelectedComplaintId(null)
    if (requestedComplaintId) clearRequestedLink()
  }

  const scrollToRegister = () => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const signOut = async () => { if (client) await client.auth.signOut() }

  if (!isSupabaseConfigured || !client) return <SetupScreen />
  if (authLoading) return <main className="auth-loading"><span className="office-loader" /><p>Opening the records room…</p></main>
  if (!session) return <AuthScreen client={client} />
  if (notForYou) return <AccessDeniedScreen onReturn={() => { setNotForYou(false); clearRequestedLink() }} onSwitchAccount={() => { void client.auth.signOut() }} />
  if (!profile) {
    return (
      <main className="auth-loading">
        <span className="office-loader" />
        <p>{dataError || 'Gathering your case files…'}</p>
        {dataError && <button className="text-action" type="button" onClick={() => void refreshData(true)}>Try again <ArrowUpRight size={15} /></button>}
      </main>
    )
  }

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="The Department of Us home">
          <span className="wordmark-seal"><Heart size={15} strokeWidth={1.8} /></span>
          <span className="wordmark-type"><strong>the department</strong><small>of us</small></span>
        </a>
        <div className="header-side">
          <span className="header-note"><span className="live-dot" /> OPEN 24/7 FOR YOU</span>
          <span className="header-person" title={`Signed in as ${profile.display_name}`}>{profile.display_name} · {profile.role === 'department' ? 'Department' : 'Supreme Overlord'}</span>
          <button className="new-rant-button" type="button" onClick={() => setIsFormOpen(true)}><Plus size={16} strokeWidth={2.2} /><span>New rant</span></button>
          <button className="header-signout" type="button" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 id="hero-title">A little room<br />for <em>big feelings.</em></h1>
              <p className="hero-description">A tiny corner for the Department, the Supreme Leader, and every inconvenience that deserves a little paperwork.</p>
              <div className="hero-actions">
                <button className="hero-primary" type="button" onClick={() => setIsFormOpen(true)}>File a grievance <ArrowUpRight size={17} /></button>
                <button className="hero-secondary" type="button" onClick={scrollToRegister}>Read the register <ArrowDown size={15} /></button>
              </div>
              <div className="hero-signoff"><span className="signoff-line" /> <span>Filed with love, never with judgement.</span></div>
            </div>
            <div className="hero-art" aria-label="Illustration of a burgundy mailbox overflowing with love letters">
              <div className="art-orbit art-orbit-one" />
              <div className="art-orbit art-orbit-two" />
              <div className="art-stamp"><span>THE OFFICE</span><strong>OF<br />US</strong><span>EST. FOREVER</span></div>
              <img src={postbox} alt="A vintage burgundy mailbox overflowing with cream envelopes, hearts and daisies" />
              <div className="art-caption"><span>FIG. 01</span><span>THE COMPLAINTS DEPARTMENT</span></div>
            </div>
          </div>
          <div className="hero-bottom-rule"><span>NO GRIEVANCE TOO SMALL</span><span>LOVE IS IN THE DETAILS <Heart size={12} fill="currentColor" /></span></div>
        </section>

        <section className="register-section" id="register" aria-labelledby="register-title">
          <div className="register-container">
            <div className="register-topline"><span><ClipboardList size={15} /> THE OFFICIAL RECORD</span><span>PRIVATE · ONLY YOUR CASE FILES</span></div>
            <div className="register-heading-row">
              <div>
                <h2 id="register-title">The complaint <em>register.</em></h2>
                <p className="register-subtitle">Every little thing, lovingly documented. Signed in as {profile.display_name}.</p>
              </div>
              <div className="case-count"><strong>{String(complaints.length).padStart(2, '0')}</strong><span>CASES<br />ON RECORD</span></div>
            </div>

            <div className="register-controls">
              <div className="filter-list" aria-label="Filter complaints by category">
                {filters.map((filter) => (
                  <button key={filter} type="button" className={`filter-chip ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter}>{filter}</button>
                ))}
              </div>
              <label className="search-field">
                <Search size={15} />
                <span className="sr-only">Search complaints</span>
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Find a case…" />
              </label>
            </div>

            {dataError && <div className="data-error" role="alert"><WifiOff size={16} /><span>{dataError}</span><button type="button" onClick={() => void refreshData(true)}>Retry</button></div>}
            <div className="case-groups">
              <section className="case-group" aria-labelledby="open-cases-title">
                <div className="case-group-heading">
                  <div className="case-group-heading-copy">
                    <div className="case-group-title-row">
                      <span className="case-group-indicator case-group-indicator-open" aria-hidden="true" />
                      <h3 id="open-cases-title">Still on the desk.</h3>
                    </div>
                    <p>New arrivals and matters awaiting their very important resolution.</p>
                  </div>
                  <div className="case-group-count" aria-label={`${openComplaints.length} open cases`}>
                    <strong>{String(openComplaints.length).padStart(2, '0')}</strong>
                    <span>OPEN FILES</span>
                  </div>
                </div>

                {openComplaints.length > 0 ? (
                  <div className="complaint-grid">
                    {openComplaints.map(renderComplaintCard)}
                  </div>
                ) : (
                  <div className="case-group-empty">
                    <span className="case-empty-rule" />
                    <p>{hasActiveCaseFilter ? 'No open cases match these filters.' : 'Nothing pending on this desk. Enjoy the suspicious peace.'}</p>
                  </div>
                )}
              </section>

              <section className="case-group case-group-closed" aria-labelledby="closed-cases-title">
                <div className="case-group-heading">
                  <div className="case-group-heading-copy">
                    <div className="case-group-title-row">
                      <span className="case-group-indicator case-group-indicator-closed" aria-hidden="true" />
                      <h3 id="closed-cases-title">Filed away.</h3>
                    </div>
                    <p>A little drama, formally acknowledged and put to rest.</p>
                  </div>
                  <div className="case-group-count case-group-count-closed" aria-label={`${closedComplaints.length} resolved cases`}>
                    <strong>{String(closedComplaints.length).padStart(2, '0')}</strong>
                    <span>RESOLVED</span>
                  </div>
                </div>

                {closedComplaints.length > 0 ? (
                  <div className="complaint-grid">
                    {closedComplaints.map(renderComplaintCard)}
                  </div>
                ) : (
                  <div className="case-group-empty case-group-empty-closed">
                    <span className="case-empty-rule" />
                    <p>{hasActiveCaseFilter ? 'No resolved cases match these filters.' : 'No files have made it to the archives just yet.'}</p>
                  </div>
                )}
              </section>
            </div>

            <div className="register-afterword"><Sparkles size={15} /><span>Policy: listen first, defend later, kissi always.</span><span className="realtime-indicator"><Wifi size={13} /> LIVE REGISTER</span></div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-wordmark" href="#top">the department <em>of us.</em></a>
        <span>MADE OF FEELINGS, HELD TOGETHER BY LOVE.</span>
        <span className="footer-heart"><Heart size={14} fill="currentColor" /></span>
      </footer>

      <NewRantDialog open={isFormOpen} people={people} currentUserId={profile.id} onClose={() => setIsFormOpen(false)} onSubmit={submitComplaint} />
      <ComplaintDetailDialog
        complaint={selectedComplaint}
        currentUserId={profile.id}
        onClose={closeDetail}
        onReply={(body) => selectedComplaint ? sendReply(selectedComplaint, body) : Promise.reject(new Error('The case file is no longer open.'))}
        onFinish={() => selectedComplaint ? finishDrama(selectedComplaint) : Promise.reject(new Error('The case file is no longer open.'))}
        onShareWhatsApp={() => { if (selectedComplaint) shareOnWhatsApp(selectedComplaint) }}
      />
      <SuccessDialog open={isSuccessOpen} recipientName={successRecipient} onClose={() => setIsSuccessOpen(false)} onViewRegister={() => { setIsSuccessOpen(false); window.setTimeout(scrollToRegister, 80) }} />
    </>
  )
}

export default App
