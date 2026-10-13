import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { api } from '../services/api'

const LEVELS = [
    { name: 'Nyantai',                 emoji: '😴', color: '#16a34a', bg: '#f0fdf4', border: '#22c55e', badge: '#dcfce7', txt: '#14532d', anim: 'bob' },
    { name: 'Mode Hemat Energi',       emoji: '🧘', color: '#2563eb', bg: '#eff6ff', border: '#3b82f6', badge: '#dbeafe', txt: '#1e3a8a', anim: 'breathe' },
    { name: 'Sibuk',                   emoji: '💼', color: '#d97706', bg: '#fffbeb', border: '#f59e0b', badge: '#fef3c7', txt: '#78350f', anim: 'wiggle' },
    { name: 'Sibuk Banget',            emoji: '🏃', color: '#ea580c', bg: '#fff7ed', border: '#f97316', badge: '#ffedd5', txt: '#7c2d12', anim: 'run' },
    { name: 'Vertigo',                 emoji: '😵‍💫', color: '#db2777', bg: '#fdf2f8', border: '#ec4899', badge: '#fce7f3', txt: '#831843', anim: 'spin' },
    { name: 'Asam lambung mulai naik', emoji: '🤢', color: '#dc2626', bg: '#fef2f2', border: '#ef4444', badge: '#fee2e2', txt: '#7f1d1d', anim: 'shake' },
    { name: 'Bentar lagi tipes',       emoji: '🤒', color: '#9f1239', bg: '#fff1f2', border: '#e11d48', badge: '#ffe4e6', txt: '#4c0519', anim: 'collapse' },
]

function getLevel(n) {
    if (n === 0) return 0
    if (n === 1) return 1
    if (n === 2) return 2
    if (n === 3) return 3
    if (n === 4) return 4
    if (n === 5) return 5
    return 6
}

const ANIM_STYLES = `
@keyframes pj-bob      { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-10px) rotate(3deg)} }
@keyframes pj-breathe  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
@keyframes pj-wiggle   { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-10deg)} 75%{transform:rotate(10deg)} }
@keyframes pj-run      { 0%,100%{transform:translateX(0) scaleX(1)} 30%{transform:translateX(-6px) scaleX(.9)} 70%{transform:translateX(6px) scaleX(1.1)} }
@keyframes pj-spin     { 0%{transform:rotate(0deg) scale(1)} 50%{transform:rotate(20deg) scale(1.1)} 100%{transform:rotate(0deg) scale(1)} }
@keyframes pj-shake    { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-4px,3px)} 40%{transform:translate(4px,-3px)} 60%{transform:translate(-3px,4px)} 80%{transform:translate(3px,-2px)} }
@keyframes pj-collapse { 0%,100%{transform:rotate(0deg) translateY(0)} 25%{transform:rotate(-15deg) translateY(-4px)} 75%{transform:rotate(8deg) translateY(2px)} }
.pj-bob      { animation: pj-bob      3s ease-in-out infinite; }
.pj-breathe  { animation: pj-breathe  4s ease-in-out infinite; }
.pj-wiggle   { animation: pj-wiggle   0.6s ease-in-out infinite; }
.pj-run      { animation: pj-run      0.5s ease-in-out infinite; }
.pj-spin     { animation: pj-spin     1.2s ease-in-out infinite; }
.pj-shake    { animation: pj-shake    0.4s ease-in-out infinite; }
.pj-collapse { animation: pj-collapse 1.8s ease-in-out infinite; }
`

