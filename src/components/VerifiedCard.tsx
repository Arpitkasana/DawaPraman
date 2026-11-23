import React from 'react';
import { CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';

export interface VerifiedMedicineData {
  status?: string;
  medicine?: string;
  name?: string;
  batch_no?: string;
  batchNo?: string;
  mfg?: string;
  mfg_date?: string;
  exp?: string;
  exp_date?: string;
  manufacturer_name?: string;
  manufacturer?: string;
  salt_composition?: string;
  short_composition1?: string;
  price?: number | string | null;
  price_inr?: number | string | null;
  nppa_ceiling_price?: number | string | null;
  mrp_paid?: number | string | null;
  details?: string;
  message?: string;
}

export interface VerifiedCardProps {
  data?: VerifiedMedicineData | null;
  mrpPaid?: number | string | null;
}

export function VerifiedCard({ data, mrpPaid }: VerifiedCardProps) {
  if (!data) return null;

  const medName = data.medicine || data.name || 'Verified Medicine';
  const batch = data.batch_no || data.batchNo || '';
  const mfg = data.mfg_date || data.mfg || '';
  const exp = data.exp_date || data.exp || '';
  const manufacturer = data.manufacturer_name || data.manufacturer || '';
  const composition = data.short_composition1 || data.salt_composition || '';

  const rawPrice = data.price_inr ?? data.price;
  const listedPrice =
    rawPrice !== null && rawPrice !== undefined && rawPrice !== ''
      ? Number(rawPrice)
      : null;

  const rawCeiling = data.nppa_ceiling_price;
  const nppaCeiling =
    rawCeiling !== null && rawCeiling !== undefined && rawCeiling !== ''
      ? Number(rawCeiling)
      : null;

  const effectivePaidRaw = mrpPaid ?? data.mrp_paid;
  const paidAmount =
    effectivePaidRaw !== null &&
    effectivePaidRaw !== undefined &&
    effectivePaidRaw !== ''
      ? Number(effectivePaidRaw)
      : null;

  const referenceCap =
    nppaCeiling !== null && !Number.isNaN(nppaCeiling)
      ? nppaCeiling
      : listedPrice !== null && !Number.isNaN(listedPrice)
      ? listedPrice
      : null;

  const isOverpriced =
    paidAmount !== null &&
    !Number.isNaN(paidAmount) &&
    referenceCap !== null &&
    paidAmount > referenceCap;

  return (
    <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{medName}</span>
        </div>
        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" />
          VERIFIED
        </span>
      </div>

      {composition && (
        <p className="text-xs text-emerald-950/80 font-medium">{composition}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 rounded-xl p-3 border border-emerald-200">
        {batch && (
          <div>
            <span className="text-slate-500 block text-[10px]">Batch</span>
            <span className="font-mono font-bold text-slate-900">{batch}</span>
          </div>
        )}
        {manufacturer && (
          <div>
            <span className="text-slate-500 block text-[10px]">Manufacturer</span>
            <span className="font-semibold text-slate-900">{manufacturer}</span>
          </div>
        )}
        {mfg && (
          <div>
            <span className="text-slate-500 block text-[10px]">Mfg</span>
            <span className="font-semibold text-slate-800">{mfg}</span>
          </div>
        )}
        {exp && (
          <div>
            <span className="text-slate-500 block text-[10px]">Exp</span>
            <span className="font-semibold text-slate-800">{exp}</span>
          </div>
        )}
      </div>

      {(listedPrice !== null || nppaCeiling !== null) && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white/80 rounded-xl px-3 py-2 border border-emerald-200 text-xs">
          {listedPrice !== null && !Number.isNaN(listedPrice) && (
            <div>
              <span className="text-slate-500">Listed MRP: </span>
              <span className="font-bold text-slate-900">
                ₹{listedPrice.toFixed(2)}
              </span>
            </div>
          )}
          {nppaCeiling !== null && !Number.isNaN(nppaCeiling) && (
            <div>
              <span className="text-slate-500">NPPA Ceiling: </span>
              <span className="font-bold text-emerald-700">
                ₹{nppaCeiling.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {isOverpriced && referenceCap !== null && paidAmount !== null && (
        <div className="bg-amber-50 border border-amber-400 text-amber-900 rounded-xl p-2.5 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Paid ₹{paidAmount.toFixed(2)} above reference price ₹
            {referenceCap.toFixed(2)}.
          </span>
        </div>
      )}

      {(data.details || data.message) && (
        <p className="text-xs text-emerald-900">{data.details || data.message}</p>
      )}
    </div>
  );
}

export default VerifiedCard;
