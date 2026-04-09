import { T, S, BUCKET_COLOR } from "../theme.js";
import { fmt } from "../utils/format.js";
import { BucketAccordion } from "../components/BucketAccordion.jsx";
import { ConvictionDots } from "../components/candidates/ConvictionDots.jsx";
import { RiskBadge } from "../components/candidates/RiskBadge.jsx";
import { CoreCandidateRow } from "../components/candidates/CoreCandidateRow.jsx";
import { SatelliteCandidateRow } from "../components/candidates/SatelliteCandidateRow.jsx";
import { WildshotCandidateRow } from "../components/candidates/WildshotCandidateRow.jsx";

export function TabCandidates({
  analysis,
  desiredInvestment,
  desiredSplit,
  normalizedSplit,
  candidatesByBucket,
  getInvested,
  getCoreTarget,
  getSatTarget,
  getWsTarget,
  tx,
  setTab,
}) {
  return (
    <div>


      <div data-tut="candidates-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ ...S.serif, margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.ink }}>Investment Candidates</p>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>
            {tx.candidatesDesc}
          </p>
        </div>
        {desiredInvestment === 0 && (
          <button
            onClick={() => setTab("proyecto")}
            style={{ ...S.label, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, padding: "8px 14px", borderRadius: 2, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            ↗ Ajusta inversión obj.
          </button>
        )}
      </div>

      {/* Summary pill */}
      {desiredInvestment > 0 && (
        <div style={{ background: T.goldLight, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ ...S.label, color: T.neutral, fontSize: 9 }}>Inversión deseada</span>
          <span style={{ ...S.mono, fontSize: 14, color: T.gold, fontWeight: 500 }}>€{fmt(desiredInvestment)}</span>
          <span style={{ ...S.label, color: T.neutral, fontSize: 9 }}>Split</span>
          <span style={{ ...S.mono, fontSize: 13, color: T.ink }}>{desiredSplit.Core}/{desiredSplit.Satellite}/{desiredSplit.Wildshots}</span>
          {["Core","Satellite","Wildshots"].map(b => (
            <div key={b} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: BUCKET_COLOR[b] }} />
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>{b}</span>
              <span style={{ ...S.mono, fontSize: 11, color: T.ink }}>€{fmt(desiredInvestment * (normalizedSplit[b]||0) / 100)}</span>
            </div>
          ))}
          <button onClick={() => setTab("proyecto")} style={{ ...S.label, fontSize: 9, background: "transparent", color: T.gold, border: `1px solid ${T.goldBorder}`, padding: "3px 10px", borderRadius: 2, cursor: "pointer", marginLeft: "auto" }}>Editar en Inicio</button>
        </div>
      )}

      {Object.keys(analysis).filter(k => !k.startsWith("_")).length === 0 && (
        <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "32px 24px", textAlign: "center", marginBottom: 16 }}>
          <p style={{ ...S.serif, fontSize: 18, color: T.inkMuted, margin: "0 0 8px" }}>Sin datos de análisis</p>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkFaint, margin: "0 0 16px" }}>
            {tx.noCandidatesDesc}
          </p>
          <button onClick={() => setTab("config")} style={{ ...S.label, fontSize: 10, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "8px 16px", cursor: "pointer" }}>
            {tx.goToConfig}
          </button>
        </div>
      )}

      {/* Core */}
      {candidatesByBucket.Core.length > 0 && (
        <BucketAccordion title="Core" accent={T.gold} accentLight={T.goldLight} accentBorder={T.goldBorder} count={candidatesByBucket.Core.filter(s => getInvested(s.ticker) < getCoreTarget(s)).length}>
          {candidatesByBucket.Core.filter(s => getInvested(s.ticker) < getCoreTarget(s)).map(s => (
            <CoreCandidateRow key={s.ticker} s={s} invested={getInvested(s.ticker)} target={getCoreTarget(s)} tx={tx} />
          ))}
        </BucketAccordion>
      )}

      {/* Satellite */}
      {candidatesByBucket.Satellite.length > 0 && (
        <BucketAccordion title="Satellite" accent={T.teal} accentLight={T.tealLight} accentBorder={T.tealBorder} count={candidatesByBucket.Satellite.filter(s => getInvested(s.ticker) < getSatTarget()).length}>
          {candidatesByBucket.Satellite.filter(s => getInvested(s.ticker) < getSatTarget()).map(s => (
            <SatelliteCandidateRow key={s.ticker} s={s} invested={getInvested(s.ticker)} target={getSatTarget()} tx={tx} />
          ))}
        </BucketAccordion>
      )}

      {/* Wildshots */}
      {candidatesByBucket.Wildshots.length > 0 && (
        <BucketAccordion title="Wildshots" accent={T.ink} accentLight={T.bg} accentBorder={T.borderDark} count={candidatesByBucket.Wildshots.filter(s => getInvested(s.ticker) < getWsTarget(s)).length}>
          {candidatesByBucket.Wildshots.filter(s => getInvested(s.ticker) < getWsTarget(s)).map(s => (
            <WildshotCandidateRow key={s.ticker} s={s} invested={getInvested(s.ticker)} target={getWsTarget(s)} tx={tx} />
          ))}
        </BucketAccordion>
      )}

      {/* Legend */}
      {candidatesByBucket.Wildshots.length > 0 && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8, padding: "12px 16px", background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ConvictionDots value={5} />
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>Convicción máx.</span>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <ConvictionDots value={3} />
            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>Convicción media</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Very High","High","Medium-High","Medium"].map(r => <span key={r}><RiskBadge risk={r} /></span>)}
          </div>
        </div>
      )}
    </div>
  );
}
