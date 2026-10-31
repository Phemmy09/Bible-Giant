import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Church, Globe, Users, Flame, BookOpen, Quote, Shield, Award, CheckCircle2, ChevronRight } from 'lucide-react';
import { BRAND, MOTTOES } from '@/lib/constants';

const PIONEERS = [
  {
    name: 'Rev. Florence L. Crawford',
    role: 'Founder & First General Overseer (1906–1936)',
    image: '/afc/florence_crawford.jpg',
    quote: 'God gave us the Pentecostal faith with apostolic power, purity, and purpose.',
    contribution: 'Led the Azusa Street revival momentum to Portland, Oregon in 1906, establishing the global headquarters and the electric "Jesus, The Light of the World" roof sign.',
  },
  {
    name: 'Rev. Timothy G. Oshokoya ("Brother T")',
    role: 'Pioneer Overseer of Africa (1944–1983)',
    image: '/afc/timothy_oshokoya.jpg',
    quote: 'Africa for Christ — whatever the cost, the Gospel must reach every village and city.',
    contribution: 'Established the work in Nigeria and West/Central Africa in 1944, instituted camp meetings, and commissioned the "Africa for Christ" evangelistic banner in 1956.',
  },
  {
    name: 'The Portland Headquarters Orchestra',
    role: 'Sacred Classical Music Heritage',
    image: '/afc/portland_orchestra.jpg',
    quote: 'Only sacred, classical music worthy of the King of Kings enters God’s sanctuary.',
    contribution: 'Established the world-renowned tradition of full symphonic orchestras and mass choirs in worship, setting the standard maintained in WECA and Ekiti Area today.',
  },
];

const DOCTRINES = [
  {
    num: '1',
    name: 'Salvation (Justification)',
    scripture: 'Romans 5:1 • 2 Cor 5:17',
    color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300',
    desc: 'The initial supernatural work of grace where all past committed sins are forgiven through sincere repentance and faith in the shed blood of Jesus Christ. The believer becomes a new creature.',
  },
  {
    num: '2',
    name: 'Entire Sanctification',
    scripture: 'Hebrews 13:12 • 1 Thess 5:23',
    color: 'border-afc-gold/50 bg-yellow-950/30 text-afc-gold',
    desc: 'The second definite work of grace subsequent to salvation. It cleanses and eradicates the inbred carnal nature (the root of sin), producing heart purity and complete consecration to God.',
  },
  {
    num: '3',
    name: 'Baptism of the Holy Ghost & Fire',
    scripture: 'Acts 1:8 • Acts 2:4',
    color: 'border-rose-500/50 bg-rose-950/30 text-rose-300',
    desc: 'The enduement of divine power from on high upon the clean, sanctified life for effective Christian witness and service, evidenced initially by speaking in other tongues as the Spirit gives utterance.',
  },
];

const YDD_WINGS = [
  { name: 'Campus Fellowship', image: '/afc/ydd_campus_fellowship.jpg', desc: 'Guiding university and polytechnic students toward academic excellence and unyielding Christian integrity.' },
  { name: 'Singles Forum', image: '/afc/ydd_singles_forum.jpg', desc: 'Biblical preparation for courtship, marital purity, and purposeful adult living in Christ.' },
  { name: 'Teen Ministry', image: '/afc/ydd_teen_ministry.jpg', desc: 'Discipling teenagers with scripture memorization, godly mentorship, and protection against worldly philosophies.' },
  { name: 'Young Professionals', image: '/afc/ydd_young_professionals.jpg', desc: 'Equipping graduates and career professionals to shine as lights of integrity in corporate and public sectors.' },
  { name: 'Young Couples', image: '/afc/ydd_young_couples.jpg', desc: 'Strengthening biblical marriages, family worship altars, and godly parenting foundations.' },
];

