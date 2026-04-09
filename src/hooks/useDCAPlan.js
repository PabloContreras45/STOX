import { useMemo } from "react";
import { parseRangePct } from "../utils/analysis.js";

export function useDCAPlan({
  positions,
  analysis,
  byBucket,
  normalizedSplit,
  candidatesByBucket,
  dcaBudget,
  DCA_MIN,
  investmentMode,
  totalInvertido,
  desiredInvestment,
}) {
  const portfolioTarget = (investmentMode === "puntual" && totalInvertido > 0)
    ? totalInvertido + (desiredInvestment || 0)
    : (desiredInvestment || 0);

  const coreTargetTotal = portfolioTarget * (normalizedSplit.Core      || 0) / 100;
  const satTargetTotal  = portfolioTarget * (normalizedSplit.Satellite || 0) / 100;
  const wsTargetTotal   = portfolioTarget * (normalizedSplit.Wildshots || 0) / 100;

  const coreWeightTotal   = candidatesByBucket.Core.reduce((s, c) => s + (c.weight || 1), 0) || 1;
  const wsConvictionTotal = candidatesByBucket.Wildshots.reduce((s, c) => s + (c.conviction || 1), 0) || 1;
  const satCount          = candidatesByBucket.Satellite.length || 1;

  const getCoreTarget = (c) => coreTargetTotal > 0 ? coreTargetTotal * (c.weight || 1) / coreWeightTotal : 0;
  const getSatTarget  = ()  => satTargetTotal  > 0 ? satTargetTotal  / satCount : 0;
  const getWsTarget   = (c) => wsTargetTotal   > 0 ? wsTargetTotal   * (c.conviction || 1) / wsConvictionTotal : 0;

  const getInvested = (ticker) => {
    const pos = positions.find(p => p.Ticker === ticker);
    return pos ? pos.Invertido : 0;
  };

  const scoreCandidate = (c, bucket) => {
    const invested = getInvested(c.ticker);
    let target = 0;
    if (bucket === "Core")           target = getCoreTarget(c);
    else if (bucket === "Satellite") target = getSatTarget();
    else                             target = getWsTarget(c);

    const deficit = Math.max(0, target - invested);
    if (deficit <= 0) return null;

    const deficitRelative = target > 0 ? deficit / target : 0;

    const a    = analysis[c.ticker];
    const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
    const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
    const rr   = up && down && down > 0 ? up / down : null;

    const RR_EXCEPTION_THRESHOLD = 1.9;
    const bucketRealPct   = (byBucket.find(b => b.bucket === bucket)?.realPct || 0) * 100;
    const bucketTargetPct = normalizedSplit[bucket] || 0;
    const bucketIsOver    = totalInvertido > 0 && bucketRealPct > bucketTargetPct + 2;
    if (bucketIsOver && (!rr || rr < RR_EXCEPTION_THRESHOLD)) return null;

    const rrScore = rr !== null ? Math.min(rr / 5, 1) : 0.3;
    const composite = (0.50 * rrScore) + (0.50 * deficitRelative);
    return { ...c, bucket, invested, target, deficit, deficitRelative, rr, rrScore, composite, bucketIsOver };
  };

  const computeDCAPlan = (budget) => {
    const MIN = DCA_MIN;

    const allScored = [];
    ["Core", "Satellite", "Wildshots"].forEach(bucket => {
      const maxPos = bucket === "Wildshots" ? 2 : 4;
      const scored = (candidatesByBucket[bucket] || [])
        .map(c => scoreCandidate(c, bucket))
        .filter(Boolean)
        .sort((a, b) => b.composite - a.composite)
        .slice(0, maxPos);
      allScored.push(...scored);
    });
    allScored.sort((a, b) => b.composite - a.composite);

    const totalComposite = allScored.reduce((s, c) => s + c.composite, 0) || 1;
    let remaining = budget;
    const recommendations = [];

    for (const c of allScored) {
      if (remaining < MIN) break;
      const idealShare   = budget * (c.composite / totalComposite);
      const rawAmount    = Math.max(MIN, Math.floor(idealShare / 5) * 5);
      const effectiveCap = Math.max(c.deficit, MIN);
      const amount       = Math.min(rawAmount, effectiveCap, remaining);
      const rounded      = Math.floor(amount / 5) * 5;

      if (rounded >= MIN) {
        recommendations.push({ ...c, amount: rounded, accumulate: false });
        remaining -= rounded;
      } else {
        recommendations.push({ ...c, amount: 0, accumulate: true, accumulateTarget: MIN });
      }
    }

    const bucketAlloc = {};
    recommendations.filter(r => !r.accumulate).forEach(r => {
      bucketAlloc[r.bucket] = (bucketAlloc[r.bucket] || 0) + r.amount;
    });
    const totalDeployed = recommendations.filter(r => !r.accumulate).reduce((s, r) => s + r.amount, 0);
    const surplus = budget - totalDeployed;

    return { recommendations, totalDeployed, surplus, bucketAlloc };
  };

  const dcaPlan = useMemo(
    () => computeDCAPlan(dcaBudget),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dcaBudget, JSON.stringify(candidatesByBucket), JSON.stringify(positions), JSON.stringify(analysis), JSON.stringify(normalizedSplit)]
  );

  return { computeDCAPlan, scoreCandidate, portfolioTarget, dcaPlan };
}
