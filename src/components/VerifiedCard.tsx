import React, { useState, useEffect } from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';

const isBanned = Boolean(data.bannedMatch) || data.status === "red";
const isDiscontinued = Boolean(data.details?.isDiscontinued);

// Inside the card JSX:
{isBanned && (
  <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900">
    <div className="font-bold uppercase text-red-700">
      Banned / Prohibited Composition Alert
    </div>
    {data.bannedMatch?.drug_rule && (
      <div className="mt-1"><span className="font-semibold">Rule:</span> {data.bannedMatch.drug_rule}</div>
    )}
    {data.bannedMatch?.notification_info && (
      <div><span className="font-semibold">Notification:</span> {data.bannedMatch.notification_info}</div>
    )}
    {data.bannedMatch?.legal_note && (
      <div className="mt-1 text-red-800"><span className="font-semibold">Legal Note:</span> {data.bannedMatch.legal_note}</div>
    )}
  </div>
)}

export default function VerifiedCard({ data }: { data: any }) {
  const [ticker, setTicker] = useState('');

  useEffect(() => {
    if (!data.secureMeta?.timestamp) return;
    
    const serverTime = new Date(data.secureMeta.timestamp).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diffSeconds = Math.floor((now - serverTime) / 1000);
      setTicker(`Verified ${diffSeconds} seconds ago`);
    }, 1000);

    return () => clearInterval(interval);
  }, [data.secureMeta]);

  return (
    <div className="bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="text-emerald-500 w-10 h-10" />
        <div>
          <h2 className="text-xl font-bold text-emerald-700">100% Asli Dawai</h2>
          <p className="text-sm text-gray-600 font-medium">{data.medicine}</p>
        </div>
      </div>
      
      <div className="bg-slate-50 rounded p-3 mt-4 border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <div className="text-xs text-slate-500 font-mono">
            <div className="font-semibold text-slate-700">ID: {data.secureMeta?.verificationToken || 'INVALID'}</div>
            <div className="text-blue-600 font-medium">{ticker || 'Offline Mode'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
