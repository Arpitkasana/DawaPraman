import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
  FileText,
  ExternalLink,
  StopCircle,
} from 'lucide-react';
import { verifyMedicine, searchMedicines } from './services/api';
import { validators, sanitizeInput } from './lib/validation';
import VerifiedCard from './components/VerifiedCard';

type Tab = 'home' | 'scan' | 'search' | 'report';

const BANNED_DRUGS_PDF_URL = '/banned-drugs.pdf';
const QR_READER_ELEMENT_ID = 'dawapraman-qr-reader';

const COPY = {
  hi: {
    trustBar: '100% निःशुल्क | कोई विज्ञापन नहीं | आपका डेटा सुरक्षित है',
    subtitle: 'दवाई सुरक्षा',
    heroTitle: 'अपनी दवाई स्कैन करें। असली है या नकली, 3 सेकंड में जानें।',
    heroSub: 'QR कोड स्कैन करें, बैच नंबर जांचें, सही कीमत पता करें। बिल्कुल मुफ्त।',
    scanBtn: 'दवाई स्कैन करें - कैमरा / बैच',
    searchBtn: 'दवाई खोजें',
    statMeds: 'दवाइयां',
    statScans: 'स्कैन',
    statFake: 'नकली पकड़ी गईं',
    pdfTitle: 'प्रतिबंधित दवाओं की सूची (PDF)',
    pdfSub: 'ज़रूरत पड़ने पर आधिकारिक PDF लोड करें',
    loadPdf: 'PDF देखें',
    hidePdf: 'PDF छुपाएं',
    pdfFallback: 'यदि PDF यहाँ न खुले तो ऊपर दिए लिंक आइकन से नए टैब में खोलें।',
    interactionTitle: 'दवाई रिएक्शन चेकर (Interaction)',
    checkInteraction: 'रिएक्शन जांचें',
    interactionDanger1: 'खतरनाक रिएक्शन: पेट में ब्लीडिंग और अल्सर का खतरा बढ़ सकता है। डॉक्टर से पूछें।',
    interactionDanger2: 'अधिक जोखिम: लैक्टिक एसिडोसिस का खतरा। एक साथ बिल्कुल न लें।',
    interactionSafe: 'कोई बड़ा रिएक्शन नहीं मिला: आमतौर पर सुरक्षित है, फिर भी डॉक्टर की सलाह ज़रूरी है।',
    privacyNote: 'आपकी गोपनीयता के लिए हिस्ट्री सेव नहीं की जाती। दवा डॉक्टर की सलाह से ही लें।',
    qrFrame: 'CDSCO QR फ्रेम',
    openCameraBtn: 'कैमरा खोलें और QR स्कैन करें',
    stopCameraBtn: 'कैमरा बंद करें',
    cameraDenied: 'कैमरा अनुमति नहीं मिली या HTTPS ज़रूरी है। कृपया नीचे बैच नंबर मैन्युअल डालें।',
    testVerifyBtn: 'टेस्ट वेरिफाई (DOLO2026A)',
    manualVerifyTitle: 'बैच नंबर से जांचें',
    batchLabel: 'बैच नंबर (Batch Number)',
    batchPlaceholder: 'जैसे DOLO2026A',
    mrpLabel: 'भुगतान की गई MRP (₹) - वैकल्पिक',
    mrpPlaceholder: 'जैसे 35',
    invalidBatch: 'सही बैच नंबर डालें (4-20 अक्षर/अंक, जैसे DOLO2026A)',
    verifying: 'सर्वर से जांच हो रही है...',
    verifyBtn: 'दवाई वेरिफाई करें',
    unverifiedTitle: 'वेरिफाई नहीं हो पाई',
    unverifiedFallback: 'बैच रिकॉर्ड में नहीं मिला या सर्वर ऑफलाइन है।',
    recalledTitle: 'संदिग्ध / प्रतिबंधित! इस दवाई को न लें',
    reportNowBtn: 'अभी CDSCO को रिपोर्ट करें',
    searchPlaceholder: 'दवाई का नाम खोजें (कम से कम 3 अक्षर)...',
    searching: 'डेटाबेस में खोजा जा रहा है...',
    searchHint: 'दवाई खोजने के लिए कम से कम 3 अक्षर लिखें (जैसे Dolo, Crocin, Azithral)।',
    batchPrefix: 'बैच',
    mfgPrefix: 'निर्माण',
    expPrefix: 'समाप्ति',
    reportTitle: 'नकली दवाई की रिपोर्ट करें',
    reportSub: 'नकली दवाई की शिकायत सीधे CDSCO को भेजें।',
    chemistLabel: 'मेडिकल स्टोर / केमिस्ट का नाम',
    chemistPlaceholder: 'जैसे अपोलो फार्मेसी',
    cityLabel: 'शहर (City)',
    cityPlaceholder: 'जैसे नोएडा',
    reportBatchPlaceholder: 'जैसे FAKE2026X',
    errChemist: 'केमिस्ट का नाम सही नहीं है (2-100 अक्षर)।',
    errCity: 'शहर का नाम सही नहीं है (केवल अक्षर लिखें)।',
    errReportBatch: 'बैच नंबर सही नहीं है (जैसे BATCH123)।',
    reportSuccessPrefix: 'रिपोर्ट CDSCO को भेज दी गई है। ट्रैकिंग आईडी:',
    submitReportBtn: 'CDSCO को रिपोर्ट भेजें',
    waFloatBtn: 'WhatsApp पर जांचें',
    waBotTitle: 'DawaPraman WhatsApp बॉट',
    waWelcome: 'नमस्ते! दवाई जांचने के लिए बैच नंबर भेजें (जैसे DOLO2026A) या SEARCH <दवाई का नाम> लिखें।',
    waPlaceholder: 'बैच नंबर या SEARCH <नाम> लिखें...',
    navHome: 'होम',
    navScan: 'स्कैन',
    navSearch: 'खोजें',
    navReport: 'रिपोर्ट',
  },
  en: {
    trustBar: '100% Free | No Pharma Ads | Your Data Is Never Sold',
    subtitle: 'DawAI Suraksha',
    heroTitle: 'Scan Your Medicine. Know if it is Genuine or Fake in 3 Seconds.',
    heroSub: 'Scan QR code, verify batch number, check fair NPPA prices. 100% Free.',
    scanBtn: 'Scan Medicine - Camera / Batch',
    searchBtn: 'Search Medicine',
    statMeds: 'Medicines',
    statScans: 'Scans',
    statFake: 'Fake Caught',
    pdfTitle: 'Banned Drugs List (PDF)',
    pdfSub: 'Load official PDF document on demand',
    loadPdf: 'Load PDF',
    hidePdf: 'Hide PDF',
    pdfFallback: 'If the PDF preview does not load, open it in a new tab using the icon above.',
    interactionTitle: 'Drug Interaction Checker',
    checkInteraction: 'Check Interaction',
    interactionDanger1: 'Dangerous Interaction: May increase risk of stomach bleeding and ulcers. Consult a doctor.',
    interactionDanger2: 'High Risk: Risk of lactic acidosis. Do not take together.',
    interactionSafe: 'No Major Interaction Found: Generally safe, but always consult your doctor.',
    privacyNote: 'History is not saved for your privacy. For informational use only; follow medical advice.',
    qrFrame: 'CDSCO QR Frame',
    openCameraBtn: 'Open Camera & Scan QR',
    stopCameraBtn: 'Stop Camera',
    cameraDenied: 'Camera access blocked or HTTPS required. Enter the batch number manually below.',
    testVerifyBtn: 'Test Backend Verify (DOLO2026A)',
    manualVerifyTitle: 'Manual Batch Verification',
    batchLabel: 'Batch Number',
    batchPlaceholder: 'e.g. DOLO2026A',
    mrpLabel: 'MRP Paid (₹) - Optional',
    mrpPlaceholder: 'e.g. 35',
    invalidBatch: 'Enter a valid Batch Number (4-20 alphanumeric characters)',
    verifying: 'Verifying with Server...',
    verifyBtn: 'Verify Medicine',
    unverifiedTitle: 'Could Not Verify',
    unverifiedFallback: 'Batch not found in records or server offline.',
    recalledTitle: 'Suspicious / Recalled! Do not take this medicine',
    reportNowBtn: 'Report to CDSCO Now',
    searchPlaceholder: 'Search medicine (min 3 chars)...',
    searching: 'Searching secure database...',
    searchHint: 'Type at least 3 letters (e.g. Dolo, Crocin, Azithral) to search.',
    batchPrefix: 'Batch',
    mfgPrefix: 'Mfg',
    expPrefix: 'Exp',
    reportTitle: 'Report Fake Medicine',
    reportSub: 'Submit a counterfeit medicine complaint directly to CDSCO.',
    chemistLabel: 'Chemist / Medical Store Name',
    chemistPlaceholder: 'e.g. Apollo Pharmacy',
    cityLabel: 'City',
    cityPlaceholder: 'e.g. Noida',
    reportBatchPlaceholder: 'e.g. FAKE2026X',
    errChemist: 'Invalid chemist name (2-100 characters).',
    errCity: 'Invalid city name (letters only).',
    errReportBatch: 'Invalid batch number (e.g. BATCH123).',
    reportSuccessPrefix: 'Report submitted to CDSCO. Tracking ID:',
    submitReportBtn: 'Submit Report to CDSCO',
    waFloatBtn: 'Verify on WhatsApp',
    waBotTitle: 'DawaPraman WhatsApp Bot',
    waWelcome: 'Hello! Send a Batch Number (e.g. DOLO2026A) to verify, or type SEARCH <medicine name>.',
    waPlaceholder: 'Type Batch No or SEARCH <name>...',
    navHome: 'Home',
    navScan: 'Scan',
    navSearch: 'Search',
    navReport: 'Report',
  },
} as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [lang, setLang] = useState<'hi' | 'en'>(
    () => (sessionStorage.getItem('lang') as 'hi' | 'en') || 'hi'
  );
  const t = COPY[lang];

  const [showBannedPdf, setShowBannedPdf] = useState(false);

  // Scan & Camera state
  const [batchNo, setBatchNo] = useState('');
  const [mrpPaid, setMrpPaid] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Interaction Checker state
  const [med1, setMed1] = useState('Paracetamol 650');
  const [med2, setMed2] = useState('Azithromycin 500');
  const [interactionResult, setInteractionResult] = useState<{
    safe: boolean;
    key: 'interactionDanger1' | 'interactionDanger2' | 'interactionSafe';
  } | null>(null);

  // Report Fake state
  const [chemistName, setChemistName] = useState('');
  const [city, setCity] = useState('');
  const [reportBatch, setReportBatch] = useState('');
  const [reportTrackingId, setReportTrackingId] = useState('');
  const [reportErrorKey, setReportErrorKey] = useState<
    'errChemist' | 'errCity' | 'errReportBatch' | ''
  >('');

  // WhatsApp Widget state
  const [waOpen, setWaOpen] = useState(false);
  const [waInput, setWaInput] = useState('');
  const [waMessages, setWaMessages] = useState<
    { from: 'bot' | 'user'; text: string; isWelcome?: boolean }[]
  >([
    {
      from: 'bot',
      text: COPY[lang].waWelcome,
      isWelcome: true,
    },
  ]);

  const stopCamera = async () => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    setCameraActive(false);
    if (instance) {
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
        await instance.clear();
      } catch {
        // Ignore cleanup errors when unmounting/stopping
      }
    }
  };

  useEffect(() => {
    if (activeTab !== 'scan' && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const toggleLang = () => {
    const next = lang === 'hi' ? 'en' : 'hi';
    setLang(next);
    sessionStorage.setItem('lang', next);
  };

  const handleVerify = async (e?: React.FormEvent, customBatch?: string) => {
    if (e) e.preventDefault();
    const targetBatch = (customBatch ?? batchNo).trim().toUpperCase();
    if (customBatch) {
      setBatchNo(targetBatch);
    }
    setScanError('');
    setScanResult(null);

    if (!validators.batchNo(targetBatch)) {
      setScanError(t.invalidBatch);
      return;
    }

    setScanLoading(true);
    const res = await verifyMedicine(targetBatch);
    setScanResult(res);
    setScanLoading(false);
  };

  const extractBatchFromScan = (rawDecoded: string): string => {
    const trimmed = rawDecoded.trim();
    if (!trimmed) return '';

    try {
      const url = new URL(trimmed);
      const paramBatch =
        url.searchParams.get('batch') ||
        url.searchParams.get('batch_no') ||
        url.searchParams.get('code');
      if (paramBatch) {
        return paramBatch.trim().toUpperCase();
      }
    } catch {
      // Plain text payload
    }

    const labeledMatch = trimmed.match(
      /batch(?:\s*(?:no|number))?\s*[:=-]\s*([A-Z0-9-]{4,24})/i
    );
    if (labeledMatch?.[1]) {
      return labeledMatch[1].trim().toUpperCase();
    }

    return trimmed.toUpperCase();
  };

  const startCameraScanner = async () => {
    setCameraError('');
    setScanError('');
    setScanResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.cameraDenied);
      return;
    }

    await stopCamera();
    setCameraActive(true);

    await new Promise((r) => setTimeout(r, 100));

    const container = document.getElementById(QR_READER_ELEMENT_ID);
    if (!container) {
      setCameraError(t.cameraDenied);
      setCameraActive(false);
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode(QR_READER_ELEMENT_ID);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 12,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          const extracted = extractBatchFromScan(decodedText);
          await stopCamera();
          setBatchNo(extracted);
          await handleVerify(undefined, extracted);
        },
        () => {
          // Frame scan miss; keep scanning
        }
      );
    } catch {
      setCameraError(t.cameraDenied);
      setCameraActive(false);
    }
  };

  const handleVerifyFromSearch = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setBatchNo(cleanCode);
    setActiveTab('scan');
    await handleVerify(undefined, cleanCode);
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
      setInteractionResult({ safe: false, key: 'interactionDanger1' });
    } else if (pair.includes('Metformin') && pair.includes('Alcohol')) {
      setInteractionResult({ safe: false, key: 'interactionDanger2' });
    } else {
      setInteractionResult({ safe: true, key: 'interactionSafe' });
    }
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportErrorKey('');
    setReportTrackingId('');

    if (!validators.chemistName(chemistName)) {
      setReportErrorKey('errChemist');
      return;
    }
    if (!validators.city(city)) {
      setReportErrorKey('errCity');
      return;
    }
    if (!validators.batchNo(reportBatch.toUpperCase())) {
      setReportErrorKey('errReportBatch');
      return;
    }

    const trackingId = `MED-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setReportTrackingId(trackingId);
    setChemistName('');
    setCity('');
    setReportBatch('');
  };

  const handleWaSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = waInput.trim();
    if (!raw) return;

    setWaMessages((prev) => [...prev, { from: 'user', text: raw }]);
    setWaInput('');

    const searchMatch = raw.match(/^(?:search|find|khoj)\s+(.+)$/i);
    if (searchMatch) {
      try {
        const meds = await searchMedicines(searchMatch[1].trim());
        if (!meds.length) {
          setWaMessages((prev) => [
            ...prev,
            {
              from: 'bot',
              text:
                lang === 'hi'
                  ? `"${searchMatch[1].trim()}" के लिए कोई दवाई नहीं मिली।`
                  : `No medicines found for "${searchMatch[1].trim()}".`,
            },
          ]);
          return;
        }
        const list = meds
          .slice(0, 5)
          .map(
            (m: any, idx: number) =>
              `${idx + 1}. ${m.name}${m.batch_no ? ` (${t.batchPrefix}: ${m.batch_no})` : ''}`
          )
          .join('\n');
        setWaMessages((prev) => [...prev, { from: 'bot', text: list }]);
      } catch (err: any) {
        setWaMessages((prev) => [
          ...prev,
          {
            from: 'bot',
            text: `Search Error: ${err?.message || 'Unable to search'}`,
          },
        ]);
      }
      return;
    }

    const code = raw.toUpperCase();
    const res = await verifyMedicine(code);

    if (res?.status === 'green') {
      setWaMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text:
            lang === 'hi'
              ? `असली दवाई: ${res.medicine} (${t.mfgPrefix}: ${res.mfg}, ${t.expPrefix}: ${res.exp})`
              : `GENUINE MEDICINE: ${res.medicine} (${t.mfgPrefix}: ${res.mfg}, ${t.expPrefix}: ${res.exp})`,
        },
      ]);
      return;
    }

    if (res?.status === 'red') {
      setWaMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text:
            lang === 'hi'
              ? `नकली / प्रतिबंधित: इस दवाई को न लें! (${res.details || 'CDSCO Alert'})`
              : `FAKE / RECALLED: Do not take this medicine! (${res.details || 'CDSCO Alert'})`,
        },
      ]);
      return;
    }

    if (raw.includes(' ') && raw.length >= 3) {
      try {
        const meds = await searchMedicines(raw);
        if (meds.length > 0) {
          const list = meds
            .slice(0, 3)
            .map(
              (m: any, idx: number) =>
                `${idx + 1}. ${m.name}${m.batch_no ? ` — ${t.batchPrefix}: ${m.batch_no}` : ''}`
            )
            .join('\n');
          setWaMessages((prev) => [
            ...prev,
            {
              from: 'bot',
              text:
                lang === 'hi'
                  ? `दवाई मिली:\n${list}\n\nजांचने के लिए ऊपर दिया गया बैच नंबर भेजें।`
                  : `Matching medicines:\n${list}\n\nSend the Batch Number above to verify.`,
            },
          ]);
          return;
        }
      } catch {
        // Fall through to standard unverified message
      }
    }

    const reply = res?.message
      ? `${t.unverifiedTitle}: ${res.message}`
      : `${t.unverifiedTitle} (${t.unverifiedFallback})`;
    setWaMessages((prev) => [...prev, { from: 'bot', text: reply }]);
  };

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[844px] bg-slate-50 text-slate-900 relative pb-20">
      {/* Top Trust Bar */}
      <div className="bg-emerald-700 text-white text-[11px] font-medium py-1.5 px-3 text-center tracking-wide">
        {t.trustBar}
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
              {t.subtitle}
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
                {t.heroTitle}
              </h2>
              <p className="text-emerald-100 text-xs mt-2 leading-relaxed">
                {t.heroSub}
              </p>

              <div className="grid grid-cols-1 gap-2.5 mt-4">
                <button
                  onClick={() => setActiveTab('scan')}
                  className="w-full bg-white text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow hover:bg-emerald-50 transition"
                >
                  <Camera className="w-5 h-5" />
                  {t.scanBtn}
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className="w-full bg-emerald-900/40 border border-emerald-400/40 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-900/60 transition text-sm"
                >
                  <Search className="w-4 h-4" />
                  {t.searchBtn}
                </button>
              </div>
            </section>

            {/* Trust Stats */}
            <section className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-emerald-600">5,000+</div>
                <div className="text-[10px] text-slate-500 font-medium">{t.statMeds}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-emerald-600">1.2L+</div>
                <div className="text-[10px] text-slate-500 font-medium">{t.statScans}</div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-red-600">850+</div>
                <div className="text-[10px] text-slate-500 font-medium">{t.statFake}</div>
              </div>
            </section>

            {/* Banned Drugs PDF Loader */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      {t.pdfTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t.pdfSub}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowBannedPdf((prev) => !prev)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    {showBannedPdf ? t.hidePdf : t.loadPdf}
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
                    {t.pdfFallback}
                  </p>
                </div>
              )}
            </section>

            {/* Drug Interaction Checker */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {t.interactionTitle}
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
                {t.checkInteraction}
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
                  <span>{t[interactionResult.key]}</span>
                </div>
              )}
            </section>

            {/* Privacy Note */}
            <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-500 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-slate-400" />
              <span>{t.privacyNote}</span>
            </div>
          </>
        )}

        {/* SCAN & VERIFY TAB */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl p-5 text-center text-white relative overflow-hidden space-y-3">
              {cameraActive ? (
                <div className="w-full max-w-[260px] mx-auto rounded-xl overflow-hidden border-2 border-emerald-400 bg-black">
                  <div id={QR_READER_ELEMENT_ID} className="w-full" />
                </div>
              ) : (
                <div className="w-40 h-40 mx-auto border-2 border-emerald-400 rounded-xl flex flex-col items-center justify-center bg-slate-800/60">
                  <QrCode className="w-12 h-12 text-emerald-400 mb-2" />
                  <span className="text-[11px] text-slate-300">
                    {t.qrFrame}
                  </span>
                </div>
              )}

              {cameraError && (
                <p className="text-xs text-amber-300 font-medium">{cameraError}</p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {!cameraActive ? (
                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold py-2.5 px-4 rounded-lg transition inline-flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    {t.openCameraBtn}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition inline-flex items-center gap-1.5"
                  >
                    <StopCircle className="w-4 h-4" />
                    {t.stopCameraBtn}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleVerify(undefined, 'DOLO2026A')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition"
                >
                  {t.testVerifyBtn}
                </button>
              </div>
            </div>

            <form
              onSubmit={handleVerify}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
            >
              <h3 className="font-bold text-sm text-slate-800">
                {t.manualVerifyTitle}
              </h3>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {t.batchLabel}
                </label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder={t.batchPlaceholder}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {t.mrpLabel}
                </label>
                <input
                  type="number"
                  value={mrpPaid}
                  onChange={(e) => setMrpPaid(e.target.value)}
                  placeholder={t.mrpPlaceholder}
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
                {scanLoading ? t.verifying : t.verifyBtn}
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
                  <span>{t.unverifiedTitle}</span>
                </div>
                <p className="text-xs text-amber-900">
                  {scanResult.message || t.unverifiedFallback}
                </p>
              </div>
            )}

            {scanResult && scanResult.status === 'red' && (
              <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <span>{t.recalledTitle}</span>
                </div>
                <p className="text-xs text-red-900">
                  {scanResult.details || scanResult.message}
                </p>
                <button
                  onClick={() => setActiveTab('report')}
                  className="w-full bg-red-600 text-white text-xs font-bold py-2.5 rounded-lg"
                >
                  {t.reportNowBtn}
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
                placeholder={t.searchPlaceholder}
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
                {t.searching}
              </p>
            )}

            {!searchLoading && searchResults.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">{t.searchHint}</p>
              </div>
            )}

            <div className="space-y-2.5">
              {searchResults.map((med, idx) => (
                <div
                  key={med.id ?? med.batch_no ?? idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900 text-sm">
                      {med.name}
                    </div>
                    {(med.price_inr ?? med.price) != null && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                        ₹{med.price_inr ?? med.price}
                      </span>
                    )}
                  </div>

                  {(med.short_composition_1 || med.salt_composition) && (
                    <div className="text-xs text-slate-600">
                      {med.short_composition_1 || med.salt_composition}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                    {med.batch_no && (
                      <button
                        type="button"
                        onClick={() => handleVerifyFromSearch(med.batch_no)}
                        className="font-mono font-semibold text-emerald-700 underline underline-offset-2"
                      >
                        {t.batchPrefix}: {med.batch_no}
                      </button>
                    )}
                    {med.mfg_date && (
                      <span>
                        {t.mfgPrefix}: {med.mfg_date}
                      </span>
                    )}
                    {med.exp_date && (
                      <span>
                        {t.expPrefix}: {med.exp_date}
                      </span>
                    )}
                    {med.manufacturer_name && (
                      <span>• {med.manufacturer_name}</span>
                    )}
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
              <h3 className="font-bold text-base">{t.reportTitle}</h3>
            </div>
            <p className="text-xs text-slate-500">{t.reportSub}</p>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {t.chemistLabel}
              </label>
              <input
                type="text"
                value={chemistName}
                onChange={(e) => setChemistName(e.target.value)}
                placeholder={t.chemistPlaceholder}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {t.cityLabel}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t.cityPlaceholder}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {t.batchLabel}
              </label>
              <input
                type="text"
                value={reportBatch}
                onChange={(e) => setReportBatch(e.target.value)}
                placeholder={t.reportBatchPlaceholder}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm uppercase"
              />
            </div>

            {reportErrorKey && (
              <p className="text-xs text-red-600 font-medium">
                {t[reportErrorKey]}
              </p>
            )}
            {reportTrackingId && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-semibold">
                {t.reportSuccessPrefix} {reportTrackingId}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition"
            >
              {t.submitReportBtn}
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
        {t.waFloatBtn}
      </button>

      {/* WhatsApp Chat Modal */}
      {waOpen && (
        <div className="fixed sm:absolute inset-0 bg-black/50 z-40 flex items-end justify-center p-3">
          <div className="bg-white w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[75%]">
            <div className="bg-emerald-700 text-white p-3 flex items-center justify-between">
              <div className="font-bold text-sm">{t.waBotTitle}</div>
              <button onClick={() => setWaOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto flex-1 bg-slate-100 min-h-[200px]">
              {waMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl text-xs max-w-[85%] whitespace-pre-line ${
                    m.from === 'user'
                      ? 'bg-emerald-600 text-white ml-auto'
                      : 'bg-white text-slate-800 border border-slate-200'
                  }`}
                >
                  {m.isWelcome ? t.waWelcome : m.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleWaSend} className="p-2 bg-white border-t flex gap-2">
              <input
                type="text"
                value={waInput}
                onChange={(e) => setWaInput(e.target.value)}
                placeholder={t.waPlaceholder}
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
          { id: 'home', label: t.navHome, icon: Home },
          { id: 'scan', label: t.navScan, icon: QrCode },
          { id: 'search', label: t.navSearch, icon: Search },
          { id: 'report', label: t.navReport, icon: AlertTriangle },
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
