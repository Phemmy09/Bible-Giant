import { MOTTOES, BRAND } from '@/lib/constants';

export default function FooterBanner() {
  return (
    <div className="footer-banner w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="font-outfit text-afc-ivory/80 text-xs md:text-sm text-center md:text-left leading-relaxed flex-1">
          {MOTTOES.yddSlogan}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-afc-gold/60" />
          <p className="font-cinzel text-afc-gold text-xs tracking-wider">
            {BRAND.areaName}
          </p>
        </div>
      </div>
    </div>
  );
}
