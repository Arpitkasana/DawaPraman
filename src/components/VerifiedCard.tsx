import React, { useState, useEffect } from 'react';
import { CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function VerifiedCard({ data }: { data: any }) {
  const [ticker, setTicker] = useState('');

  const isDiscontinued = Boolean(
    data?.details?.isDiscontinued ??
      data?.is_discontinued ??
      data?.isDiscontinued
  );

  const timestamp = data?.secureMeta?.timestamp;
  const batchNo = data?.batch_no || data?.batchNo || '';
  const mfgDate = data?.mfg_date || data?.mfg || '';
  const expDate = data?.exp_date || data?.exp || '';
  const composition = data?.salt_composition || data?.short_composition1 || '';

  useEffect(() => {
    if (!timestamp) {
      setTicker('');
      return;
    }

    const serverTime = new Date(timestamp).getTime();
    if (Number.isNaN(serverTime)) {
      setTicker('');
      return;
    }

    const updateElapsed = () => {
      const diffSeconds = Math.max(
        0,
        Math.floor((Date.now() - serverTime) / 1000)
      );
      setTicker(`Verified ${diffSeconds} seconds ago`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="text-emerald-500 w-10 h-10 shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-emerald-700">100% Asli Dawai</h2>
          <p className="text-sm text-gray-600 font-medium">{data?.medicine}</p>
          {composition && (
            <p className="text-xs text-slate-500 mt-0.5">{composition}</p>
          )}
        </div>
      </div>

      {(batchNo || mfgDate || expDate) && (
        <div className="grid grid-cols-3 gap-2 text-xs bg-emerald-50/70 rounded-lg p-2.5 border border-emerald-200 mb-3">
          {batchNo && (
            <div>
              <span className="text-slate-500 block text-[10px]">Batch</span>
              <span className="font-mono font-semibold text-slate-800">{batchNo}</span>
            </div>
          )}
          {mfgDate && (
            <div>
              <span className="text-slate-500 block text-[10px]">Mfg</span>
              <span className="font-semibold text-slate-800">{mfgDate}</span>
            </div>
          )}
          {expDate && (
            <div>
              <span className="text-slate-500 block text-[10px]">Exp</span>
              <span className="font-semibold text-slate-800">{expDate}</span>
            </div>
          )}
        </div>
      )}

      {isDiscontinued && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <span>Ye dawai Discontinued hai. Doctor se pooch ke hi lein.</span>
        </div>
      )}

      <div className="bg-slate-50 rounded p-3 mt-4 border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="text-xs text-slate-500 font-mono">
            <div className="font-semibold text-slate-700">
              ID: {data?.secureMeta?.verificationToken || 'INVALID'}
            </div>
            <div className="text-blue-600 font-medium">{ticker || 'Offline Mode'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
