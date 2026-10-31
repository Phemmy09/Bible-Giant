import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  BookOpen,
  Shield,
  Church,
  Star,
  X,
  ChevronLeft,
  Globe,
  MapPin,
  Users,
  Sparkles,
  Smartphone,
  Tv,
  Award,
  Flame,
  Volume2
} from 'lucide-react';
import { BRAND, MOTTOES } from '@/lib/constants';
import HeritageModal from '@/components/HeritageModal';

const galleryImages = [
  {
    id: 1,
    title: 'Youth Camp Meeting Fellowship',
    desc: 'Mass gathering of youth delegates celebrating victory in the Word',
    src: '/afc/ydd_hero.jpg',
  },
  {
    id: 2,
    title: 'WECA Camp Meeting Scripture Session',
    desc: 'Hundreds of youth gathered for Bible Giant tournament at Faith City',
    src: '/afc/weca_camp_share.png',
  },
  {
    id: 3,
    title: 'Sacred Symphonic Orchestra',
    desc: 'The timeless musical standard — full classical strings, brass, and sacred chorale',
    src: '/afc/portland_orchestra.jpg',
  },
  {
    id: 4,
    title: 'YDD Singles & Leadership Forum',
    desc: 'Ekiti Area youth leaders training in spiritual discipline and doctrine',
    src: '/afc/ydd_singles_forum.jpg',
  },
  {
    id: 5,
    title: 'Campus Fellowship Assembly',
    desc: 'Higher institution ambassadors shining as lights of truth on campus',
    src: '/afc/ydd_campus_fellowship.jpg',
  },
  {
    id: 6,
    title: 'Teen Ministry Discipleship',
    desc: 'The next generation grounded in Bible memorization and holy conviction',
    src: '/afc/ydd_teen_ministry.jpg',
  },
];

