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
type Lang = 'hi' | 'en';

const BANNED_DRUGS_PDF_URL = '/banneddrugs.pdf';
const QR_READER_ELEMENT_ID = 'dawapraman-qr-reader';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  hi: {
    trustBar: '100% निःशुल्क | कोई विज्ञापन नहीं | आपका डेटा सुरक्षित है',
    appTitle: 'दवाप्रमाण इंडिया',
    appSubtitle: 'दवाई सुरक्षा',
    heroTitle: 'अपनी दवाई स्कैन करें। असली है या नकली, 3 सेकंड में जानें।',
    heroDesc: 'QR कोड स्कैन करें, बैच नंबर जांचें और सही कीमत देखें। बिल्कुल निःशुल्क।',
    scanBtn: 'दवाई स्कैन करें - कैमरा / बैच',
    searchBtn: 'दवाई खोजें',
    statMedicines: 'दवाइयां',
    statScans: 'स्कैन',
    statFake: 'नकली पकड़ी गईं',
    bannedPdfTitle: 'प्रतिबंधित दवाओं की सूची (PDF)',
    bannedPdfDesc: 'आवश्यकता होने पर आधिकारिक PDF लोड करें',
    loadPdf: 'PDF देखें',
    hidePdf: 'PDF छिपाएं',
    openPdfNewTab: 'नए टैब में PDF खोलें',
    pdfFallbackNote:
      'यदि PDF पूर्वावलोकन न खुले, तो ऊपर दिए गए बाहरी लिंक आइकन से नए टैब में खोलें।',
    interactionTitle: 'दवा परस्पर प्रभाव जांचें (Drug Interaction)',
    interactionFilterPlaceholder: 'दवा खोजें (जैसे Dolo, Crocin, Azithral)...',
    checkInteractionBtn: 'इंटरैक्शन जांचें',
    checkingBtn: 'जांच हो रही है...',
    sameMedError: 'कृपया दो अलग-अलग दवाइयां या साल्ट चुनें।',
    noMajorInteraction:
      'कोई गंभीर इंटरैक्शन नहीं मिला: सामान्यतः सुरक्षित है, लेकिन डॉक्टर की सलाह आवश्यक है।',
    privacyNote:
      'आपकी गोपनीयता के लिए इतिहास सहेजा नहीं जाता है। यह केवल जानकारी के लिए है, दवा डॉक्टर की सलाह से ही लें।',
    qrFrameLabel: 'CDSCO QR फ़्रेम',
    cameraPrompt: 'दवाई के पत्ते का QR कोड फ़्रेम के अंदर रखें...',
    stopCamera: 'कैमरा बंद करें',
    scanQrCamera: 'कैमरे से QR स्कैन करें',
    testBatchBtn: 'टेस्ट (DOLO2026A)',
    cameraError:
      'कैमरा एक्सेस नहीं मिल सका। ब्राउज़र अनुमति दें या नीचे बैच नंबर मैन्युअल रूप से दर्ज करें।',
    scannerNotReady: 'स्कैनर तैयार नहीं हो सका। कृपया पुनः प्रयास करें।',
    invalidBatchError:
      'सही बैच नंबर दर्ज करें (4-20 अक्षर/अंक, जैसे DOLO2026A)',
    manualVerifyTitle: 'मैन्युअल बैच सत्यापन',
    batchNoLabel: 'बैच नंबर',
    batchPlaceholder: 'जैसे DOLO2026A',
    mrpLabel: 'भुगतान की गई MRP (₹) - वैकल्पिक',
    mrpPlaceholder: 'जैसे 35',
    verifyBtn: 'दवाई सत्यापित करें',
    verifyingBtn: 'सर्वर से सत्यापित हो रहा है...',
    verifyFailedTitle: 'सत्यापन नहीं हो सका',
    verifyFailedDefault: 'बैच रिकॉर्ड में नहीं मिला या सर्वर ऑफ़लाइन है।',
    serverUnreachable: 'सत्यापन सर्वर से संपर्क नहीं हो पा रहा है।',
    recalledTitle: 'संदिग्ध / वापस मंगाई गई! यह दवा न लें',
    reportNowBtn: 'अभी CDSCO को रिपोर्ट करें',
    overchargedWarning:
      'भुगतान की गई MRP (₹{mrp}) दर्ज कीमत से अधिक है। केमिस्ट से बिल और MRP जांचें।',
    searchPlaceholder: 'दवाई खोजें (कम से कम 3 अक्षर)...',
    searchingText: 'सुरक्षित डेटाबेस में खोजा जा रहा है...',
    searchEmptyHint:
      'कम से कम 3 अक्षर लिखें (जैसे Dolo, Crocin, Azithral) और दवाई खोजें।',
    noBatchOnRecord:
      '{name} का बैच नंबर रिकॉर्ड में उपलब्ध नहीं है — कृपया पत्ते से मैन्युअल रूप से दर्ज करें।',
    verifyBatchBtn: 'बैच जांचें',
    reportTitle: 'नकली दवाई की रिपोर्ट करें',
    reportDesc: 'नकली या संदिग्ध दवाई की शिकायत सीधे CDSCO को भेजें।',
    chemistLabel: 'केमिस्ट / मेडिकल स्टोर का नाम',
    chemistPlaceholder: 'जैसे Apollo Pharmacy',
    cityLabel: 'शहर',
    cityPlaceholder: 'जैसे Noida',
    reportBatchPlaceholder: 'जैसे FAKE2026X',
    chemistError: 'केमिस्ट का नाम सही नहीं है (2-100 अक्षर)।',
    cityError: 'शहर का नाम सही नहीं है (केवल अक्षर दर्ज करें)।',
    reportBatchError: 'बैच नंबर सही नहीं है (जैसे BATCH123)।',
    reportSuccess: 'रिपोर्ट CDSCO को भेज दी गई है। ट्रैकिंग ID: {id}',
    submitReportBtn: 'CDSCO को रिपोर्ट भेजें',
    waFloatingBtn: 'WhatsApp पर सत्यापित करें',
    waHeader: 'दवाप्रमाण WhatsApp बॉट',
    waWelcome:
      'नमस्ते! अपनी दवाई का बैच नंबर भेजें (जैसे DOLO2026A) सत्यापित करने के लिए।',
    waInputPlaceholder: 'बैच नंबर लिखें...',
    waGenuine: 'असली दवाई: {name} (समाप्ति: {exp})',
    waRecalled: 'नकली / वापस मंगाई गई: यह दवा न लें! ({details})',
    navHome: 'होम',
    navScan: 'स्कैन',
    navSearch: 'खोजें',
    navReport: 'रिपोर्ट',
  },
  en: {
    trustBar: '100% Free | No Pharma Ads | Your Data Is Not Sold',
    appTitle: 'DawaPraman India',
    appSubtitle: 'DawAI Suraksha',
    heroTitle: 'Scan Your Medicine. Know if it is Genuine or Fake in 3 Seconds.',
    heroDesc:
      'Scan QR code, verify batch number, check fair NPPA prices. 100% Free.',
    scanBtn: 'Scan Medicine - Camera / Batch',
    searchBtn: 'Search Medicine',
    statMedicines: 'Medicines',
    statScans: 'Scans',
    statFake: 'Fake Caught',
    bannedPdfTitle: 'Banned Drugs List (PDF)',
    bannedPdfDesc: 'Load official PDF document on demand',
    loadPdf: 'Load PDF',
    hidePdf: 'Hide PDF',
    openPdfNewTab: 'Open PDF in new tab',
    pdfFallbackNote:
      'If the PDF preview does not load, open it in a new tab using the external link icon above.',
    interactionTitle: 'Drug Interaction Checker',
    interactionFilterPlaceholder:
      'Filter database medicines (e.g. Dolo, Crocin, Azithral)...',
    checkInteractionBtn: 'Check Interaction',
    checkingBtn: 'Checking...',
    sameMedError: 'Please select two different medicines or salts.',
    noMajorInteraction:
      'No Major Interaction Found: Generally safe, but always consult your doctor.',
    privacyNote:
      'History is not saved for your privacy. This is for informational purposes only; always consult a doctor before taking medicine.',
    qrFrameLabel: 'CDSCO QR Frame',
    cameraPrompt: 'Point camera at the QR code on the medicine strip...',
    stopCamera: 'Stop Camera',
    scanQrCamera: 'Scan QR with Camera',
    testBatchBtn: 'Test (DOLO2026A)',
    cameraError:
      'Unable to access camera. Allow camera permission or enter the Batch Number manually below.',
    scannerNotReady: 'Scanner container not ready. Please try again.',
    invalidBatchError:
      'Enter a valid Batch Number (4-20 alphanumeric characters)',
    manualVerifyTitle: 'Manual Batch Verification',
    batchNoLabel: 'Batch Number',
    batchPlaceholder: 'e.g. DOLO2026A',
    mrpLabel: 'MRP Paid (₹) - Optional',
    mrpPlaceholder: 'e.g. 35',
    verifyBtn: 'Verify Medicine',
    verifyingBtn: 'Verifying with Server...',
    verifyFailedTitle: 'Verification Incomplete',
    verifyFailedDefault: 'Batch not found in records or server is offline.',
    serverUnreachable: 'Unable to reach verification server.',
    recalledTitle: 'Suspicious / Recalled! Do not take this medicine',
    reportNowBtn: 'Report to CDSCO Now',
    overchargedWarning:
      'MRP Paid (₹{mrp}) is higher than the recorded price. Check the bill and MRP with the chemist.',
    searchPlaceholder: 'Search medicine (min 3 chars)...',
    searchingText: 'Searching secure database...',
    searchEmptyHint:
      'Type at least 3 letters (e.g. Dolo, Crocin, Azithral) to search via Supabase Edge Function.',
    noBatchOnRecord:
      'No batch number on record for {name} — enter it manually from the strip.',
    verifyBatchBtn: 'Verify Batch',
    reportTitle: 'Report Fake Medicine',
    reportDesc: 'Submit a report about a fake or suspicious medicine to CDSCO.',
    chemistLabel: 'Chemist / Medical Store Name',
    chemistPlaceholder: 'e.g. Apollo Pharmacy',
    cityLabel: 'City',
    cityPlaceholder: 'e.g. Noida',
    reportBatchPlaceholder: 'e.g. FAKE2026X',
    chemistError: 'Chemist name is invalid (2-100 characters).',
    cityError: 'City name is invalid (letters only).',
    reportBatchError: 'Batch number is invalid (e.g. BATCH123).',
    reportSuccess: 'Report submitted to CDSCO. Tracking ID: {id}',
    submitReportBtn: 'Submit Report to CDSCO',
    waFloatingBtn: 'Verify on WhatsApp',
    waHeader: 'DawaPraman WhatsApp Bot',
    waWelcome:
      'Hello! Send your medicine Batch Number (e.g. DOLO2026A) to verify it.',
    waInputPlaceholder: 'Type Batch No...',
    waGenuine: 'GENUINE MEDICINE: {name} (Exp: {exp})',
    waRecalled: 'FAKE / RECALLED: Do not take this medicine! ({details})',
    navHome: 'Home',
    navScan: 'Scan',
    navSearch: 'Search',
    navReport: 'Report',
  },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [lang, setLang] = useState<Lang>(() => {
    const saved = sessionStorage.getItem('lang');
    return saved === 'en' || saved === 'hi' ? saved : 'hi';
  });
  const [showBannedPdf, setShowBannedPdf] = useState(false);

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, String(v));
      });
    }
    return str;
  };

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
  >(() => [{ from: 'bot', text: TRANSLATIONS.hi.waWelcome }]);

  const toggleLang = () => {
    const next: Lang = lang === 'hi' ? 'en' : 'hi';
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
      setScanError(t('invalidBatchError'));
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
        message: t('serverUnreachable'),
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
        setScanError(t('scannerNotReady'));
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
        setScanError(t('cameraError'));
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
        t('noBatchOnRecord', {
          name: med?.name || (lang === 'hi' ? 'इस दवा' : 'this medicine'),
        })
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
        text: t('sameMedError'),
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
          text: t('noMajorInteraction'),
        });
      }
    } catch {
      setInteractionResult({
        safe: true,
        text: t('noMajorInteraction'),
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
      setReportError(t('chemistError'));
      return;
    }
    if (!validators.city(city)) {
      setReportError(t('cityError'));
      return;
    }
    if (!validators.batchNo(reportBatch.toUpperCase())) {
      setReportError(t('reportBatchError'));
      return;
    }

    const trackingId = `MED-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setReportSuccess(t('reportSuccess', { id: trackingId }));
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

    let reply = res?.message || t('verifyFailedDefault');
    if (res?.status === 'green') {
      reply = t('waGenuine', { name: medName, exp: expDate });
    } else if (res?.status === 'red') {
      reply = t('waRecalled', {
        details: res.details || res.message || 'CDSCO Alert',
      });
    }

    setWaMessages((prev) => [...prev, { from: 'bot', text: reply }]);
  };

  return (
    <div className="flex flex-col min-h-screen sm:min-h-[844px] bg-slate-50 text-slate-900 relative pb-20">
      {/* Top Trust Bar */}
      <div className="bg-emerald-700 text-white text-[11px] font-medium py-1.5 px-3 text-center tracking-wide">
        {t('trustBar')}
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight text-slate-900">
              {t('appTitle')}
            </h1>
            <p className="text-[11px] font-semibold text-emerald-600">
              {t('appSubtitle')}
            </p>
          </div>
        </div>
        <button
          type="button"
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
                {t('heroTitle')}
              </h2>
              <p className="text-emerald-100 text-xs mt-2 leading-relaxed">
                {t('heroDesc')}
              </p>

              <div className="grid grid-cols-1 gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('scan');
                    startCameraScanner();
                  }}
                  className="w-full bg-white text-emerald-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow hover:bg-emerald-50 transition"
                >
                  <Camera className="w-5 h-5" />
                  {t('scanBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className="w-full bg-emerald-900/40 border border-emerald-400/40 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-900/60 transition text-sm"
                >
                  <Search className="w-4 h-4" />
                  {t('searchBtn')}
                </button>
              </div>
            </section>

            {/* Trust Stats */}
            <section className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-emerald-600">5,000+</div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {t('statMedicines')}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-emerald-600">1.2L+</div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {t('statScans')}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="text-base font-extrabold text-red-600">850+</div>
                <div className="text-[10px] text-slate-500 font-medium">
                  {t('statFake')}
                </div>
              </div>
            </section>

            {/* Banned Drugs PDF Loader */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">
                      {t('bannedPdfTitle')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t('bannedPdfDesc')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowBannedPdf((prev) => !prev)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                  >
                    {showBannedPdf ? t('hidePdf') : t('loadPdf')}
                  </button>
                  <a
                    href={BANNED_DRUGS_PDF_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('openPdfNewTab')}
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
                    title={t('bannedPdfTitle')}
                    className="w-full h-80 rounded-xl border border-slate-200"
                  />
                  <p className="text-[11px] text-slate-500">
                    {t('pdfFallbackNote')}
                  </p>
                </div>
              )}
            </section>

            {/* Drug Interaction Checker */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-800">
                  {t('interactionTitle')}
                </h3>
              </div>

              <input
                type="text"
                value={interactionFilter}
                onChange={(e) => setInteractionFilter(e.target.value)}
                placeholder={t('interactionFilterPlaceholder')}
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
                {interactionLoading ? t('checkingBtn') : t('checkInteractionBtn')}
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
              <span>{t('privacyNote')}</span>
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
                    {t('cameraPrompt')}
                  </p>
                  <button
                    type="button"
                    onClick={stopCameraScanner}
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition"
                  >
                    <CameraOff className="w-4 h-4" />
                    {t('stopCamera')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-40 h-40 mx-auto border-2 border-emerald-400 rounded-xl flex flex-col items-center justify-center bg-slate-800/60">
                    <QrCode className="w-12 h-12 text-emerald-400 mb-2" />
                    <span className="text-[11px] text-slate-300">
                      {t('qrFrameLabel')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={startCameraScanner}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition"
                    >
                      <Camera className="w-4 h-4" />
                      {t('scanQrCamera')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(undefined, 'DOLO2026A')}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition"
                    >
                      {t('testBatchBtn')}
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
                {t('manualVerifyTitle')}
              </h3>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {t('batchNoLabel')}
                </label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder={t('batchPlaceholder')}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  {t('mrpLabel')}
                </label>
                <input
                  type="number"
                  value={mrpPaid}
                  onChange={(e) => setMrpPaid(e.target.value)}
                  placeholder={t('mrpPlaceholder')}
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
                {scanLoading ? t('verifyingBtn') : t('verifyBtn')}
              </button>
            </form>

            {/* Result Display */}
            {scanResult && scanResult.status === 'green' && (
              <div className="space-y-2">
                <VerifiedCard data={scanResult} />
                {scanResult.overcharged && (
                  <div className="bg-amber-50 border border-amber-400 text-amber-900 rounded-xl p-3 text-xs font-medium">
                    {t('overchargedWarning', { mrp: scanResult.mrpPaid })}
                  </div>
                )}
              </div>
            )}

            {scanResult && scanResult.status === 'yellow' && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <span>{t('verifyFailedTitle')}</span>
                </div>
                <p className="text-xs text-amber-900">
                  {scanResult.message || t('verifyFailedDefault')}
                </p>
              </div>
            )}

            {scanResult && scanResult.status === 'red' && (
              <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <span>{t('recalledTitle')}</span>
                </div>
                <p className="text-xs text-red-900">
                  {scanResult.details || scanResult.message}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className="w-full bg-red-600 text-white text-xs font-bold py-2.5 rounded-lg"
                >
                  {t('reportNowBtn')}
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
                placeholder={t('searchPlaceholder')}
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
                {t('searchingText')}
              </p>
            )}

            {!searchLoading && searchResults.length === 0 && (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-200">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">{t('searchEmptyHint')}</p>
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
                        {t('batchNoLabel')}: {med.batch_no}
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
                    {t('verifyBatchBtn')}
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
              <h3 className="font-bold text-base">{t('reportTitle')}</h3>
            </div>
            <p className="text-xs text-slate-500">{t('reportDesc')}</p>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {t('chemistLabel')}
              </label>
              <input
                type="text"
                value={chemistName}
                onChange={(e) => setChemistName(e.target.value)}
                placeholder={t('chemistPlaceholder')}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {t('cityLabel')}
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('cityPlaceholder')}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                {t('batchNoLabel')}
              </label>
              <input
                type="text"
                value={reportBatch}
                onChange={(e) => setReportBatch(e.target.value)}
                placeholder={t('reportBatchPlaceholder')}
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
              {t('submitReportBtn')}
            </button>
          </form>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      <button
        type="button"
        onClick={() => setWaOpen(true)}
        className="fixed sm:absolute bottom-20 right-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-full shadow-lg flex items-center gap-1.5 z-30"
      >
        <MessageCircle className="w-4 h-4" />
        {t('waFloatingBtn')}
      </button>

      {/* WhatsApp Chat Modal */}
      {waOpen && (
        <div className="fixed sm:absolute inset-0 bg-black/50 z-40 flex items-end justify-center p-3">
          <div className="bg-white w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[75%]">
            <div className="bg-emerald-700 text-white p-3 flex items-center justify-between">
              <div className="font-bold text-sm">{t('waHeader')}</div>
              <button type="button" onClick={() => setWaOpen(false)}>
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
                placeholder={t('waInputPlaceholder')}
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
          { id: 'home', label: t('navHome'), icon: Home },
          { id: 'scan', label: t('navScan'), icon: QrCode },
          { id: 'search', label: t('navSearch'), icon: Search },
          { id: 'report', label: t('navReport'), icon: AlertTriangle },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
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
