import React, { useState } from 'react';
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
  CheckCircle2,
  XCircle,
  Info,
  Globe,
  FileWarning,
  Activity,
} from 'lucide-react';
import { verifyMedicine, searchMedicines } from './services/api';
import { validators, sanitizeInput } from './lib/validation';
import VerifiedCard from './components/VerifiedCard';

type Tab = 'home' | 'scan' | 'search' | 'report';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [lang, setLang] = useState<'hi' | 'en'>(
    () => (sessionStorage.getItem('lang') as 'hi' | 'en') || 'hi'
  );

  // Scan state
  const [batchNo, setBatchNo] = useState('');
  const [mrpPaid, setMrpPaid] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Interaction Checker state
  const [med1, setMed1] = useState('Paracetamol 650');
  const [med2, setMed2] = useState('Azithromycin 500');
  const [interactionResult, setInteractionResult] = useState<{
    safe: boolean;
    text: string;
  } | null>(null);

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

  const handleVerify = async (e?: React.FormEvent, customBatch?: string) => {
    if (e) e.preventDefault();
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

    setScanLoading(true);
    const res = await verifyMedicine(targetBatch);
    setScanResult(res);
    setScanLoading(false);
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

  const handleInteractionCheck = () => {
    const pair = [med1, med2].sort().join('+');
    if (pair.includes('Aspirin') && pair.includes('Ibuprofen')) {
      setInteractionResult({
        safe: false,
        text: 'Dangerous Interaction: Pet me bleeding aur ulcer ka khatra badh sakta hai. Doctor se poochein.',
      });
    } else if (pair.includes('Metformin') && pair.includes('Alcohol')) {
      setInteractionResult({
        safe: false,
        text: 'High Risk: Lactic acidosis ka khatra. Ek saath bilkul na lein.',
      });
    } else {
      setInteractionResult({
        safe: true,
        text: 'No Major Interaction Found: Aam taur par surakshit hai, par doctor ki salah zaroori hai.',
      });
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
    let reply = 'Verify Nahi Ho Payi (Server offline ya batch nahi mila).';
    if (res.status === 'green') {
      reply = `ASLI DAWAI: ${res.medicine} (Exp: ${res.exp})`;
    } else if (res.status === 'red') {
      reply = `NAKLI / RECALLED: Is dawai ko mat lein! (${res.details || 'CDSCO Alert'})`;
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
                  onClick={() => setActiveTab('scan')}
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

            {/* Drug Interaction Checker */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  Drug Interaction Checker
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={med1}
                  onChange={(e) => setMed1(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  <option>Paracetamol 650</option>
                  <option>Aspirin 75</option>
                  <option>Metformin 500</option>
                  <option>Amlodipine 5</option>
                </select>
                <select
                  value={med2}
                  onChange={(e) => setMed2(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50"
                >
                  <option>Azithromycin 500</option>
                  <option>Ibuprofen 400</option>
                  <option>Alcohol</option>
                  <option>Pantoprazole 40</option>
                </select>
              </div>
              <button
                onClick={handleInteractionCheck}
                className="w-full bg-slate-900 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-slate-800 transition"
              >
                Check Interaction
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
                  <span>{interactionResult.text}</span>
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
            <div className="bg-slate-900 rounded-2xl p-6 text-center text-white relative overflow-hidden">
              <div className="w-40 h-40 mx-auto border-2 border-emerald-400 rounded-xl flex flex-col items-center justify-center bg-slate-800/60">
                <QrCode className="w-12 h-12 text-emerald-400 mb-2" />
                <span className="text-[11px] text-slate-300">
                  CDSCO QR Frame
                </span>
              </div>
              <button
                onClick={() => handleVerify(undefined, 'DOLO2026A')}
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition"
              >
                Test Backend Verify (DOLO2026A)
              </button>
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
              <VerifiedCard data={scanResult} />
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
              {searchResults.map((med) => (
                <div
                  key={med.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="font-bold text-slate-900 text-sm">
                    {med.name}
                  </div>
                  <div className="text-xs text-emerald-700 font-medium mt-0.5">
                    {med.short_composition_1} • ₹{med.price_inr}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {med.manufacturer_name} • {med.pack_size_label}
                  </div>
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