const STATUS_LABEL = {
    active:   { label: 'Dikerjakan',      color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
    review:   { label: 'Menunggu Review', color: '#b45309', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' },
    revision: { label: 'Revisi',          color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
}

function PjDetailModal({ pj, lvl, onClose, navigate }) {
    const { projects } = useApp()

    // Kumpulkan semua tahapan aktif/review/revision milik PJ ini
    const activeStages = []
    ;(projects || []).forEach(proj => {
        if (proj.status === 'archived') return
        ;(proj.stages || []).forEach(stage => {
            const isAssigned = stage.pjId === pj.id ||
                stage.coPjId === pj.id ||
                (stage.coPjIds && Array.isArray(stage.coPjIds) && stage.coPjIds.includes(pj.id));
            if (
                isAssigned &&
                ['active', 'review', 'revision'].includes(stage.status)
            ) {
                const isCollaborator = stage.pjId !== pj.id;
                activeStages.push({
                    ...stage,
                    label: isCollaborator ? `${stage.label} (Kolaborasi)` : stage.label,
                    projectTitle: proj.title,
                    projectId: proj.id
                })
            }
        })
    })

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1.25rem',
                backdropFilter: 'blur(8px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    width: '100%', maxWidth: '540px', maxHeight: '85vh',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.05)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    position: 'relative',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '46px', height: '46px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                        {lvl.emoji}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a', margin: 0, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {pj.name}
                            </h3>
                            <span style={{
                                background: lvl.badge,
                                color: lvl.txt,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: `1px solid ${lvl.border}40`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}>
                                {lvl.name}
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0, marginTop: '3px', fontWeight: 500 }}>
                            {pj.stageCount} tahapan • {pj.projectCount} proyek aktif
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: '32px', height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#64748b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '14px',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1, background: '#fafafa' }}>
                    {activeStages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: 0 }}>
                                Tidak ada tahapan aktif
                            </p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0' }}>
                                Personil ini sedang bebas dari beban tugas aktif.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '10px' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                        Daftar Tahapan Aktif
                                    </h4>
                                </div>
                                <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                    {activeStages.length} Tahapan
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {activeStages.map(stage => {
                                    const st = STATUS_LABEL[stage.status] || { label: stage.status, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', dot: '#94a3b8' }
                                    return (
                                        <div
                                            key={stage.id}
                                            onClick={() => { navigate(`/admin/manajemen/proyek/${stage.projectId}`); onClose() }}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: '1px solid #e2e8f0',
                                                background: '#ffffff',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = '#3b82f6'
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.1)'
                                                e.currentTarget.style.transform = 'translateY(-1px)'
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = '#e2e8f0'
                                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'
                                                e.currentTarget.style.transform = 'translateY(0)'
                                            }}
                                        >
                                            {/* Project Icon */}
                                            <div style={{
                                                width: '36px', height: '36px',
                                                borderRadius: '10px',
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                                border: '1px solid #dbeafe',
                                            }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />
                                                </svg>
                                            </div>

                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                                                    {stage.projectTitle}
                                                </p>
                                                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ color: '#94a3b8' }}>•</span> {stage.label}
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <span style={{
                                                fontSize: '11px', fontWeight: 700,
                                                background: st.bg, color: st.color,
                                                border: `1px solid ${st.border}`,
                                                padding: '4px 10px', borderRadius: '20px',
                                                whiteSpace: 'nowrap', flexShrink: 0,
                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />
                                                {st.label}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '8px 20px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#334155',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1' }}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function PjBusynessWidget() {
    const { currentUser } = useApp()
    const navigate = useNavigate()
    const [pjWorkload, setPjWorkload] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPj, setSelectedPj] = useState(null)

    const fetchWorkload = async () => {
        try {
            const data = await api.rankings.getWorkload()
            if (Array.isArray(data)) {
                const formatted = data
                    .filter(pj => pj.stageCount > 0) // Hide PJs with no active stages
                    .map(pj => ({
                        ...pj,
                        levelIdx: getLevel(pj.stageCount)
                    })).sort((a, b) => b.stageCount - a.stageCount)
                setPjWorkload(formatted)
            }
        } catch (e) {
            console.error('[PjBusynessWidget] Gagal fetch data kesibukan:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchWorkload()
        const interval = setInterval(fetchWorkload, 10000) // Poll tiap 10 detik
        return () => clearInterval(interval)
    }, [])

    if (loading && !pjWorkload.length) {
        return (
            <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(226,232,240,0.6)', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                Memuat status kesibukan tim...
            </div>
        )
    }

    if (!pjWorkload.length) return null

    return (
        <>
            <style>{ANIM_STYLES}</style>
            <section style={{ background: 'white', borderRadius: '0.75rem', padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid rgba(226,232,240,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '12px' }}>
                    <h2 style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', margin: 0 }}>Status Kesibukan Tim</h2>
                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Klik kartu untuk melihat detail tahapan aktif</p>
                  </div>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 700 }}>
                    {pjWorkload.length} Personil
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.875rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {pjWorkload.map(pj => {
                        const lvl = LEVELS[pj.levelIdx]
                        const isMe = pj.id === currentUser?.id
                        return (
                            <div
                              key={pj.id}
                              onClick={() => setSelectedPj(pj)}
                              style={{
                                background: 'white',
                                borderRadius: '12px',
                                borderLeft: `4px solid ${lvl.border}`,
                                padding: '12px 14px',
                                minWidth: '200px',
                                maxWidth: '220px',
                                flexShrink: 0,
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)' }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px', lineHeight: 1 }}>{lvl.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {isMe ? `👤 ${pj.name}` : pj.name}
                                  </p>
                                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {pj.stageCount} tahapan • {pj.projectCount} proyek
                                  </p>
                                </div>
                              </div>
                              <div style={{
                                display: 'inline-flex', alignItems: 'center',
                                background: lvl.badge,
                                color: lvl.txt,
                                borderRadius: '20px',
                                padding: '2px 10px',
                                fontSize: '10px',
                                fontWeight: 700,
                                alignSelf: 'flex-start',
                              }}>
                                {lvl.name}
                              </div>
                            </div>

                        )
                    })}
                </div>
            </section>

            {/* Modal Detail */}
            {selectedPj && (
                <PjDetailModal
                    pj={selectedPj}
                    lvl={LEVELS[selectedPj.levelIdx]}
                    onClose={() => setSelectedPj(null)}
                    navigate={navigate}
                />
            )}
        </>
    )
}