export default function HeritageModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('pioneers');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-afc-navy/90 backdrop-blur-xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-5xl bg-afc-navy-surface border border-afc-gold/30 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-afc-navy-deep via-afc-navy-mid to-afc-navy-deep border-b border-afc-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-afc-gold/10 border border-afc-gold/30 flex items-center justify-center">
              <Church className="w-5 h-5 text-afc-gold" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg md:text-xl font-bold text-gold-gradient">
                Apostolic Faith Church Heritage Pavilion
              </h2>
              <p className="font-outfit text-xs text-afc-ivory-muted/70">
                Pioneers, Sacred Emblems, Doctrinal Pillars & Youth Ministries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-afc-ivory-muted hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 bg-afc-navy-deep/60 border-b border-afc-gold/10 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {[
            { id: 'pioneers', label: 'Pioneers & History', icon: Award },
            { id: 'emblems', label: 'Sacred Emblems', icon: Shield },
            { id: 'doctrines', label: 'Three Works of Grace', icon: Flame },
            { id: 'wings', label: 'YDD Ministries', icon: Users },
            { id: 'ekiti', label: 'Ekiti Area HQ', icon: Globe },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-outfit text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-gradient-gold text-afc-navy shadow-gold-glow'
                    : 'text-afc-ivory-muted/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PIONEERS */}
          {activeTab === 'pioneers' && (
            <div className="space-y-6">
              <div className="text-center max-w-2xl mx-auto mb-6">
                <p className="font-cinzel text-afc-gold text-xs tracking-widest uppercase">The Great Cloud of Witnesses</p>
                <h3 className="font-cinzel text-xl md:text-2xl text-white font-bold mt-1">
                  Pioneers of the Apostolic Faith
                </h3>
                <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                  Men and women anointed by the Holy Spirit who contended earnestly for the faith once delivered to the saints.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PIONEERS.map((p, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl overflow-hidden border border-afc-gold/20 hover:border-afc-gold/50 transition-all flex flex-col"
                  >
                    <div className="relative h-48 overflow-hidden bg-afc-navy-deep">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-afc-navy via-transparent to-transparent" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="font-cinzel text-sm font-bold text-afc-gold">{p.name}</h4>
                        <p className="font-outfit text-[11px] text-afc-ivory-muted/60">{p.role}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-black/40 border-l-2 border-afc-gold text-xs italic text-afc-ivory/80">
                        <Quote className="w-3 h-3 text-afc-gold inline mr-1" />
                        "{p.quote}"
                      </div>
                      <p className="font-outfit text-[11px] text-afc-ivory-muted/80 leading-relaxed">
                        {p.contribution}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EMBLEMS */}
          {activeTab === 'emblems' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Emblem 1: Light of the World */}
                <div className="glass-card rounded-2xl p-6 border border-afc-gold/30 flex flex-col items-center text-center space-y-4">
                  <div className="w-36 h-36 rounded-full bg-white/5 border-2 border-afc-gold p-3 flex items-center justify-center shadow-gold-glow">
                    <img
                      src="/afc/jesus_light_logo.png"
                      alt="Jesus The Light of the World"
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.src = '/afc/Jesus the light of the world.jpg'; }}
                    />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-afc-gold text-afc-navy">
                      INTERNATIONAL CHURCH MOTTO
                    </span>
                    <h4 className="font-cinzel text-xl font-bold text-white mt-2">
                      "Jesus, The Light of the World"
                    </h4>
                    <p className="font-outfit text-xs text-afc-gold mt-0.5">John 8:12</p>
                  </div>
                  <p className="font-outfit text-xs text-afc-ivory-muted/80 leading-relaxed text-left">
                    First illuminated in electric lights atop the Portland, Oregon international headquarters roof in 1917.
                    It stands today across every sanctuary from Portland to Faith City Anthony, and 74 Ajilosun Ado-Ekiti.
                  </p>
                </div>

                {/* Emblem 2: Africa for Christ */}
                <div className="glass-card rounded-2xl p-6 border border-afc-gold/30 flex flex-col items-center text-center space-y-4">
                  <div className="w-36 h-36 rounded-full bg-white/5 border-2 border-afc-gold p-3 flex items-center justify-center shadow-gold-glow">
                    <img
                      src="/afc/Africa for christ.jpg"
                      alt="Africa for Christ"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-afc-crimson text-white">
                      CONTINENTAL EVANGELISTIC EMBLEM
                    </span>
                    <h4 className="font-cinzel text-xl font-bold text-white mt-2">
                      "Africa for Christ"
                    </h4>
                    <p className="font-outfit text-xs text-afc-gold mt-0.5">Mark 16:15</p>
                  </div>
                  <p className="font-outfit text-xs text-afc-ivory-muted/80 leading-relaxed text-left">
                    Registered as the official crusade banner by Rev. Timothy G. Oshokoya in 1956, representing the unshakeable
                    vision to win every soul across the African continent for Jesus Christ before His soon return.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCTRINES */}
          {activeTab === 'doctrines' && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-widest text-afc-gold">
                  Foundational Biblical Pillars
                </span>
                <h4 className="font-cinzel text-xl md:text-2xl font-bold text-white mt-1">
                  The Three Definite Works of Grace
                </h4>
                <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1">
                  The core biblical experiences taught and lived in The Apostolic Faith Church worldwide.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {DOCTRINES.map(d => (
                  <div key={d.num} className={`p-6 rounded-2xl border ${d.color} space-y-3`}>
                    <div className="w-10 h-10 rounded-xl bg-black/40 border border-current flex items-center justify-center font-bold text-lg">
                      {d.num}
                    </div>
                    <div>
                      <h5 className="font-cinzel text-base font-bold text-white">{d.name}</h5>
                      <p className="font-outfit text-[11px] opacity-80 mt-0.5">{d.scripture}</p>
                    </div>
                    <p className="font-outfit text-xs text-afc-ivory-muted/90 leading-relaxed">
                      {d.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: YDD WINGS */}
          {activeTab === 'wings' && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-widest text-afc-gold">
                  Youth Development Directorate (YDD)
                </span>
                <h4 className="font-cinzel text-xl md:text-2xl font-bold text-white mt-1">
                  Ministries Shaping Tomorrow's Giants
                </h4>
                <p className="font-playfair italic text-xs text-afc-gold mt-1">
                  "{MOTTOES.yddSlogan}"
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {YDD_WINGS.map((w, i) => (
                  <div key={i} className="glass-card rounded-2xl overflow-hidden border border-afc-gold/20 flex flex-col">
                    <div className="h-36 overflow-hidden bg-afc-navy-deep">
                      <img
                        src={w.image}
                        alt={w.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div className="p-4 flex-1">
                      <h5 className="font-cinzel text-sm font-bold text-afc-gold">{w.name}</h5>
                      <p className="font-outfit text-xs text-afc-ivory-muted/70 mt-1 leading-relaxed">
                        {w.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: EKITI AREA */}
          {activeTab === 'ekiti' && (
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-8 border border-afc-gold/40 text-center max-w-3xl mx-auto space-y-6">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold-glow">
                  <Church className="w-10 h-10 text-afc-navy" />
                </div>
                <div>
                  <h4 className="font-cinzel text-2xl font-bold text-gold-gradient">
                    {BRAND.areaName}
                  </h4>
                  <p className="font-outfit text-sm text-afc-gold font-medium mt-1">
                    {BRAND.areaHQ}
                  </p>
                </div>
                <p className="font-outfit text-xs md:text-sm text-afc-ivory-muted/80 leading-relaxed">
                  Ekiti Area serves as the epicenter of youth spiritual awakening across Ekiti State.
                  The Inter-Zonal Bible Giant tournament unites young believers from Ado, Ido, Igede, Ikere, Ikole,
                  Emure, and surrounding zones in rigorous scriptural study and holy living.
                </p>
                <div className="pt-4 border-t border-afc-gold/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                  <div className="p-3 rounded-xl bg-black/30 border border-afc-gold/20">
                    <span className="text-[10px] uppercase font-bold text-afc-gold">Area Overseer</span>
                    <p className="text-xs text-white font-medium mt-0.5">Rev. & Ministers Board</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-afc-gold/20">
                    <span className="text-[10px] uppercase font-bold text-afc-gold">Zonal Format</span>
                    <p className="text-xs text-white font-medium mt-0.5">5 Rounds + Ultimate Challenge</p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-afc-gold/20">
                    <span className="text-[10px] uppercase font-bold text-afc-gold">Broadcast Standard</span>
                    <p className="text-xs text-white font-medium mt-0.5">2030 Dual-Engine Live Platform</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-afc-navy-deep border-t border-afc-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-afc-ivory-muted/70">
            <img
              src="/afc/ydd_logo.png"
              alt="YDD"
              className="w-6 h-6 object-contain"
              onError={(e) => { e.target.src = '/afc/ydd_logo_hq.png'; }}
            />
            <span>The Apostolic Faith Church • Youth Development Directorate</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-afc-gold hover:bg-afc-gold-light text-afc-navy font-outfit font-bold text-xs transition-transform active:scale-95 shadow-gold-glow"
          >
            Close Pavilion
          </button>
        </div>
      </motion.div>
    </div>
  );
}
