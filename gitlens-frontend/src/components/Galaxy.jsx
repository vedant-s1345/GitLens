import { useEffect, useRef, useState, useCallback } from 'react'
import { PALETTE } from '../utils/constants.js'

const W = 580, H = 420
const cx = W / 2, cy = H / 2

export default function Galaxy({ contributors, edges }) {
  const canvasRef = useRef()
  const animRef   = useRef()
  const nodesRef  = useRef([])
  const [info, setInfo] = useState(null)

  const maxC = Math.max(...contributors.map(c => c.commits), 1)
  const maxE = Math.max(...edges.map(e => e.strength), 1)

  useEffect(() => {
    if (!contributors.length) return

    nodesRef.current = contributors.map((c, i) => {
      const angle = i === 0 ? 0 : ((i - 1) / (contributors.length - 1)) * Math.PI * 2 - Math.PI / 2
      const ring  = i === 0 ? 0 : i < 3 ? 130 : i < 6 ? 195 : 240
      return {
        ...c,
        x:    i === 0 ? cx : cx + Math.cos(angle) * ring,
        y:    i === 0 ? cy : cy + Math.sin(angle) * ring,
        r:    14 + (c.commits / maxC) * 22,
        t:    i === 0 ? 0 : angle,
        ring,
        speed: ring > 0 ? (0.0018 + i * 0.0003) * (i % 2 ? -1 : 1) : 0,
        pulse: Math.random() * Math.PI * 2,
      }
    })

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let frame    = 0

    const draw = () => {
      ctx.clearRect(0, 0, W, H)

      // Central glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100)
      cg.addColorStop(0, 'rgba(99,102,241,0.2)')
      cg.addColorStop(0.5, 'rgba(139,92,246,0.07)')
      cg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cg
      ctx.fillRect(0, 0, W, H)

      // Orbit rings
      ;[130, 195, 240].forEach(r => {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 10]); ctx.stroke(); ctx.setLineDash([])
      })

      // Update positions
      nodesRef.current.forEach(n => {
        if (n.ring > 0) { n.t += n.speed; n.x = cx + Math.cos(n.t) * n.ring; n.y = cy + Math.sin(n.t) * n.ring }
      })

      // Edges
      edges.forEach(e => {
        const a = nodesRef.current.find(n => n.login === e.from)
        const b = nodesRef.current.find(n => n.login === e.to)
        if (!a || !b) return
        const str = e.strength / maxE
        const mx_ = (a.x + b.x) / 2 + (a.y - b.y) * 0.22 * (str > 0.5 ? 1 : -1)
        const my_ = (a.y + b.y) / 2 + (b.x - a.x) * 0.22 * (str > 0.5 ? 1 : -1)

        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx_, my_, b.x, b.y)
        ctx.strokeStyle = `rgba(168,85,247,${0.07 + str * 0.4})`
        ctx.lineWidth = 0.5 + str * 3; ctx.stroke()

        // Animated particle
        const pt = ((frame * 0.007 + (e.strength * 23 % 100) / 100) % 1)
        const px = a.x * (1 - pt) ** 2 + mx_ * 2 * pt * (1 - pt) + b.x * pt * pt
        const py = a.y * (1 - pt) ** 2 + my_ * 2 * pt * (1 - pt) + b.y * pt * pt
        const pg = ctx.createRadialGradient(px, py, 0, px, py, 7)
        pg.addColorStop(0, a.color + '88'); pg.addColorStop(1, 'transparent')
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fillStyle = a.color; ctx.fill()
      })

      // Nodes
      nodesRef.current.forEach(n => {
        const pulse = Math.sin(frame * 0.045 + n.pulse) * 0.1 + 1
        const r = n.r * pulse

        // Atmosphere
        const atmo = ctx.createRadialGradient(n.x, n.y, r * 0.4, n.x, n.y, r * 3.2)
        atmo.addColorStop(0, n.color + '2a'); atmo.addColorStop(1, 'transparent')
        ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.2, 0, Math.PI * 2); ctx.fill()

        // Ring
        ctx.beginPath(); ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2)
        ctx.strokeStyle = n.color + '44'; ctx.lineWidth = 2; ctx.stroke()

        // Body
        const ng = ctx.createRadialGradient(n.x - r * 0.35, n.y - r * 0.35, 0, n.x, n.y, r)
        ng.addColorStop(0, n.color + 'ff'); ng.addColorStop(0.6, n.color + 'dd'); ng.addColorStop(1, n.color + '88')
        ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill()

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.font = `bold ${Math.max(9, r * 0.58)}px 'JetBrains Mono',monospace`
        ctx.fillText((n.login || '?')[0].toUpperCase(), n.x, n.y)

        ctx.font = `${10 + (n.commits / maxC) * 2}px 'JetBrains Mono',monospace`
        ctx.fillStyle = n.color + 'ee'; ctx.fillText(n.login, n.x, n.y + r + 13)

        ctx.font = "8px 'JetBrains Mono',monospace"; ctx.fillStyle = '#334155'
        ctx.fillText(`${n.commits}c`, n.x, n.y + r + 24)
      })

      frame++
      animRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [contributors, edges])

  const handleClick = useCallback(e => {
    const rect = canvasRef.current.getBoundingClientRect()
    const mx   = (e.clientX - rect.left) * (W / rect.width)
    const my   = (e.clientY - rect.top)  * (H / rect.height)
    setInfo(nodesRef.current.find(n => Math.hypot(n.x - mx, n.y - my) <= n.r + 8) || null)
  }, [])

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <canvas
        ref={canvasRef} width={W} height={H}
        onClick={handleClick}
        style={{ borderRadius: 16, maxWidth: '100%', cursor: 'crosshair', border: '1px solid rgba(255,255,255,0.06)' }}
      />

      <div style={{ flex: 1, minWidth: 170 }}>
        {info ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${info.color}44`, borderRadius: 14, padding: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: info.color + '22', border: `2px solid ${info.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: info.color, marginBottom: 12 }}>
              {info.login[0].toUpperCase()}
            </div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>{info.login}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>{info.commits} commits</div>
            <div style={{ marginTop: 14 }}>
              <div style={{ color: '#334155', fontSize: 11, fontFamily: "'JetBrains Mono',monospace", marginBottom: 8 }}>Collaborates with:</div>
              {edges.filter(e => e.from === info.login || e.to === info.login).slice(0, 5).map(e => {
                const partner = e.from === info.login ? e.to : e.from
                const pi = contributors.findIndex(c => c.login === partner)
                return (
                  <div key={partner} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: pi >= 0 ? contributors[pi].color : PALETTE[0] }}/>
                    <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono',monospace" }}>{partner}</span>
                    <span style={{ fontSize: 10, color: '#6366f1', marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace" }}>{e.strength}×</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
            <div style={{ color: '#475569', fontSize: 12, fontFamily: "'JetBrains Mono',monospace", marginBottom: 14 }}>Click any node to inspect</div>
            {contributors.slice(0, 7).map((c, i) => (
              <div key={c.login} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: "'JetBrains Mono',monospace", flex: 1 }}>{c.login}</span>
                <span style={{ fontSize: 11, color: '#334155', fontFamily: "'JetBrains Mono',monospace" }}>{c.commits}c</span>
              </div>
            ))}
            <div style={{ marginTop: 14, color: '#1e293b', fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
              Node size = commit count<br/>
              Arc thickness = collaboration<br/>
              Particles = active handoffs
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