export default function HomePage() {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isHeritageOpen, setIsHeritageOpen] = useState(false);
  const lightboxOpen = lightboxIndex !== null;

  return (
    <div className="min-h-screen bg-afc-navy relative overflow-hidden text-afc-ivory">
      {/* Ambient Celestial Glows */}
      <div className="bg-particles" />
      <div className="fixed inset-0 bg-gradient-celestial pointer-events-none z-0" />

      {/* Top Header Bar */}
      <header className="relative z-20 border-b border-afc-gold/15 bg-afc-navy/80 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/afc/jesus_light_logo.png"
            alt="Jesus The Light of the World"
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(212,160,23,0.5)]"
            onError={(e) => { e.target.src = '/afc/Jesus the light of the world.jpg'; }}
          />
          <div>
            <div className="font-cinzel text-xs md:text-sm font-bold tracking-wider text-afc-gold">
              {BRAND.appName}
            </div>
            <div className="font-outfit text-[10px] text-afc-ivory-muted/70 flex items-center gap-1.5">
              <span>{BRAND.areaName}</span>
              <span>•</span>
              <span className="text-afc-gold/80">YDD Live Tournament</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setIsHeritageOpen(true)}
            className="px-3 md:px-4 py-1.5 rounded-xl border border-afc-gold/30 hover:border-afc-gold bg-afc-gold/5 hover:bg-afc-gold/10 font-cinzel text-xs text-afc-gold flex items-center gap-1.5 transition-all"
          >
            <Church className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Heritage Pavilion</span>
            <span className="sm:hidden">Heritage</span>
          </button>

          <Link
            to="/admin/login"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-gold text-afc-navy font-cinzel font-bold text-xs shadow-gold-glow flex items-center gap-1.5 hover:scale-105 transition-transform"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Quizmaster</span>
          </Link>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        {/* Radial Gold Ambient */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-afc-gold/10 via-afc-gold/2 to-transparent rounded-full pointer-events-none" />

        {/* Floating Church Logos Ribbon */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8 flex items-center justify-center gap-5 sm:gap-8"
        >
          <div className="p-2 rounded-2xl bg-white/5 border border-afc-gold/30 backdrop-blur-md shadow-gold-glow hover:scale-110 transition-transform">
            <img
              src="/afc/jesus_light_logo.png"
              alt="Jesus The Light"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              onError={(e) => { e.target.src = '/afc/Jesus the light of the world.jpg'; }}
            />
          </div>
          <div className="w-px h-12 bg-afc-gold/30" />
          <div className="p-2 rounded-2xl bg-white/5 border border-afc-gold/30 backdrop-blur-md shadow-gold-glow hover:scale-110 transition-transform">
            <img
              src="/afc/ydd_logo.png"
              alt="YDD Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
              onError={(e) => { e.target.src = '/afc/ydd_logo_hq.png'; }}
            />
          </div>
        </motion.div>

        {/* Sacred Motto */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="font-cinzel text-afc-gold text-xs sm:text-sm tracking-[0.35em] uppercase mb-2 font-bold"
        >
          {MOTTOES.lightOfTheWorld.text}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.45, duration: 0.8 }}
          className="font-playfair italic text-afc-ivory-muted text-xs tracking-widest mb-6"
        >
          — {MOTTOES.lightOfTheWorld.scripture}
        </motion.p>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
          className="font-cinzel max-w-5xl mb-6"
        >
          <span className="block text-base sm:text-xl md:text-2xl text-afc-ivory-muted tracking-[0.25em] uppercase mb-2">
            Who Wants to Be a
          </span>
          <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-gold-shimmer leading-none drop-shadow-[0_4px_30px_rgba(212,160,23,0.4)]">
            Bible Giant
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="font-outfit text-afc-ivory-muted text-sm sm:text-lg md:text-xl max-w-3xl mb-4 leading-relaxed font-light"
        >
          The Ultra-Luxury 2030 Live Tournament Broadcast Platform — Ekiti Area Inter-Zonal Bible Challenge & WECA Digital Live Arena.
        </motion.p>

        {/* Area Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-afc-gold/10 border border-afc-gold/30 text-afc-gold text-xs font-outfit mb-10"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{BRAND.areaHQ}</span>
        </motion.div>

        {/* Four Tournament Action Gateways */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mb-12 text-left"
        >
          {/* Card 1: Stage Screen */}
          <Link
            to="/stage"
            className="glass-card p-5 rounded-2xl border border-afc-gold/30 hover:border-afc-gold group transition-all duration-300 hover:scale-[1.03] hover:shadow-gold-glow flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-afc-gold/15 flex items-center justify-center text-afc-gold mb-3 group-hover:bg-gradient-gold group-hover:text-afc-navy transition-all">
                <Tv className="w-5 h-5" />
              </div>
              <h3 className="font-cinzel text-base font-bold text-white group-hover:text-afc-gold transition-colors">
                Stage Broadcast
              </h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                Full-screen sanctuary projector display with dynamic number board, 60s timer ladder, and grand podium.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-afc-gold text-xs font-semibold">
              <span>Open Projector</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Team Device Client */}
          <Link
            to="/play"
            className="glass-card p-5 rounded-2xl border border-afc-gold/30 hover:border-afc-gold group transition-all duration-300 hover:scale-[1.03] hover:shadow-gold-glow flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 mb-3 group-hover:bg-emerald-500 group-hover:text-afc-navy transition-all">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-cinzel text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Team Device Client
              </h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                For competing Zone/Unit podium devices. Join with session code, view questions, and submit speed-scored answers.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-emerald-400 text-xs font-semibold">
              <span>Enter Arena</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Audience Companion App */}
          <Link
            to="/join"
            className="glass-card p-5 rounded-2xl border border-afc-gold/30 hover:border-afc-gold group transition-all duration-300 hover:scale-[1.03] hover:shadow-gold-glow flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-cinzel text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                Audience App
              </h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                Scan QR or enter session code from your phone. Answer along live, earn top-100 recognition, and predict winners.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-blue-400 text-xs font-semibold">
              <span>Join Audience</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Quizmaster Command Portal */}
          <Link
            to="/admin/login"
            className="glass-card p-5 rounded-2xl border border-afc-gold/30 hover:border-afc-gold group transition-all duration-300 hover:scale-[1.03] hover:shadow-gold-glow flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 mb-3 group-hover:bg-gradient-gold group-hover:text-afc-navy transition-all">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-cinzel text-base font-bold text-white group-hover:text-afc-gold transition-colors">
                Quizmaster Portal
              </h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                Operator command center: live stage control, number-board reveals, .docx question parser, zones, and podium.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-purple-400 text-xs font-semibold">
              <span>Operator Login</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>
      </section>

      {/* ===== FAITH IN FRAMES GALLERY WITH AUTHENTIC ASSETS ===== */}
      <section className="relative z-10 py-20 px-4 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-cinzel text-afc-gold text-xs tracking-[0.4em] uppercase mb-2">Moments of Faith</p>
          <h2 className="font-cinzel text-3xl sm:text-5xl font-bold text-gold-gradient mb-3">
            Faith in Frames
          </h2>
          <p className="font-outfit text-afc-ivory-muted/70 max-w-xl mx-auto text-sm">
            Glimpses of youth zeal, sacred music, camp meetings, and scriptural fellowship across Ekiti Area and WECA.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryImages.map((img, i) => (
            <motion.div
              key={img.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group cursor-pointer"
              onClick={() => setLightboxIndex(i)}
            >
              <div className="aspect-[4/3] rounded-2xl glass border border-afc-gold/20 hover:border-afc-gold/60 transition-all duration-500 overflow-hidden relative group-hover:scale-[1.02] group-hover:shadow-gold-glow bg-afc-navy-deep">
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  onError={(e) => { e.target.src = '/afc/images.jpg'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-afc-navy via-afc-navy/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-afc-gold">
                    AFC Archive
                  </span>
                  <h4 className="font-cinzel text-base font-bold text-white mt-0.5">
                    {img.title}
                  </h4>
                  <p className="font-outfit text-xs text-afc-ivory-muted/80 mt-1 line-clamp-2">
                    {img.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== LIGHTBOX MODAL ===== */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-afc-navy/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 text-white hover:text-afc-gold hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="w-6 h-6" />
            </button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white hover:text-afc-gold hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
              }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white hover:text-afc-gold hover:bg-white/20 flex items-center justify-center transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i + 1) % galleryImages.length);
              }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl max-h-[85vh] rounded-3xl overflow-hidden glass-card border border-afc-gold/30 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex-1 bg-black/50 overflow-hidden max-h-[65vh]">
                <img
                  src={galleryImages[lightboxIndex]?.src}
                  alt={galleryImages[lightboxIndex]?.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-6 bg-afc-navy-surface border-t border-afc-gold/20 flex items-center justify-between">
                <div>
                  <h3 className="font-cinzel text-xl text-afc-gold font-bold">
                    {galleryImages[lightboxIndex]?.title}
                  </h3>
                  <p className="font-outfit text-xs sm:text-sm text-afc-ivory-muted mt-1">
                    {galleryImages[lightboxIndex]?.desc}
                  </p>
                </div>
                <div className="font-outfit text-xs text-afc-gold/80 font-bold px-3 py-1 rounded-full bg-afc-gold/10 border border-afc-gold/30">
                  {lightboxIndex + 1} / {galleryImages.length}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERITAGE OVERVIEW SECTION ===== */}
      <section className="relative z-10 py-20 px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-cinzel text-afc-gold text-xs tracking-[0.4em] uppercase mb-2">Sacred Foundation</p>
          <h2 className="font-cinzel text-3xl sm:text-5xl font-bold text-gold-gradient mb-3">
            Church Emblems & Pillars
          </h2>
          <p className="font-outfit text-afc-ivory-muted/70 text-sm max-w-xl mx-auto">
            Anchored in eternal truth, holy living, and evangelism across Nigeria and the world.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: International Church */}
          <div className="glass-card p-8 rounded-3xl border border-afc-gold/30 text-center flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 rounded-full bg-gradient-gold mx-auto mb-6 flex items-center justify-center shadow-gold-glow">
                <Church className="w-8 h-8 text-afc-navy" />
              </div>
              <h3 className="font-cinzel text-afc-gold font-bold text-lg mb-2">{BRAND.churchName}</h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/80 leading-relaxed">
                Founded in Portland, Oregon (1906). Preaching the complete gospel of Salvation, Entire Sanctification, and the Baptism of the Holy Ghost and Fire.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-afc-gold/10 text-xs text-afc-gold/70 flex items-center justify-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>{BRAND.internationalHQ}</span>
            </div>
          </div>

          {/* Card 2: Africa for Christ */}
          <div className="glass-card p-8 rounded-3xl border border-afc-gold/30 text-center flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-afc-blue-banner to-afc-navy mx-auto mb-6 flex items-center justify-center shadow-md border border-afc-gold/40">
                <Globe className="w-8 h-8 text-afc-gold" />
              </div>
              <h3 className="font-cinzel text-afc-gold font-bold text-lg mb-1">{MOTTOES.africaForChrist.text}</h3>
              <p className="font-playfair italic text-xs text-afc-ivory-muted/60 mb-2">— {MOTTOES.africaForChrist.scripture}</p>
              <p className="font-outfit text-xs text-afc-ivory-muted/80 leading-relaxed">
                {BRAND.wecaName} — West & Central Africa Headquarters at Faith City Igbesa and Anthony Village, Lagos. Commissioned in 1944.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-afc-gold/10 text-xs text-afc-gold/70 flex items-center justify-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{BRAND.wecaHQ}</span>
            </div>
          </div>

          {/* Card 3: YDD */}
          <div className="glass-card p-8 rounded-3xl border border-afc-gold/30 text-center flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-800 mx-auto mb-6 flex items-center justify-center shadow-md border border-emerald-400/40">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-cinzel text-afc-gold font-bold text-lg mb-2">{BRAND.yddName}</h3>
              <p className="font-outfit text-xs text-afc-ivory-muted/80 leading-relaxed italic">
                "{MOTTOES.yddSlogan}"
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-afc-gold/10">
              <button
                onClick={() => setIsHeritageOpen(true)}
                className="w-full py-2 rounded-xl bg-afc-gold/10 hover:bg-afc-gold text-afc-gold hover:text-afc-navy font-outfit text-xs font-bold transition-colors"
              >
                Explore Full Heritage Pavilion →
              </button>
            </div>
          </div>
        </div>

        {/* Ekiti Area Headquarters Spotlight */}
        <div className="glass-card p-8 md:p-10 rounded-3xl border border-afc-gold/40 text-center max-w-3xl mx-auto space-y-4">
          <Star className="w-8 h-8 text-afc-gold mx-auto" />
          <h3 className="font-cinzel text-2xl md:text-3xl font-bold text-afc-gold">{BRAND.areaName}</h3>
          <div className="flex items-center justify-center gap-2 text-afc-ivory-muted text-xs">
            <MapPin className="w-4 h-4 text-afc-gold" />
            <span>{BRAND.areaHQ}</span>
          </div>
          <p className="font-outfit text-xs md:text-sm text-afc-ivory-muted/80 leading-relaxed max-w-xl mx-auto">
            Home of the Inter-Zonal Bible Challenge — where youth representatives from Ado, Ido, Igede, Ikere, Ikole,
            Emure, and across Ekiti State compete in scriptural mastery, Christian love, and spiritual maturity.
          </p>
        </div>
      </section>

      {/* ===== FOOTER BANNER (CANONICAL YDD SLOGAN) ===== */}
      <footer className="relative z-10 border-t border-afc-gold/15">
        <div className="footer-banner py-3.5 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <p className="font-outfit text-white font-semibold text-xs sm:text-sm tracking-wide">
              {MOTTOES.yddSlogan}
            </p>
          </div>
        </div>

        <div className="bg-afc-navy-deep py-12 px-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                <img
                  src="/afc/jesus_light_logo.png"
                  alt="AFC Logo"
                  className="w-7 h-7 object-contain"
                  onError={(e) => { e.target.src = '/afc/Jesus the light of the world.jpg'; }}
                />
                <h4 className="font-cinzel text-afc-gold font-bold text-sm tracking-wider">
                  {BRAND.areaName}
                </h4>
              </div>
              <p className="font-outfit text-afc-ivory-muted/60 text-xs leading-relaxed">
                {BRAND.areaHQ}
              </p>
            </div>

            <div>
              <h4 className="font-cinzel text-afc-gold font-bold text-sm tracking-wider mb-3">
                {BRAND.wecaName}
              </h4>
              <p className="font-outfit text-afc-ivory-muted/60 text-xs leading-relaxed">
                {BRAND.wecaHQ}
              </p>
            </div>

            <div>
              <h4 className="font-cinzel text-afc-gold font-bold text-sm tracking-wider mb-3">
                International HQ
              </h4>
              <p className="font-outfit text-afc-ivory-muted/60 text-xs leading-relaxed">
                {BRAND.internationalHQ}
              </p>
            </div>

            <div>
              <h4 className="font-cinzel text-afc-gold font-bold text-sm tracking-wider mb-3">
                Quick Navigation
              </h4>
              <div className="flex flex-col gap-2 text-xs font-outfit text-afc-ivory-muted/80">
                <Link to="/stage" className="hover:text-afc-gold transition-colors">Stage Projector Screen</Link>
                <Link to="/play" className="hover:text-afc-gold transition-colors">Team Device Client (/play)</Link>
                <Link to="/join" className="hover:text-afc-gold transition-colors">Audience Companion App (/join)</Link>
                <Link to="/admin/login" className="hover:text-afc-gold transition-colors">Quizmaster Portal</Link>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-afc-gold/10 text-center">
            <p className="font-playfair italic text-afc-gold/60 text-xs">
              "{MOTTOES.lightOfTheWorld.text}" — {MOTTOES.lightOfTheWorld.scripture}
            </p>
            <p className="font-outfit text-afc-ivory-muted/40 text-xs mt-1">
              "{MOTTOES.africaForChrist.text}" — {MOTTOES.africaForChrist.scripture}
            </p>
            <p className="font-outfit text-afc-ivory-muted/30 text-xs mt-4">
              © {new Date().getFullYear()} {BRAND.churchName} — Ekiti Area & Youth Development Directorate. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Heritage Pavilion Modal */}
      <HeritageModal isOpen={isHeritageOpen} onClose={() => setIsHeritageOpen(false)} />
    </div>
  );
}
