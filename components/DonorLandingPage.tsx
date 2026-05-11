import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '../LanguageContext.tsx';
import { User, Heart, ShieldCheck, Recycle, ReceiptText, UserRound, Store, Hospital, ClipboardCheck, PackageSearch, Truck, BarChart3, CheckCircle2, XCircle, Leaf } from 'lucide-react';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

const DonorLandingPage: React.FC<Props> = ({ onStart, onBack }) => {
  const { t } = useLanguage();
  return (
    <div className="bg-[#f8f9f5] text-[#2c3e2e] min-h-screen selection:bg-[#5b7b62]/30">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden flex flex-col items-center text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#5b7b62]/5 rounded-full blur-[160px]"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#5b7b62]/10 border border-[#5b7b62]/20 text-[#5b7b62] text-sm font-bold mb-8 tracking-widest"
          >
            {t('donor.forDonors')}
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold font-serif leading-[1.1] tracking-tighter mb-8 text-[#2c3e2e]"
          >
            {t('donor.hero.title1')} <br />
            {t('donor.hero.title2')}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[#556b5a] text-lg md:text-xl max-w-2xl mx-auto font-medium mb-12 leading-relaxed"
          >
            {t('donor.hero.desc')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button 
              onClick={onStart}
              className="px-10 py-4 bg-[#2c3e2e] hover:opacity-90 text-white rounded-2xl font-bold text-lg transition-all flex items-center gap-3 shadow-xl shadow-[#2c3e2e]/10 mx-auto group"
            >
              <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {t('donor.startNow')}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Who Can Donate Section */}
      <section className="py-24 px-6 bg-white/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-serif tracking-tight mb-4 text-[#2c3e2e]">{t('donor.whoDonate')}</h2>
            <p className="text-[#556b5a] font-medium text-lg">{t('donor.everyoneDiff')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: t('donor.who.individuals'),
                icon: <UserRound className="w-8 h-8 text-[#5b7b62]" />,
                items: [t('donor.who.individuals.item1'), t('donor.who.individuals.item2'), t('donor.who.individuals.item3'), t('donor.who.individuals.item4')],
                bg: "bg-[#5b7b62]/10"
              },
              {
                title: t('donor.who.pharmacies'),
                icon: <Store className="w-8 h-8 text-[#7b9a82]" />,
                items: [t('donor.who.pharmacies.item1'), t('donor.who.pharmacies.item2'), t('donor.who.pharmacies.item3'), t('donor.who.pharmacies.item4')],
                bg: "bg-[#7b9a82]/10"
              },
              {
                title: t('donor.who.hospitals'),
                icon: <Hospital className="w-8 h-8 text-[#a3b18a]" />,
                items: [t('donor.who.hospitals.item1'), t('donor.who.hospitals.item2'), t('donor.who.hospitals.item3'), t('donor.who.hospitals.item4')],
                bg: "bg-[#a3b18a]/10"
              }
            ].map((card, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] border border-[#2c3e2e]/5 hover:shadow-soft transition-all"
              >
                <div className={`w-16 h-16 ${card.bg} rounded-2xl flex items-center justify-center mb-8`}>
                  {card.icon}
                </div>
                <h3 className="text-2xl font-bold mb-6 text-[#2c3e2e] font-serif">{card.title}</h3>
                <ul className="space-y-4">
                  {card.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-3 text-[#556b5a] text-sm font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#5b7b62]/50" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Donate Section */}
      <section className="py-24 px-6 bg-[#f0f2eb]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-serif tracking-tight mb-4 text-[#2c3e2e]">{t('donor.howTo')}</h2>
            <p className="text-[#556b5a] font-medium text-lg">{t('donor.simpleSafe')}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: t('donor.how.steps.register'), desc: t('donor.how.steps.registerDesc'), icon: <ClipboardCheck className="w-6 h-6" /> },
              { step: "2", title: t('donor.how.steps.list'), desc: t('donor.how.steps.listDesc'), icon: <PackageSearch className="w-6 h-6" /> },
              { step: "3", title: t('donor.how.steps.method'), desc: t('donor.how.steps.methodDesc'), icon: <Truck className="w-6 h-6" /> },
              { step: "4", title: t('donor.how.steps.track'), desc: t('donor.how.steps.trackDesc'), icon: <BarChart3 className="w-6 h-6" /> }
            ].map((item, i) => (
              <div key={i} className="text-center group">
                <div className="relative mb-8 inline-block">
                  <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center text-[#5b7b62] group-hover:bg-[#5b7b62] group-hover:text-white transition-all duration-500 shadow-soft">
                    {item.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#2c3e2e] text-white text-xs font-bold flex items-center justify-center border-4 border-[#f0f2eb]">
                    {item.step}
                  </div>
                </div>
                <h4 className="text-xl font-bold mb-3 text-[#2c3e2e]">{item.title}</h4>
                <p className="text-[#556b5a] text-sm leading-relaxed font-medium px-4">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Donation Guidelines Section */}
      <section className="py-24 px-6 bg-[#f8f9f5]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-serif tracking-tight mb-4 text-[#2c3e2e]">Donation Guidelines</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[2.5rem] bg-[#5b7b62]/5 border border-[#5b7b62]/20">
              <div className="flex items-center gap-3 mb-8 text-[#5b7b62]">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-xl font-bold tracking-widest text-sm uppercase">{t('donor.guide.accept')}</h3>
              </div>
              <ul className="space-y-6">
                {[
                  t('donor.guide.accept.item1'),
                  t('donor.guide.accept.item2'),
                  t('donor.guide.accept.item3'),
                  t('donor.guide.accept.item4'),
                  t('donor.guide.accept.item5')
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[#556b5a] font-medium">
                    <CheckCircle2 className="w-5 h-5 text-[#5b7b62]/50 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-10 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-center gap-3 mb-8 text-rose-600">
                <XCircle className="w-6 h-6" />
                <h3 className="text-xl font-bold tracking-widest text-sm uppercase">{t('donor.guide.reject')}</h3>
              </div>
              <ul className="space-y-6">
                {[
                  t('donor.guide.reject.item1'),
                  t('donor.guide.reject.item2'),
                  t('donor.guide.reject.item3'),
                  t('donor.guide.reject.item4'),
                  t('donor.guide.reject.item5')
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4 text-[#556b5a] font-medium">
                    <XCircle className="w-5 h-5 text-rose-500/50 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6 bg-[#f0f2eb]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold font-serif tracking-tight mb-4 text-[#2c3e2e]">{t('donor.benefits')}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: t('donor.benefit.lives'), desc: t('donor.benefit.livesDesc'), icon: <Heart className="w-8 h-8 text-[#5b7b62]" /> },
              { title: t('donor.benefit.env'), desc: t('donor.benefit.envDesc'), icon: <Recycle className="w-8 h-8 text-[#7b9a82]" /> },
              { title: t('donor.benefit.tax'), desc: t('donor.benefit.taxDesc'), icon: <ReceiptText className="w-8 h-8 text-[#a3b18a]" /> }
            ].map((item, i) => (
              <div key={i} className="bg-white p-12 rounded-[2.5rem] text-center shadow-soft border border-[#2c3e2e]/5 hover:shadow-lg transition-all">
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-50 flex items-center justify-center mb-8 shadow-inner">
                  {item.icon}
                </div>
                <h4 className="text-2xl font-bold mb-4 font-serif text-[#2c3e2e]">{item.title}</h4>
                <p className="text-[#556b5a] text-sm leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[3rem] overflow-hidden bg-[#2c3e2e] p-16 md:p-24 text-center">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                <Leaf className="w-64 h-64 rotate-45 text-white/10" />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold font-serif text-white tracking-tighter mb-6 relative z-10">{t('donor.ready')}</h2>
            <p className="text-[#a3b18a] text-lg md:text-xl max-w-2xl mx-auto font-medium mb-12 relative z-10">
              {t('donor.cta.desc')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <button 
                onClick={onStart}
                className="px-12 py-5 bg-white text-[#2c3e2e] rounded-xl font-bold text-lg hover:bg-gray-50 transition shadow-2xl"
              >
                {t('donor.createAccount')}
              </button>
              <button 
                onClick={onBack}
                className="px-12 py-5 bg-[#5b7b62]/20 border border-white/10 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition"
              >
                {t('nav.home')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DonorLandingPage;
