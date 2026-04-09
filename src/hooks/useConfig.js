import { useEffect } from "react";

export function useConfig({
  investmentMode, setInvestmentMode,
  periodicity,    setPeriodicity,
  periodicAmount, setPeriodicAmount,
  desiredInvestment, setDesiredInvestment,
  desiredSplit,   setDesiredSplit,
  desiredReturn,  setDesiredReturn,
  lang,           setLang,
}) {
  // Load config on mount
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (!cfg || typeof cfg !== 'object') return;
      if (cfg.investmentMode)  setInvestmentMode(cfg.investmentMode);
      if (cfg.periodicity)     setPeriodicity(cfg.periodicity);
      if (typeof cfg.periodicAmount   === 'number') setPeriodicAmount(cfg.periodicAmount);
      if (typeof cfg.desiredInvestment === 'number') setDesiredInvestment(cfg.desiredInvestment);
      if (cfg.desiredSplit && typeof cfg.desiredSplit === 'object') setDesiredSplit(cfg.desiredSplit);
      if (typeof cfg.desiredReturn === 'number') setDesiredReturn(cfg.desiredReturn);
      if (cfg.lang) setLang(cfg.lang);
    }).catch(() => {});
  }, []);

  // Auto-save with 800ms debounce — reads current config first to preserve fields like `users`
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/config')
        .then(r => r.json())
        .then(existing => {
          const merged = {
            ...existing,
            investmentMode, periodicity, periodicAmount,
            desiredInvestment, desiredSplit, desiredReturn, lang,
          };
          return fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          });
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [investmentMode, periodicity, periodicAmount, desiredInvestment, desiredSplit, desiredReturn, lang]);
}
