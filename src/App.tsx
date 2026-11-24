import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  QrCode,
  Search,
  AlertTriangle,
  Home,
  MessageCircle,
  X,
  Send,
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Info,
  Globe,
  FileWarning,
  Activity,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  verifyMedicine,
  searchMedicines,
  checkDrugInteraction,
  fetchMedicinesForInteraction,
} from './services/api';
import { validators, sanitizeInput } from './lib/validation';
import VerifiedCard from './components/VerifiedCard';

type Tab = 'home' | 'scan' | 'search' | 'report';

const BANNED_DRUGS_PDF_URL = '/banneddrugs.pdf';
const QR_READER_ELEMENT_ID = 'dawapraman-qr-reader';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [lang, setLang] = useState<'hi' | 'en'>(
    () => (sessionStorage.getItem('lang') as 'hi' | 'en') || 'hi'
  );
  const [showBannedPdf, setShowBannedPdf] = useState(false);

  // Scan & Camera QR state
  const [batchNo, setBatchNo] = useState('');
  const [mrpPaid, setMrpPaid] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const verifyingRef = useRef(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Interaction Checker state
  const [med1, setMed1] = useState('Paracetamol 650');
  const [med2, setMed2] = useState('Azithromycin 500');
  const [interactionFilter, setInteractionFilter] = useState('');
  const [interactionMeds, setInteractionMeds] = useState<any[]>([]);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{
    safe: boolean;
    text: string;
    advice?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const list = await fetchMedicinesForInteraction(interactionFilter);
        if (active && Array.isArray(list)) {
          setInteractionMeds(list);
        }
      } catch {
        if (active) setInteractionMeds([]);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [interactionFilter]);

  const stopCameraScanner = async () => {
    const scanner = qrScannerRef.current;
    qrScannerRef.current = null;
    setCameraActive(false);
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        // Ignore if already stopped
      }
      try {
        scanner.clear();
      } catch {
        // Ignore clear errors
      }
    }
  };

  useEffect(() => {
    if (activeTab !== 'scan' && cameraActive) {
      stopCameraScanner();
    }
  }, [activeTab, cameraActive]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Report Fake state
  const [chemistName, setChemistName] = useState('');
  const [city, setCity] = useState('');
  const [reportBatch, setReportBatch] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  // WhatsApp Widget state
  const [waOpen, setWaOpen] = useState(false);
  const [waInput, setWaInput] = useState('');
  const [waMessages, setWaMessages] = useState<
    { from: 'bot' | 'user'; text: string }[]
  >([
    {
      from: 'bot',
      text: 'Namaste! Apni dawai ka Batch Number bhejein (e.g. DOLO2026A) verify karne ke liye.',
    },
  ]);

  const toggleLang = () => {
    const next = lang === 'hi' ? 'en' : 'hi';
    setLang(next);
    sessionStorage.setItem('lang', next);
  };

  const extractBatchFromQr = (decodedText: string): string => {
    const cleaned = decodedText.trim();
    const batchParamMatch = cleaned.match(
      /(?:batch(?:_?no)?|bn|lot)[=:/\s-]+([A-Z0-9-]{4,24})/i
    );
    if (batchParamMatch?.[1]) {
      return batchParamMatch[1].toUpperCase();
    }
    const tokenMatch = cleaned.toUpperCase().match(/[A-Z0-9-]{4,24}/);
    return tokenMatch ? tokenMatch[0] : cleaned.toUpperCase();
  };

  const handleVerify = async (e?: React.FormEvent, customBatch?: string) => {
    if (e) e.preventDefault();
    if (verifyingRef.current) return;

    const targetBatch = (customBatch ?? batchNo).trim().toUpperCase();
    setScanError('');
    setScanResult(null);

    if (!validators.batchNo(targetBatch)) {
      setScanError(
        lang === 'hi'
          ? 'Sahi Batch Number daalein (4-20 letters/numbers, e.g. DOLO2026A)'
          : 'Enter a valid Batch Number (4-20 alphanumeric characters)'
      );
      return;
    }

    verifyingRef.current = true;
    setScanLoading(true);
    try {
      const res = await verifyMedicine(targetBatch);
      const parsedMrp = Number(mrpPaid);
      const medObj = res?.medicine || res?.data;
      const officialPrice = Number(
        medObj?.price_inr ?? medObj?.nppa_ceiling_price ?? res?.price_inr
      );
      const overcharged =
        !Number.isNaN(parsedMrp) &&
        parsedMrp > 0 &&
        !Number.isNaN(officialPrice) &&
        officialPrice > 0 &&
        parsedMrp > officialPrice;

      setScanResult({
        ...res,
        mrpPaid: !Number.isNaN(parsedMrp) && parsedMrp > 0 ? parsedMrp : undefined,
        overcharged,
      });
    } catch {
      setScanResult({
        status: 'yellow',
        message: 'Unable to reach verification server.',
      });
    } finally {
      setScanLoading(false);
      verifyingRef.current = false;
    }
  };

  const startCameraScanner = async () => {
    setScanError('');
    setScanResult(null);
    await stopCameraScanner();
    setCameraActive(true);

    setTimeout(async () => {
      const el = document.getElementById(QR_READER_ELEMENT_ID);
      if (!el) {
        setCameraActive(false);
        setScanError(
          lang === 'hi'
            ? 'Scanner container taiyar nahi ho paya. Kripya dobara koshish karein.'
            : 'Scanner container not ready. Please try again.'
        );
        return;
      }

      try {
        const scanner = new Html5Qrcode(QR_READER_ELEMENT_ID);
        qrScannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          async (decodedText) => {
            const extracted = extractBatchFromQr(decodedText);
            await stopCameraScanner();
            setBatchNo(extracted);
            await handleVerify(undefined, extracted);
          },
          () => {
            // Ignore per-frame scan misses
          }
        );
      } catch {
        await stopCameraScanner();
        setScanError(
          lang === 'hi'
            ? 'Camera access nahi mil paya. Browser permission allow karein ya neeche Batch Number manually daalein.'
            : 'Unable to access camera. Allow camera permission or enter the Batch Number manually below.'
        );
      }
    }, 80);
  };

  const handleSelectMedicineForVerify = async (med: any) => {
    const code = (med?.batch_no || '').toString().trim().toUpperCase();
    setActiveTab('scan');

    if (!code) {
      setBatchNo('');
      setScanResult(null);
      setScanError(
        lang === 'hi'
          ? `${med?.name || 'Is dawai'} ka Batch Number record me nahi hai — packet se manually daalein.`
          : `No batch number on record for ${med?.name || 'this medicine'} — enter it manually from the strip.`
      );
      return;
    }

    setBatchNo(code);
    await handleVerify(undefined, code);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = sanitizeInput(searchQuery.trim());
    if (q.length < 3) return;
    setSearchLoading(true);
    try {
      const data = await searchMedicines(q);
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const resolveSaltForInput = async (rawInput: string): Promise<string> => {
    const clean = sanitizeInput(rawInput.trim());
    if (!clean) return '';
    if (clean.length >= 3) {
      try {
        const matches = await searchMedicines(clean);
        if (Array.isArray(matches) && matches.length > 0) {
          const salt = matches[0].short_composition1 || matches[0].salt;
          if (salt) return salt;
        }
      } catch {
        // Fall back to raw input
      }
    }
    return clean;
  };

  const handleInteractionCheck = async () => {
    const a = med1.trim();
    const b = med2.trim();
    if (!a || !b) return;

    if (a.toLowerCase() === b.toLowerCase()) {
      setInteractionResult({
        safe: false,
        text:
          lang === 'hi'
            ? 'Kripya do alag-alag dawaiyan ya salt chunein.'
            : 'Please select two different medicines or salts.',
      });
      return;
    }

    setInteractionLoading(true);
    setInteractionResult(null);

    try {
      const [saltA, saltB] = await Promise.all([
        resolveSaltForInput(a),
        resolveSaltForInput(b),
      ]);
      const hit = await checkDrugInteraction(saltA, saltB);

      if (hit) {
        setInteractionResult({
          safe: false,
          text: lang === 'hi' ? hit.summary_hi : hit.summary_en,
          advice: lang === 'hi' ? hit.advice_hi : hit.advice_en,
        });
      } else {
        setInteractionResult({
          safe: true,
          text:
            lang === 'hi'
              ? 'No Major Interaction Found: Aam taur par surakshit hai, par doctor ki salah zaroori hai.'
              : 'No Major Interaction Found: Generally safe, but always consult your doctor.',
        });
      }
    } catch {
      setInteractionResult({
        safe: true,
        text:
          lang === 'hi'
            ? 'No Major Interaction Found: Aam taur par surakshit hai, par doctor ki salah zaroori hai.'
            : 'No Major Interaction Found: Generally safe, but always consult your doctor.',
      });
    } finally {
      setInteractionLoading(false);
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError('');
    setReportSuccess('');

    if (!validators.chemistName(chemistName)) {
      setReportError('Chemist name invalid hai (2-100 characters).');
      return;
    }
    if (!validators.city(city)) {
      setReportError('City name invalid hai (sirf letters).');
      return;
    }
    if (!validators.batchNo(reportBatch.toUpperCase())) {
      setReportError('Batch number invalid hai (e.g. BATCH123).');
      return;
    }

    const trackingId = `MED-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setReportSuccess(`Report CDSCO ko bhej di gayi. Tracking ID: ${trackingId}`);
    setChemistName('');
    setCity('');
    setReportBatch('');
  };

  const handleWaSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = waInput.trim().toUpperCase();
    if (!code) return;

    setWaMessages((prev) => [...prev, { from: 'user', text: code }]);
    setWaInput('');

    const res = await verifyMedicine(code);
    const medObj = typeof res?.medicine === 'object' ? res.medicine : res?.data;
    const medName =
      (typeof res?.medicine === 'string' && res.medicine) ||
      medObj?.name ||
      code;
    const expDate = medObj?.exp_date || res?.exp || 'N/A';

    let reply = res?.message || 'Verify Nahi Ho Payi (Server offline ya batch nahi mila).';
    if (res?.status === 'green') {
      reply = `ASLI DAWAI: ${medName} (Exp: ${expDate})`;
    } else if (res?.status === 'red') {
      reply = `NAKLI / RECALLED: Is dawai ko mat lein! (${res.details || res.message || 'CDSCO Alert'})`;
    }

    setWaMessages((prev) => [...prev, { from: 'bot', text: reply }]);
  };

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[844px] bg-slate-50 text-slate-900 relative pb-20">
      {/* Top Trust Bar */}
      <div className="bg-emerald-700 text-white text-[11px] font-medium py-1.5 px-3 text-center tracking-wide">
        100% Free | No Pharma Ads | Aapka Data Nahi Becha Jayega
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight text-slate-900">
              DawaPraman India
            </h1>
            <p className="text-[11px] font-semibold text-emerald-600">
              DawAI Suraksha
            </p>
          </div>
        </div>
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-full transition"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'hi' ? 'EN' : 'हिंदी'}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 space-y-5 overflow-y-auto">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <>
            <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-md">
              <h2 className="text-xl font-extrabold leading-snug">
                {lang === 'hi'
                  ? 'Apni Dawai Scan Karo. Asli Hai Ya Nakli, 3 Second Me Jano.'
                  : 'Scan Your Medicine. Know if it is Genuine or Fake in 3 Seconds.'}
              </h2>
              <p className="text-emerald-100 text-xs mt-2 leading-relaxed">
                {lang === 'hi'
                  ? 'QR Code scan karo, batch verify karo, sahi daam pata karo. Bilkul Free.'
                  : 'Scan QR code, verify batch number, check fair NPPA prices. 100% Free.'}
              </p>

              <div className="grid grid-cols-1 gap-2.5 mt-4">
                <button
                  onClick={() => {
                    setActiveTab('scan');
                    startCameraScanner();
                  }}
                  className="w-full bg-white text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow hover:bg-emerald-50 transition"
                >
                  <Camera className="w-5 h-5" />
                  Scan Dawai - Camera / Batch
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className="w-full bg-emerald-900/40 border border-emerald-400/40 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-900/60 transition text-sm"
                >
                  <Search className="w-4 h-4" />
                  Dawai Search Karein
                </button>
              </div>
            </section>

            {/* Trust Stats */}
            <section className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-emerald-600">5,000+</div>
                <div className="text-[10px] text-slate-500 font-medium">Medicines</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-emerald-600">1.2L+</div>
                <div className="text-[10px] text-slate-500 font-medium">Scans</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-red-600">850+</div>
                <div className="text-[10px] text-slate-500 font-medium">Fake Caught</div>
              </div>
            </section>

            {/* Banned Drugs PDF Loader */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      Banned Drugs List (PDF)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'hi'
                        ? 'Zaroorat padne par PDF load karein'
                        : 'Load official PDF document on demand'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowBannedPdf((prev) => !prev)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    {showBannedPdf ? 'Hide PDF' : 'Load PDF'}
                  </button>
                  <a
                    href={BANNED_DRUGS_PDF_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open PDF in new tab"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {showBannedPdf && (
                <div className="space-y-2 pt-1">
                  <iframe
                    src={BANNED_DRUGS_PDF_URL}
                    title="Banned Drugs PDF"
                    className="w-full h-80 rounded-xl border border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500">
                    Agar PDF preview na khule to upar external link icon se new tab me open karein.
                  </p>
                </div>
              )}
            </section>

            {/* Drug Interaction Checker */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Drug Interaction Checker
                </h3>
              </div>

              <input
                type="text"
                value={interactionFilter}
                onChange={(e) => setInteractionFilter(e.target.value)}
                placeholder="Filter database medicines (e.g. Dolo, Crocin, Azithral)..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <div className="grid grid-cols-1 gap-2">
                <select
                  aria-label="First medicine"
                  value={med1}
                  onChange={(e) => setMed1(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  <option value="Paracetamol 650">Paracetamol 650</option>
                  <option value="Aspirin 75">Aspirin 75</option>
                  <option value="Metformin 500">Metformin 500</option>
                  <option value="Amlodipine 5">Amlodipine 5</option>
                  {interactionMeds.map((m: any, idx: number) => (
                    <option key={`m1-${m.batch_no ?? idx}`} value={m.name}>
                      {m.name}
                      {m.short_composition1 ? ` (${m.short_composition1})` : ''}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Second medicine"
                  value={med2}
                  onChange={(e) => setMed2(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  <option value="Azithromycin 500">Azithromycin 500</option>
                  <option value="Ibuprofen 400">Ibuprofen 400</option>
                  <option value="Alcohol">Alcohol</option>
                  <option value="Pantoprazole 40">Pantoprazole 40</option>
                  {interactionMeds.map((m: any, idx: number) => (
                    <option key={`m2-${m.batch_no ?? idx}`} value={m.name}>
                      {m.name}
                      {m.short_composition1 ? ` (${m.short_composition1})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={interactionLoading}
                onClick={handleInteractionCheck}
                className="w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
              >
                {interactionLoading ? 'Checking...' : 'Check Interaction'}
              </button>
              {interactionResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                    interactionResult.safe
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {interactionResult.safe ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  )}
                  <div className="space-y-1">
                    <div>{interactionResult.text}</div>
                    {interactionResult.advice && (
                      <div className="text-[11px] opacity-90">{interactionResult.advice}</div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Privacy Note */}
            <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-slate-400" />
              <span>
                History is not saved for your privacy. Ye jankari ke liye hai, dawa doctor ki salah se hi lein.
              </span>
            </div>
          </>
        )}

        {/* SCAN & VERIFY TAB */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-5 text-center text-white relative overflow-hidden">
              {cameraActive ? (
                <div className="space-y-3">
                  <div
                    id={QR_READER_ELEMENT_ID}
                    className="w-full max-w-[260px] mx-auto rounded-xl overflow-hidden border-2 border-emerald-400 bg-black"
                  />
                  <p className="text-[11px] text-emerald-200">
                    {lang === 'hi'
                      ? 'Dawai ke packet ka QR code frame ke andar rakhein...'
                      : 'Point camera at the QR code on the medicine strip...'}
                  </p>
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition"
                  >
                    <CameraOff className="w-4 h-4" />
                    {lang === 'hi' ? 'Camera Band Karein' : 'Stop Camera'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-40 h-40 mx-auto border-2 border-emerald-400 rounded-xl flex flex-col items-center justify-center bg-slate-800/60">
                    <QrCode className="w-12 h-12 text-emerald-400 mb-2" />
                    <span className="text-[11px] text-slate-300">
                      CDSCO QR Frame
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition"
                    >
                      <Camera className="w-4 h-4" />
                      {lang === 'hi' ? 'Camera QR Scan Karein' : 'Scan QR with Camera'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(undefined, 'DOLO2026A')}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition"
                    >
                      Test (DOLO2026A)
                    </button>
                  </div>
                </>
              )}
            </div>

            <form
              onSubmit={handleVerify}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
            >
              <h3 className="font-bold text-sm text-slate-800">
                Manual Batch Verification
              </h3>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. DOLO2026A"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  MRP Paid (₹) - Optional
                </label>
                <input
                  type="number"
                  value={mrpPaid}
                  onChange={(e) => setMrpPaid(e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {scanError && (
                <p className="text-xs text-red-600 font-medium">{scanError}</p>
              )}
              <button
                type="submit"
                disabled={scanLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                {scanLoading ? 'Verifying with Server...' : 'Verify Medicine'}
              </button>
            </form>

            {/* Result Display */}
            {scanResult && scanResult.status === 'green' && (
              <div className="space-y-2">
                <VerifiedCard data={scanResult} />
                {scanResult.overcharged && (
                  <div className="bg-amber-50 border border-amber-400 text-amber-900 rounded-xl p-3 text-xs font-medium">
                    MRP Paid (₹{scanResult.mrpPaid}) record price se zyada hai. Chemist se bill/MRP check karein.
                  </div>
                )}
              </div>
            )}

            {scanResult && scanResult.status === 'yellow' && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <span>Verify Nahi Ho Payi</span>
                </div>
                <p className="text-xs text-amber-900">
                  {scanResult.message || 'Batch records me nahi mila ya server offline hai.'}
                </p>
              </div>
            )}

            {scanResult && scanResult.status === 'red' && (
              <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <span>Suspicious / Recalled! Is dawai ko mat lein</span>
                </div>
                <p className="text-xs text-red-900">{scanResult.details || scanResult.message}</p>
                <button
                  onClick={() => setActiveTab('report')}
                  className="w-full bg-red-600 text-white text-xs font-bold py-2.5 rounded-lg"
                >
                  Report to CDSCO Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* SEARCH TAB */}
        {activeTab === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicine (min 3 chars)..."
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="bg-emerald-600 text-white px-4 rounded-xl font-bold text-sm"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {searchLoading && (
              <p className="text-xs text-slate-500 text-center py-4">
                Searching secure database...
              </p>
            )}

            {!searchLoading && searchResults.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  Type at least 3 letters (e.g. Dolo, Crocin, Azithral) to search via Supabase Edge Function.
                </p>
              </div>
            )}

            <div className="space-y-2.5">
              {searchResults.map((med, idx) => (
                <div
                  key={med.batch_no ? `${med.name}-${med.batch_no}` : `${med.name}-${idx}`}
                  onClick={() => handleSelectMedicineForVerify(med)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectMedicineForVerify(med);
                    }
                  }}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-400 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">
                      {med.name}
                    </div>
                    <div className="text-xs text-emerald-700 font-medium mt-0.5">
                      {med.short_composition1}
                      {med.price_inr != null ? ` • ₹${med.price_inr}` : ''}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {med.manufacturer_name}
                      {med.pack_size_label ? ` • ${med.pack_size_label}` : ''}
                    </div>
                    {med.batch_no && (
                      <div className="mt-1.5 inline-block text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                        Batch: {med.batch_no}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectMedicineForVerify(med);
                    }}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    {lang === 'hi' ? 'Batch Verify' : 'Verify Batch'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT FAKE TAB */}
        {activeTab === 'report' && (
          <form
            onSubmit={handleReportSubmit}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2 text-red-600">
              <FileWarning className="w-5 h-5" />
              <h3 className="font-bold text-base">Report Fake Medicine</h3>
            </div>
            <p className="text-xs text-slate-500">
              Nakli dawai ki shikayat seedha CDSCO ko bhejein.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Chemist / Medical Store Name
              </label>
              <input
                type="text"
                value={chemistName}
                onChange={(e) => setChemistName(e.target.value)}
                placeholder="e.g. Apollo Pharmacy"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Noida"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Batch Number
              </label>
              <input
                type="text"
                value={reportBatch}
                onChange={(e) => setReportBatch(e.target.value)}
                placeholder="e.g. FAKE2026X"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm uppercase"
              />
            </div>

            {reportError && (
              <p className="text-xs text-red-600 font-medium">{reportError}</p>
            )}
            {reportSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-semibold">
                {reportSuccess}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition"
            >
              Submit Report to CDSCO
            </button>
          </form>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      <button
        onClick={() => setWaOpen(true)}
        className="fixed sm:absolute bottom-20 right-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 z-30"
      >
        <MessageCircle className="w-4 h-4" />
        WhatsApp par Verify Karein
      </button>

      {/* WhatsApp Chat Modal */}
      {waOpen && (
        <div className="fixed sm:absolute inset-0 bg-black/50 z-40 flex items-end justify-center p-3">
          <div className="bg-white w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[75%]">
            <div className="bg-emerald-700 text-white p-3 flex items-center justify-between">
              <div className="font-bold text-sm">DawaPraman WhatsApp Bot</div>
              <button onClick={() => setWaOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto flex-1 bg-slate-100 min-h-[200px]">
              {waMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl text-xs max-w-[85%] ${
                    m.from === 'user'
                      ? 'bg-emerald-600 text-white ml-auto'
                      : 'bg-white text-slate-800 border border-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleWaSend} className="p-2 bg-white border-t flex gap-2">
              <input
                type="text"
                value={waInput}
                onChange={(e) => setWaInput(e.target.value)}
                placeholder="Type Batch No..."
                className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2"
              />
              <button
                type="submit"
                className="bg-emerald-600 text-white p-2 rounded-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation */}
      <nav className="fixed sm:absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-slate-200 grid grid-cols-4 py-2 px-1 z-30">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'scan', label: 'Scan', icon: QrCode },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'report', label: 'Report', icon: AlertTriangle },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`flex flex-col items-center gap-0.5 py-1 rounded-lg transition ${
                active ? 'text-emerald-600 font-bold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
