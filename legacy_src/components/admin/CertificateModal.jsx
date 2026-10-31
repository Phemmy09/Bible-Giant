import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Award, Crown, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ZONE_COLORS } from '@/lib/constants';

export default function CertificateModal({ isOpen, onClose, zones = [], reveals = [] }) {
  const certificateRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id || '');
  const [playerNames, setPlayerNames] = useState('Bro. Emmanuel Okunola & Sis. Faith Adenigba');
  const [issueDate, setIssueDate] = useState(new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }));
  const [customRank, setCustomRank] = useState('');

  if (!isOpen) return null;

  const sortedZones = [...zones.filter(z => !z.archived)].sort((a, b) => b.score - a.score);
  const currentZone = zones.find(z => z.id === selectedZoneId) || sortedZones[0];
  const currentRank = sortedZones.findIndex(z => z.id === currentZone?.id) + 1;

  const getRankTitle = (rank) => {
    if (customRank) return customRank;
    if (rank === 1) return 'TOURNAMENT CHAMPION — 1ST PLACE';
    if (rank === 2) return 'FIRST RUNNER-UP — 2ND PLACE';
    if (rank === 3) return 'SECOND RUNNER-UP — 3RD PLACE';
    return `OUTSTANDING FINALIST — ${rank}TH PLACE`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    try {
      const element = certificateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#060B19',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AFC_Bible_Giant_Certificate_${currentZone?.name || 'Winner'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl bg-afc-navy-deep border border-afc-gold/30 rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-afc-gold/20 bg-afc-navy-mid/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-afc-gold/10 border border-afc-gold/30 flex items-center justify-center text-afc-gold">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg font-bold text-gold-gradient">
                  Official Certificate of Scriptural Mastery
                </h3>
                <p className="font-outfit text-xs text-afc-ivory-muted/60">
                  Apostolic Faith Church Ekiti Area • 2030 Broadcast Standard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-xl border border-afc-gold/30 hover:border-afc-gold text-afc-gold font-outfit text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="px-4 py-1.5 rounded-xl bg-gradient-gold text-afc-navy font-cinzel text-xs font-bold flex items-center gap-1.5 hover:shadow-gold-intense transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Generating PDF...' : 'Download PDF'}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-afc-ivory-muted/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Configuration Toolbar */}
          <div className="px-6 py-3 bg-afc-navy-mid/40 border-b border-afc-gold/10 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-outfit text-afc-gold uppercase tracking-wider mb-1">
                Recipient Zone / Unit
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className="w-full bg-afc-navy border border-afc-gold/30 rounded-lg px-3 py-1.5 text-xs text-afc-ivory focus:border-afc-gold focus:outline-none font-outfit"
              >
                {sortedZones.map((z, idx) => (
                  <option key={z.id} value={z.id}>
                    #{idx + 1} {z.name} ({z.score} pts)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-outfit text-afc-gold uppercase tracking-wider mb-1">
                Named Representatives (Optional)
              </label>
              <input
                type="text"
                value={playerNames}
                onChange={(e) => setPlayerNames(e.target.value)}
                placeholder="e.g. Bro. Peter & Sis. Mary"
                className="w-full bg-afc-navy border border-afc-gold/30 rounded-lg px-3 py-1.5 text-xs text-afc-ivory focus:border-afc-gold focus:outline-none font-outfit"
              />
            </div>
            <div>
              <label className="block text-[11px] font-outfit text-afc-gold uppercase tracking-wider mb-1">
                Ceremony Issue Date
              </label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-afc-navy border border-afc-gold/30 rounded-lg px-3 py-1.5 text-xs text-afc-ivory focus:border-afc-gold focus:outline-none font-outfit"
              />
            </div>
          </div>

          {/* Certificate Canvas Area */}
          <div className="p-6 md:p-8 bg-black/40 flex items-center justify-center overflow-x-auto">
            <div
              ref={certificateRef}
              id="afc-certificate-printable"
              className="relative w-[960px] h-[640px] bg-[#060B19] text-afc-ivory p-8 select-none flex-shrink-0 border-8 border-double border-[#C5A44E] rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden"
              style={{
                backgroundImage: 'radial-gradient(ellipse at 50% 50%, #0F172A 0%, #060B19 100%)',
              }}
            >
              {/* Ornate Gold Border Corners */}
              <div className="absolute top-2 left-2 w-16 h-16 border-t-2 border-l-2 border-[#E5C158] pointer-events-none" />
              <div className="absolute top-2 right-2 w-16 h-16 border-t-2 border-r-2 border-[#E5C158] pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-16 h-20 border-b-2 border-l-2 border-[#E5C158] pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-16 h-20 border-b-2 border-r-2 border-[#E5C158] pointer-events-none" />

              {/* Watermark Crest */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <img
                  src="/afc/jesus_light_logo.png"
                  alt="Watermark"
                  className="w-[480px] h-[480px] object-contain"
                />
              </div>

              {/* Top Emblems and Header */}
              <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-6 mb-2">
                  <img
                    src="/afc/jesus_light_logo.png"
                    alt="Jesus The Light"
                    className="w-14 h-14 object-contain filter drop-shadow-[0_0_10px_rgba(197,164,78,0.4)]"
                  />
                  <div>
                    <h1 className="font-cinzel text-xl font-bold tracking-[0.25em] text-[#E5C158] uppercase">
                      The Apostolic Faith Church
                    </h1>
                    <p className="font-cinzel text-xs font-semibold tracking-[0.3em] text-white/80">
                      AFM WECA • EKITI AREA & YOUTH DEVELOPMENT DIRECTORATE
                    </p>
                    <p className="font-cinzel text-[10px] tracking-[0.2em] text-[#C5A44E] italic mt-0.5">
                      "Jesus, The Light of the World" — John 8:12 • "Africa for Christ"
                    </p>
                  </div>
                  <img
                    src="/afc/ydd_logo_hq.png"
                    alt="YDD Logo"
                    className="w-14 h-14 object-contain filter drop-shadow-[0_0_10px_rgba(197,164,78,0.4)]"
                  />
                </div>

                <div className="w-64 h-[1px] bg-gradient-to-r from-transparent via-[#C5A44E] to-transparent mx-auto my-2" />

                <h2 className="font-cinzel text-3xl font-extrabold tracking-[0.18em] text-white mt-1">
                  CERTIFICATE OF SCRIPTURAL MASTERY
                </h2>
                <p className="font-outfit text-xs tracking-[0.35em] text-[#E5C158] uppercase font-bold mt-0.5">
                  WHO WANTS TO BE A BIBLE GIANT TOURNAMENT
                </p>
              </div>

              {/* Central Awardee Block */}
              <div className="relative z-10 text-center my-auto py-2">
                <p className="font-outfit text-xs text-white/70 tracking-widest uppercase mb-1">
                  This Sacred Commendation is Proudly Awarded to
                </p>

                <div className="inline-block relative">
                  <h3 className="font-cinzel text-4xl font-extrabold tracking-wider text-[#E5C158] px-8 py-1">
                    {currentZone?.name || 'IKERE ZONE'}
                  </h3>
                  <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#C5A44E] to-transparent mt-1" />
                </div>

                {playerNames && (
                  <p className="font-outfit text-sm text-white/90 mt-2 font-medium tracking-wide">
                    Represented by: <span className="font-semibold text-white underline decoration-[#C5A44E]/40 underline-offset-4">{playerNames}</span>
                  </p>
                )}

                <p className="font-outfit text-xs text-white/70 max-w-xl mx-auto mt-3 leading-relaxed">
                  In honor of steadfast devotion, biblical erudition, and scriptural accuracy demonstrated during the
                  Ekiti Area Bible Giant Tournament, recording an outstanding tournament score of{' '}
                  <span className="font-bold text-[#E5C158] font-cinzel">{currentZone?.score || 0} Points</span>.
                </p>

                <div className="inline-flex items-center gap-2 mt-3 px-5 py-1.5 rounded-full bg-[#C5A44E]/10 border border-[#C5A44E]/40 shadow-md">
                  <Crown className="w-4 h-4 text-[#E5C158]" />
                  <span className="font-cinzel text-xs font-bold tracking-widest text-[#E5C158]">
                    {getRankTitle(currentRank)}
                  </span>
                </div>
              </div>

              {/* Bottom Signatures & Seal */}
              <div className="relative z-10 grid grid-cols-3 items-end pt-3 border-t border-[#C5A44E]/20 text-center">
                {/* Signature 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-36 border-b border-white/40 pb-1 mb-1 font-signature text-lg text-white/90 italic">
                    Rev. Area Overseer
                  </div>
                  <p className="font-cinzel text-[10px] font-bold text-white tracking-wider">
                    AREA OVERSEER
                  </p>
                  <p className="font-outfit text-[9px] text-white/50">
                    The Apostolic Faith Church, Ekiti Area
                  </p>
                </div>

                {/* Golden Seal */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-[#E5C158] flex flex-col items-center justify-center bg-[#C5A44E]/10 p-2 shadow-inner">
                    <Sparkles className="w-5 h-5 text-[#E5C158] mb-0.5" />
                    <span className="font-cinzel text-[8px] font-extrabold text-[#E5C158] tracking-widest text-center uppercase leading-tight">
                      OFFICIAL SEAL
                    </span>
                    <span className="font-outfit text-[7px] text-white/60">YDD EKITI</span>
                  </div>
                  <p className="font-outfit text-[9px] text-white/50 mt-1">
                    Conferred: {issueDate}
                  </p>
                </div>

                {/* Signature 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-36 border-b border-white/40 pb-1 mb-1 font-signature text-lg text-white/90 italic">
                    Bro. YDD Coordinator
                  </div>
                  <p className="font-cinzel text-[10px] font-bold text-white tracking-wider">
                    YDD COORDINATOR / QUIZMASTER
                  </p>
                  <p className="font-outfit text-[9px] text-white/50">
                    Youth Development Directorate
                  </p>
                </div>
              </div>

              {/* Slogan Banner */}
              <div className="relative z-10 text-center pt-2">
                <p className="font-outfit text-[8px] tracking-wider text-white/40 italic">
                  "Raising & retaining an Army of Outstanding Youth going to Heaven & persuading others to come along."
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
