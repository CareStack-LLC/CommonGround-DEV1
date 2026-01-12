'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Phone,
  BookOpen,
  Film,
  Gamepad2,
  LogOut,
  Settings,
  Star,
  Heart,
  Sparkles,
} from 'lucide-react';
import { familyFilesAPI, circleAPI, CircleContact } from '@/lib/api';

/* =============================================================================
   KIDCOMS - Child Gaming Hub
   A fun, playful interface for kids to connect with family
   ============================================================================= */

interface Child {
  id: string;
  first_name: string;
  preferred_name?: string;
  photo_url?: string;
}

// Floating background shapes
function FloatingShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-yellow-300/30 to-orange-300/20 blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: '-10%', right: '-10%' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-300/20 blur-3xl"
        animate={{
          x: [0, -80, 0],
          y: [0, 80, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{ bottom: '10%', left: '-5%' }}
      />

      {/* Floating stars */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          animate={{
            y: [null, Math.random() * -100 - 50],
            rotate: [0, 360],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 8 + Math.random() * 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        >
          <Star className={`w-${3 + Math.floor(Math.random() * 3)} h-${3 + Math.floor(Math.random() * 3)} text-yellow-400/40`} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
}

// Animated emoji avatar
function EmojiAvatar({ emoji, size = 'lg', online = false }: { emoji: string; size?: 'sm' | 'md' | 'lg' | 'xl'; online?: boolean }) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
    xl: 'w-28 h-28 text-6xl',
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg relative`}
      whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
      whileTap={{ scale: 0.95 }}
    >
      <span role="img" aria-label="avatar">{emoji}</span>
      {online && (
        <motion.div
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-3 border-white"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// Big chunky feature button
function FeatureButton({
  title,
  subtitle,
  icon: Icon,
  emoji,
  color,
  shadowColor,
  onClick,
  disabled = false,
  badge,
  delay = 0,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  emoji: string;
  color: string;
  shadowColor: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
  delay?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay
      }}
      whileHover={!disabled ? {
        scale: 1.05,
        y: -8,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      className={`
        relative w-full p-6 rounded-3xl
        ${color}
        shadow-[0_8px_0_0_${shadowColor}]
        hover:shadow-[0_4px_0_0_${shadowColor}]
        active:shadow-[0_2px_0_0_${shadowColor}]
        transition-shadow duration-100
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
        overflow-hidden group
      `}
      style={{
        boxShadow: `0 8px 0 0 ${shadowColor}`,
      }}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Badge */}
      {badge && (
        <motion.div
          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {badge}
        </motion.div>
      )}

      <div className="flex flex-col items-center gap-3 relative z-10">
        {/* Emoji icon */}
        <motion.span
          className="text-5xl"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity, delay: delay * 0.5 }}
        >
          {emoji}
        </motion.span>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-white drop-shadow-md">{title}</h3>
          <p className="text-sm text-white/80 font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Decorative corner icon */}
      <Icon className="absolute bottom-3 right-3 w-8 h-8 text-white/20" />
    </motion.button>
  );
}

// Contact card for calling
function ContactCard({
  contact,
  onCall,
  delay = 0
}: {
  contact: CircleContact;
  onCall: (id: string) => void;
  delay?: number;
}) {
  // Pick emoji based on relationship type
  const getEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      'mother': '👩',
      'father': '👨',
      'grandmother': '👵',
      'grandfather': '👴',
      'aunt': '👩‍🦰',
      'uncle': '👨‍🦱',
      'sibling': '🧒',
      'cousin': '👦',
      'other': '🧑',
    };
    return emojiMap[type] || '🧑';
  };

  // Pick card color based on index
  const colors = [
    { bg: 'bg-gradient-to-br from-teal-400 to-cyan-500', shadow: '#0d9488' },
    { bg: 'bg-gradient-to-br from-emerald-400 to-green-500', shadow: '#059669' },
    { bg: 'bg-gradient-to-br from-blue-400 to-indigo-500', shadow: '#4f46e5' },
    { bg: 'bg-gradient-to-br from-pink-400 to-rose-500', shadow: '#e11d48' },
    { bg: 'bg-gradient-to-br from-amber-400 to-orange-500', shadow: '#ea580c' },
    { bg: 'bg-gradient-to-br from-purple-400 to-violet-500', shadow: '#7c3aed' },
  ];
  const colorIndex = contact.contact_name.charCodeAt(0) % colors.length;
  const { bg, shadow } = colors[colorIndex];

  return (
    <motion.button
      onClick={() => onCall(contact.id)}
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay
      }}
      whileHover={{ scale: 1.08, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${bg} p-5 rounded-2xl relative overflow-hidden
        shadow-lg hover:shadow-xl transition-shadow
      `}
      style={{ boxShadow: `0 6px 0 0 ${shadow}` }}
      disabled={!contact.can_communicate}
    >
      {/* Online indicator */}
      {contact.can_communicate && (
        <motion.div
          className="absolute top-3 right-3 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.8, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Avatar */}
      <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/90 flex items-center justify-center shadow-inner">
        <span className="text-3xl">{getEmoji(contact.relationship_type)}</span>
      </div>

      {/* Name */}
      <p className="text-white font-bold text-center drop-shadow-sm truncate">
        {contact.contact_name.split(' ')[0]}
      </p>
      <p className="text-white/80 text-xs text-center capitalize">
        {contact.relationship_type.replace('_', ' ')}
      </p>

      {/* Pending badge */}
      {!contact.can_communicate && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">
            Pending
          </span>
        </div>
      )}
    </motion.button>
  );
}

// Loading fallback for Suspense
function KidsHubLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-400 via-cyan-400 to-emerald-400 flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles className="w-16 h-16 text-white" />
      </motion.div>
    </div>
  );
}

