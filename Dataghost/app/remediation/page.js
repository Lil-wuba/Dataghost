'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'
import Confetti from '@/app/components/Confetti'

export default function Remediation() {
  const router = useRouter()
  const darkMode = useTheme()
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [steps, setSteps] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [vulns, setVulns] = useState([])
  const [toast, setToast] = useState('')
  const [selectedVulnId, setSelectedVulnId] = useState('')
  const [priority, setPriority] = useState('medium')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [addingStep, setAddingStep] = useState(false)
  const [newStepDesc, setNewStepDesc] = useState('')
  const [newStepCmd, setNewStepCmd] = useState('')
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [deletingPlanId, setDeletingPlanId] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadPlans() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data } = await supabase.from('remediation_plans').select('*, vulnerabilities(title)').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setPlans(data || [])
    const { data: vData } = await supabase.from('vulnerabilities').select('id, title').eq('user_id', session.user.id)
    setVulns(vData || [])
  }

  async function loadPlan(planId) {
    const { data, error } = await supabase.from('remediation_plans').select('*, vulnerabilities(*), remediation_steps(*)').eq('id', planId).single()
    if (error) { showToast('Error loading plan'); return }
    setSelectedPlan(data)
    setSteps((data.remediation_steps || []).sort((a, b) => a.step_order - b.step_order))
    setSidePanelOpen(true)
  }

  async function verifyStep(stepId, verified) {
    const { error } = await supabase.from('remediation_steps').update({ verified, verified_at: verified ? new Date().toISOString() : null }).eq('id', stepId)
    if (error) showToast('Error updating step')
    else { setSteps(prev => prev.map(s => s.id === stepId ? { ...s, verified } : s)); showToast('✅ Step updated!') }
  }

  async function verifyPlan() {
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('remediation_plans').update({ status: 'verified', updated_at: new Date().toISOString() }).eq('id', selectedPlan.id)
    if (error) showToast('Error verifying plan')
    else {
      setShowConfetti(true)
      showToast('🎉 Plan verified!')
      loadPlans()
      setSidePanelOpen(false)
      setSelectedPlan(null)
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'remediation.plan_verified', entity_type: 'remediation_plan', entity_id: selectedPlan.id, details: { plan_id: selectedPlan.id } }])
    }
  }

  async function deletePlan(planId) {
    if (!confirm('Delete this remediation plan? This cannot be undone.')) return
    setDeletingPlanId(planId)
    await supabase.from('remediation_steps').delete().eq('plan_id', planId)
    const { error } = await supabase.from('remediation_plans').delete().eq('id', planId)
    setDeletingPlanId(null)
    if (error) showToast('Error deleting plan')
    else {
      showToast('🗑️ Plan deleted')
      if (selectedPlan?.id === planId) { setSelectedPlan(null); setSidePanelOpen(false) }
      loadPlans()
    }
  }

  async function addCustomStep() {
    if (!newStepDesc.trim()) { showToast('❌ Step description required'); return }
    const nextOrder = steps.length + 1
    const { data, error } = await supabase.from('remediation_steps').insert([{
      plan_id: selectedPlan.id,
      step_order: nextOrder,
      description: newStepDesc,
      command_hint: newStepCmd || null,
      verified: false
    }]).select().single()
    if (error) { showToast('Error adding step'); return }
    setSteps(prev => [...prev, data])
    setNewStepDesc(''); setNewStepCmd(''); setAddingStep(false)
    showToast('✅ Step added!')
  }

  async function deleteStep(stepId) {
    const { error } = await supabase.from('remediation_steps').delete().eq('id', stepId)
    if (error) showToast('Error deleting step')
    else { setSteps(prev => prev.filter(s => s.id !== stepId)); showToast('🗑️ Step removed') }
  }

  async function handleCreatePlan(e) {
    e.preventDefault()
    if (!selectedVulnId) { showToast('❌ Please select a vulnerability!'); return }
    if (!estimatedHours) { showToast('❌ Please enter estimated hours!'); return }
    const { data: { session } } = await supabase.auth.getSession()
    try {
      const insertData = {
        vulnerability_id: selectedVulnId,
        priority,
        estimated_hours: parseInt(estimatedHours),
        user_id: session.user.id,
        status: 'pending',
        notes: notes || null,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
      }
      const { data: newPlan, error } = await supabase.from('remediation_plans').insert([insertData]).select().single()
      if (error) { showToast('Error: ' + error.message); return }
      await supabase.from('remediation_steps').insert([
        { plan_id: newPlan.id, step_order: 1, description: 'Identify affected systems and scope', command_hint: 'nmap -sV --script=vuln target' },
        { plan_id: newPlan.id, step_order: 2, description: 'Apply patch or configuration fix', command_hint: 'apt-get update && apt-get upgrade -y' },
        { plan_id: newPlan.id, step_order: 3, description: 'Verify fix with rescan and test', command_hint: 'nmap --script vuln target' }
      ])
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'remediation.plan_created', entity_type: 'remediation_plan', entity_id: newPlan.id, details: { priority, vulnerability_id: selectedVulnId } }])
      setShowModal(false)
      setSelectedVulnId(''); setPriority('medium'); setEstimatedHours(''); setNotes(''); setDueDate(''); setAssignedTo('')
      loadPlans(); showToast('✅ Plan created!')
    } catch (err) { showToast('Error: ' + err.message) }
  }

  useEffect(() => { loadPlans() }, [])

  const verifiedCount = steps.filter(s => s.verified).length
  const progress = steps.length > 0 ? (verifiedCount / steps.length) * 100 : 0

  const priorityConfig = {
    immediate: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    medium: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
    low: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  }

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${border}`, borderRadius: '10px',
    color: textMain, fontFamily: 'inherit', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  }

  const PANEL_WIDTH = 340

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <main style={{ marginLeft: '260px', marginRight: sidePanelOpen ? `${PANEL_WIDTH}px` : '0', padding: '1.5rem', transition: 'margin-right 0.3s ease' }}>
        {toast && (
          <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Remediation Plans</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Create and track vulnerability remediation plans.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{ padding: '0.6rem 1.25rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>+ Create Plan</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Plans', value: plans.length, color: '#6366F1' },
            { label: 'Pending', value: plans.filter(p => p.status === 'pending').length, color: '#F59E0B' },
            { label: 'In Progress', value: plans.filter(p => p.status === 'in_progress').length, color: '#EF4444' },
            { label: 'Verified', value: plans.filter(p => p.status === 'verified').length, color: '#10B981' },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem', transition: 'background 0.3s' }}>
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Plans Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {plans.map(plan => {
            const p = priorityConfig[plan.priority] || priorityConfig.medium
            const isSelected = selectedPlan?.id === plan.id
            const isDeleting = deletingPlanId === plan.id
            return (
              <div key={plan.id} style={{
                background: isSelected ? (darkMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)') : cardBg,
                border: `1px solid ${isSelected ? '#10B981' : border}`,
                borderRadius: '14px', padding: '1.5rem', cursor: 'pointer',
                transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                opacity: isDeleting ? 0.5 : 1,
              }}
                onClick={() => loadPlan(plan.id)}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(16,185,129,0.15)' } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' } }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${p.color}, transparent)` }} />

                {/* Delete button */}
                <button onClick={e => { e.stopPropagation(); deletePlan(plan.id) }}
                  style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: '26px', height: '26px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', zIndex: 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  ref={el => { if (el) { el.closest('[data-card]')?.addEventListener('mouseenter', () => el.style.opacity = '1'); el.closest('[data-card]')?.addEventListener('mouseleave', () => el.style.opacity = '0') } }}
                >🗑️</button>

                <h3 style={{ color: textMain, margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: '600', lineHeight: 1.4, paddingRight: '2rem' }}>{plan.vulnerabilities?.title || 'Unknown Vulnerability'}</h3>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', background: p.bg, color: p.color, fontWeight: '700', textTransform: 'uppercase' }}>{plan.priority}</span>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: textMuted }}>{plan.status}</span>
                  {plan.status === 'verified' && <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: '700' }}>✅ Done</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <p style={{ color: textMuted, fontSize: '0.8rem', margin: 0 }}>⏱️ {plan.estimated_hours}h estimated</p>
                  {plan.due_date && <p style={{ color: new Date(plan.due_date) < new Date() ? '#EF4444' : textMuted, fontSize: '0.8rem', margin: 0 }}>📅 Due: {new Date(plan.due_date).toLocaleDateString()}</p>}
                  {plan.assigned_to && <p style={{ color: textMuted, fontSize: '0.8rem', margin: 0 }}>👤 {plan.assigned_to}</p>}
                </div>
              </div>
            )
          })}
          {plans.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: textMuted }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
              <p style={{ margin: 0, fontWeight: '600', color: textMain, fontSize: '1.1rem' }}>No plans yet</p>
              <p style={{ margin: '0.5rem 0 1.5rem', fontSize: '0.875rem' }}>Create your first remediation plan to start fixing vulnerabilities.</p>
              <button onClick={() => setShowModal(true)} style={{ padding: '0.6rem 1.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>+ Create Plan</button>
            </div>
          )}
        </div>
      </main>

      {/* Side Panel - fixed, doesn't overlap */}
      {sidePanelOpen && selectedPlan && (
        <div style={{
          position: 'fixed', right: 0, top: 0,
          width: `${PANEL_WIDTH}px`, height: '100vh',
          background: darkMode ? 'rgba(13,13,20,0.98)' : 'rgba(255,255,255,0.98)',
          borderLeft: `1px solid ${border}`,
          padding: '1.25rem',
          overflowY: 'auto',
          zIndex: 900,
          backdropFilter: 'blur(20px)',
          transition: 'background 0.3s',
          boxShadow: '-4px 0 30px rgba(0,0,0,0.2)',
        }}>
          {/* Panel Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#10B981', fontSize: '0.65rem', letterSpacing: '0.1em', margin: '0 0 0.25rem', textTransform: 'uppercase', fontWeight: '700' }}>Plan Details</p>
              <h2 style={{ color: textMain, margin: 0, fontSize: '0.95rem', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{selectedPlan.vulnerabilities?.title}</h2>
            </div>
            <button onClick={() => { setSidePanelOpen(false); setSelectedPlan(null) }} style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, color: textMuted, borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0, marginLeft: '0.75rem' }}>✕</button>
          </div>

          {/* Meta info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Priority', value: selectedPlan.priority, color: (priorityConfig[selectedPlan.priority] || priorityConfig.medium).color },
              { label: 'Status', value: selectedPlan.status, color: selectedPlan.status === 'verified' ? '#10B981' : textMuted },
              { label: 'Hours', value: `${selectedPlan.estimated_hours}h`, color: textMain },
              { label: 'Due', value: selectedPlan.due_date ? new Date(selectedPlan.due_date).toLocaleDateString() : 'Not set', color: selectedPlan.due_date && new Date(selectedPlan.due_date) < new Date() ? '#EF4444' : textMuted },
            ].map((item, i) => (
              <div key={i} style={{ background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.6rem' }}>
                <p style={{ margin: '0 0 0.2rem', color: textMuted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
                <p style={{ margin: 0, color: item.color, fontSize: '0.8rem', fontWeight: '600', textTransform: 'capitalize' }}>{item.value}</p>
              </div>
            ))}
          </div>

          {selectedPlan.assigned_to && (
            <div style={{ marginBottom: '1rem', padding: '0.6rem 0.75rem', background: darkMode ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)', border: `1px solid rgba(99,102,241,0.2)`, borderRadius: '8px' }}>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>👤 Assigned to <strong style={{ color: '#6366F1' }}>{selectedPlan.assigned_to}</strong></p>
            </div>
          )}

          {selectedPlan.notes && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px' }}>
              <p style={{ margin: '0 0 0.25rem', color: textMuted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</p>
              <p style={{ margin: 0, color: textMain, fontSize: '0.8rem', lineHeight: 1.5 }}>{selectedPlan.notes}</p>
            </div>
          )}

          {/* Progress Bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: textMuted, fontSize: '0.75rem' }}>Progress</span>
              <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: '600' }}>{verifiedCount}/{steps.length} steps</span>
            </div>
            <div style={{ height: '8px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '4px', width: `${progress}%`, background: progress === 100 ? '#10B981' : 'linear-gradient(90deg, #6366F1, #10B981)', transition: 'width 0.4s ease', boxShadow: progress === 100 ? '0 0 8px rgba(16,185,129,0.5)' : 'none' }} />
            </div>
            <p style={{ margin: '0.4rem 0 0', color: textMuted, fontSize: '0.7rem', textAlign: 'right' }}>{Math.round(progress)}% complete</p>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Steps</p>
              <button onClick={() => setAddingStep(!addingStep)} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', padding: '0' }}>
                {addingStep ? '✕ Cancel' : '+ Add Step'}
              </button>
            </div>

            {addingStep && (
              <div style={{ background: darkMode ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)', border: `1px solid rgba(16,185,129,0.2)`, borderRadius: '10px', padding: '0.875rem', marginBottom: '0.5rem' }}>
                <input placeholder="Step description..." value={newStepDesc} onChange={e => setNewStepDesc(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
                  onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                <input placeholder="Command hint (optional)" value={newStepCmd} onChange={e => setNewStepCmd(e.target.value)}
                  style={{ ...inputStyle, marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }}
                  onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                <button onClick={addCustomStep} style={{ width: '100%', padding: '0.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Add Step</button>
              </div>
            )}

            {steps.map((step, i) => (
              <div key={step.id} style={{ background: step.verified ? 'rgba(16,185,129,0.05)' : (darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'), border: `1px solid ${step.verified ? 'rgba(16,185,129,0.2)' : border}`, borderRadius: '10px', padding: '0.75rem', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={step.verified} onChange={e => verifyStep(step.id, e.target.checked)} style={{ marginTop: '0.2rem', accentColor: '#10B981', cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#10B981', fontSize: '0.65rem', fontWeight: '700' }}>STEP {i + 1}</span>
                      {step.verified && <span style={{ color: '#10B981', fontSize: '0.65rem' }}>✓ Done</span>}
                    </div>
                    <p style={{ color: step.verified ? textMuted : textMain, margin: 0, fontSize: '0.82rem', textDecoration: step.verified ? 'line-through' : 'none', lineHeight: 1.4 }}>{step.description}</p>
                    {step.command_hint && (
                      <div style={{ marginTop: '0.4rem', padding: '0.3rem 0.6rem', background: darkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.7rem', color: '#10B981', overflowX: 'auto' }}>{step.command_hint}</div>
                    )}
                  </div>
                  <button onClick={() => deleteStep(step.id)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '0.8rem', padding: '0', opacity: 0.5, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseLeave={e => e.currentTarget.style.color = textMuted}
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>

          {/* Verify Button */}
          {progress === 100 && selectedPlan.status !== 'verified' && (
            <button onClick={verifyPlan} style={{ width: '100%', padding: '0.875rem', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.4)', fontSize: '0.95rem', animation: 'pulse 2s infinite' }}>
              🎉 Mark Plan Verified!
            </button>
          )}
          {selectedPlan.status === 'verified' && (
            <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', color: '#10B981', fontWeight: '700', fontSize: '0.9rem' }}>
              ✅ Plan Verified Complete!
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.25rem', fontWeight: '700' }}>Create Remediation Plan</h2>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Set up a plan to fix a vulnerability</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vulnerability *</label>
                <select value={selectedVulnId} onChange={e => setSelectedVulnId(e.target.value)} style={inputStyle}>
                  <option value="">-- Choose a vulnerability --</option>
                  {vulns.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} style={inputStyle}>
                    <option value="immediate">🔴 Immediate</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est. Hours *</label>
                  <input type="number" placeholder="e.g. 4" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assign To</label>
                  <input type="text" placeholder="Name or team" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
              </div>
              <div>
                <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</label>
                <textarea placeholder="Additional context, references, or instructions..." value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                  onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={handleCreatePlan} style={{ flex: 1, padding: '0.875rem', background: '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', fontSize: '0.9rem' }}>Create Plan</button>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 15px rgba(16,185,129,0.4); }
          50% { box-shadow: 0 4px 25px rgba(16,185,129,0.7); }
        }
        @media (max-width: 768px) {
          main { margin-left: 0 !important; margin-right: 0 !important; }
        }
      `}</style>
    </div>
  )
}