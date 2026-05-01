import React, { useState } from 'react';
import { Icon } from './Icon';
import { m, AnimatePresence } from 'framer-motion';

const SocialSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const socials = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'message-circle',
      color: 'bg-[#25D366]',
      link: 'https://whatsapp.com/channel/0029VajWCHy0VycMVZ9K0N1r',
      label: 'Join Channel'
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'send',
      color: 'bg-[#0088cc]',
      link: 'https://t.me/SmartChooseDeals',
      label: 'Get Alerts'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'instagram',
      color: 'bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
      link: 'https://instagram.com/smartchoose.in',
      label: 'Follow Us'
    }
  ];

  return (
    <div 
      className="fixed right-6 bottom-8 z-[100] flex flex-col items-end gap-3"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <AnimatePresence>
        {isOpen && (
          <m.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="flex flex-col gap-3 mb-2"
          >
            {socials.map((social) => (
              <a
                key={social.id}
                href={social.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="
                  bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-lg 
                  opacity-0 group-hover:opacity-100 transition-all duration-300 text-[11px] font-bold text-slate-700
                ">
                  {social.label}
                </div>
                <div className={`
                  w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl 
                  transition-all duration-300 hover:scale-110 active:scale-95 ${social.color}
                `}>
                  <Icon name={social.icon} size={24} />
                </div>
              </a>
            ))}
          </m.div>
        )}
      </AnimatePresence>

      {/* Main Toggle Button */}
      <m.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          w-14 h-14 rounded-3xl bg-emerald-600 text-white shadow-2xl flex items-center justify-center 
          transition-all duration-500 relative overflow-hidden group
          ${isOpen ? 'rotate-90 bg-slate-800' : ''}
        `}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10">
          {isOpen ? <Icon name="x" size={28} /> : <Icon name="share-2" size={28} />}
        </div>
      </m.button>
    </div>
  );
};

export default SocialSidebar;