// Main page component with search params
function KidsHubPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('case');

  const [isLoading, setIsLoading] = useState(true);
  const [child, setChild] = useState<Child | null>(null);
  const [contacts, setContacts] = useState<CircleContact[]>([]);
  const [activeSection, setActiveSection] = useState<'home' | 'call'>('home');

  useEffect(() => {
    if (familyFileId) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }, [familyFileId]);

  async function loadData() {
    try {
      const familyData = await familyFilesAPI.get(familyFileId!);
      if (familyData.children && familyData.children.length > 0) {
        setChild(familyData.children[0]);

        // Load contacts for this child
        const contactsData = await circleAPI.list(familyFileId!, {
          childId: familyData.children[0].id,
        });
        setContacts(contactsData.items);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCall(contactId: string) {
    if (!familyFileId || !child) return;
    router.push(`/family-files/${familyFileId}/kidcoms/session/new?contact=${contactId}&child=${child.id}`);
  }

  function handleFeatureClick(feature: string) {
    switch (feature) {
      case 'call':
        setActiveSection('call');
        break;
      case 'stories':
        router.push(`/kids/stories?case=${familyFileId}`);
        break;
      case 'theater':
        router.push(`/kids/theater?case=${familyFileId}`);
        break;
      case 'arcade':
        router.push(`/kids/arcade?case=${familyFileId}`);
        break;
    }
  }

  // Get child's display name and emoji
  const childName = child?.preferred_name || child?.first_name || 'Friend';
  const childEmoji = '🦄'; // Could be customizable

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-400 via-cyan-400 to-emerald-400 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-16 h-16 text-white" />
        </motion.div>
      </div>
    );
  }

  if (!familyFileId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-400 via-cyan-400 to-emerald-400 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="text-center"
        >
          <span className="text-8xl block mb-6">🎮</span>
          <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
            Welcome to KidComs!
          </h1>
          <p className="text-white/90 text-lg mb-8">
            Ask a parent to help you get started
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/kidcoms')}
            className="bg-white text-teal-600 font-bold text-lg px-8 py-4 rounded-full shadow-lg"
          >
            Go Back
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-400 via-cyan-400 to-emerald-400 relative overflow-hidden">
      <FloatingShapes />

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Avatar & Greeting */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <EmojiAvatar emoji={childEmoji} size="lg" online />
            <div>
              <motion.h1
                className="text-2xl font-bold text-white drop-shadow-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Hi {childName}!
              </motion.h1>
              <motion.p
                className="text-white/90 flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                What do you want to do? <span className="text-lg">💭</span>
              </motion.p>
            </div>
          </motion.div>

          {/* Exit button */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.4 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(`/family-files/${familyFileId}`)}
            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-lg"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 pb-8">
        <AnimatePresence mode="wait">
          {activeSection === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-w-lg mx-auto space-y-6"
            >
              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                <FeatureButton
                  title="Call Family"
                  subtitle="Video & Voice"
                  icon={Phone}
                  emoji="📞"
                  color="bg-gradient-to-br from-pink-400 to-rose-500"
                  shadowColor="#be123c"
                  onClick={() => handleFeatureClick('call')}
                  delay={0.1}
                />
                <FeatureButton
                  title="Story Time"
                  subtitle="Read with ARIA"
                  icon={BookOpen}
                  emoji="📚"
                  color="bg-gradient-to-br from-purple-400 to-violet-500"
                  shadowColor="#6d28d9"
                  onClick={() => handleFeatureClick('stories')}
                  badge="NEW"
                  delay={0.2}
                />
                <FeatureButton
                  title="Theater"
                  subtitle="Watch Together"
                  icon={Film}
                  emoji="🎬"
                  color="bg-gradient-to-br from-amber-400 to-orange-500"
                  shadowColor="#c2410c"
                  onClick={() => handleFeatureClick('theater')}
                  delay={0.3}
                />
                <FeatureButton
                  title="Arcade"
                  subtitle="Play Games"
                  icon={Gamepad2}
                  emoji="🕹️"
                  color="bg-gradient-to-br from-emerald-400 to-green-500"
                  shadowColor="#15803d"
                  onClick={() => handleFeatureClick('arcade')}
                  delay={0.4}
                />
              </div>

              {/* Quick Call - Circle Preview */}
              {contacts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/20 backdrop-blur-sm rounded-3xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Heart className="w-5 h-5" fill="currentColor" />
                      My Circle
                    </h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveSection('call')}
                      className="text-white/80 text-sm font-medium"
                    >
                      See All →
                    </motion.button>
                  </div>

                  {/* Horizontal scroll of contacts */}
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {contacts.slice(0, 4).map((contact, i) => (
                      <motion.button
                        key={contact.id}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        whileHover={{ scale: 1.1, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCall(contact.id)}
                        disabled={!contact.can_communicate}
                        className="flex flex-col items-center gap-2 min-w-[70px]"
                      >
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <span className="text-2xl">
                            {contact.relationship_type === 'mother' ? '👩' :
                             contact.relationship_type === 'father' ? '👨' : '🧑'}
                          </span>
                        </div>
                        <span className="text-white text-xs font-medium truncate w-full text-center">
                          {contact.contact_name.split(' ')[0]}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="call"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-w-lg mx-auto"
            >
              {/* Back button */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveSection('home')}
                className="flex items-center gap-2 text-white font-bold mb-6"
              >
                <span className="text-2xl">←</span> Back Home
              </motion.button>

              {/* Call header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-6"
              >
                <span className="text-6xl block mb-3">📞</span>
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                  Who do you want to call?
                </h2>
                <p className="text-white/80">Tap someone to start a video call!</p>
              </motion.div>

              {/* Contacts grid */}
              <div className="grid grid-cols-2 gap-4">
                {contacts.map((contact, i) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onCall={handleCall}
                    delay={0.1 + i * 0.08}
                  />
                ))}
              </div>

              {contacts.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 bg-white/20 backdrop-blur-sm rounded-3xl"
                >
                  <span className="text-6xl block mb-4">😢</span>
                  <p className="text-white font-bold text-lg">No contacts yet</p>
                  <p className="text-white/80 text-sm">Ask a parent to add people to your circle!</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-white/20 px-6 py-3 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {[
            { icon: '🏠', label: 'Home', active: activeSection === 'home', onClick: () => setActiveSection('home') },
            { icon: '💬', label: 'Chat', active: false, onClick: () => {} },
            { icon: '🖼️', label: 'Gallery', active: false, onClick: () => {} },
          ].map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-2xl transition-colors ${
                item.active
                  ? 'bg-teal-100 text-teal-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className={`text-xs font-medium ${item.active ? 'text-teal-600' : ''}`}>
                {item.label}
              </span>
            </motion.button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// Default export wrapped in Suspense for useSearchParams
export default function KidsHubPage() {
  return (
    <Suspense fallback={<KidsHubLoading />}>
      <KidsHubPageContent />
    </Suspense>
  );
}
