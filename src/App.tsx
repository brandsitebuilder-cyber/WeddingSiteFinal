import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Calendar, 
  MapPin, 
  Gift, 
  MessageSquare, 
  Camera, 
  X, 
  ChevronRight, 
  Sparkles,
  Music,
  Clock
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const TARGET_DATE = new Date('2026-11-21T00:00:00').getTime();
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUpd7-ku4gQwdKcj8c6kSE9zX88GboD6Fk5dYR_ZcFq_cDmANsWI3pTKdYtqHqY9HH0g/exec';

// --- Types ---
interface GuestbookEntry {
  name: string;
  message: string;
  id: string;
}

const App: React.FC = () => {
  // --- State ---
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [activeSection, setActiveSection] = useState('home');
  
  // Guestbook State
  const [relationship, setRelationship] = useState('');
  const [tone, setTone] = useState('Heartfelt');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [guestName, setGuestName] = useState('');
  const [entries, setEntries] = useState<GuestbookEntry[]>([
    { id: '1', name: "Aunt Sarah", message: "Wishing you both a lifetime of love and joy. So happy for you!" }
  ]);

  // --- Refs ---
  const rsvpFormRef = useRef<HTMLFormElement>(null);

  // --- Effects ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = TARGET_DATE - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'gallery', 'registry', 'guestbook'];
      const scrollPosition = window.scrollY + 100;

      for (const id of sections) {
        const element = document.getElementById(id);
        if (element && scrollPosition >= element.offsetTop) {
          setActiveSection(id);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Handlers ---
  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpFormRef.current) return;

    setRsvpStatus('submitting');
    const formData = new FormData(rsvpFormRef.current);
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const attending = formData.get('attending') === 'yes';
    const guests = formData.get('guests') as string;
    const plusOneName = formData.get('plusOneName') as string;
    const plusOneDietary = formData.get('plusOneDietary') as string;
    const songRequest = formData.get('songRequest') as string;
    const dietaryRestrictions = formData.get('dietaryRestrictions') as string;

    const submissionName = parseInt(guests) > 1 && plusOneName ? `${name} & ${plusOneName}` : name;
    const submissionDietary = parseInt(guests) > 1 && plusOneDietary 
        ? `${dietaryRestrictions ? dietaryRestrictions + '. ' : ''}Plus One: ${plusOneDietary}`
        : dietaryRestrictions;

    const payload = {
        fullName: submissionName,
        email: email,
        status: attending ? 'Joyfully Accepts' : 'Regretfully Declines',
        guests: parseInt(guests),
        songRequest: songRequest,
        dietaryRestrictions: submissionDietary
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setRsvpStatus('success');
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      alert('There was an error sending your RSVP. Please try again.');
      setRsvpStatus('idle');
    }
  };

  const generateAiMessage = async () => {
    if (!relationship) return;
    setIsGenerating(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setGeneratedMessage("Wishing you a lifetime of happiness, Lourens and Ané! (AI Key missing)");
      } else {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
          Write a wedding guestbook message for a couple named Lourens and Ané.
          The message is from a person who is the "${relationship}" of the couple.
          The tone should be "${tone}".
          Keep it under 40 words.
          Be specific to the relationship if possible.
          Do not include "Dear..." or "Sincerely...", just the body of the message.
        `;
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });
        setGeneratedMessage(response.text?.trim() || "Wishing you both a lifetime of love and happiness!");
      }
    } catch (error) {
      console.error('AI Error:', error);
      setGeneratedMessage("Wishing you both a lifetime of love and happiness! So excited to celebrate with you.");
    } finally {
      setIsGenerating(false);
    }
  };

  const signGuestbook = () => {
    if (guestName && generatedMessage) {
      setEntries([{ id: Date.now().toString(), name: guestName, message: generatedMessage }, ...entries]);
      setGeneratedMessage('');
      setGuestName('');
      setRelationship('');
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-wedding-olive/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-40 p-6 md:p-8 flex justify-between md:justify-start gap-8 items-center bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
        {['home', 'gallery', 'registry', 'guestbook'].map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className={cn(
              "nav-link text-[10px] md:text-xs tracking-[0.2em] font-bold uppercase transition-all duration-300 pointer-events-auto",
              activeSection === id ? "text-white opacity-100" : "text-white/60 hover:text-white hover:opacity-100"
            )}
          >
            {id}
          </a>
        ))}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative w-full h-screen flex flex-col md:flex-row overflow-hidden">
        <div className="w-full md:w-[45%] bg-wedding-olive h-1/2 md:h-full flex flex-col justify-end p-8 md:p-16 relative">
          <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8 md:mb-16 z-10 text-white"
          >
            <p className="text-sm md:text-base tracking-[0.3em] mb-4 md:mb-8 font-sans opacity-80">11.21.2026</p>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif leading-tight mb-8">
              Lourens &<br />Ané
            </h1>
            
            <div className="flex gap-6 md:gap-10 font-sans">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hrs', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <span className="text-2xl md:text-4xl font-light block tabular-nums">{item.value}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        
        <div className="w-full md:w-[55%] h-1/2 md:h-full relative overflow-hidden">
          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5 }}
            src="https://drive.google.com/thumbnail?id=1BHGQjL4BlWjcKhQ5cK0fg7X4OnLkeSrz&sz=w2000" 
            alt="Lourens and Ané" 
            className="absolute inset-0 w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          <button 
            onClick={() => setIsRsvpOpen(true)}
            className="group relative w-32 h-32 md:w-44 md:h-44 rounded-full border border-white/40 bg-white/10 backdrop-blur-md flex items-center justify-center transition-all duration-500 hover:scale-110 hover:bg-wedding-olive hover:border-wedding-olive"
          >
            <span className="text-white font-serif text-xl md:text-2xl tracking-widest group-hover:tracking-[0.3em] transition-all duration-300">RSVP</span>
            <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20 duration-[3s]"></div>
          </button>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-24 px-8 bg-wedding-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-wedding-olive text-xs uppercase tracking-[0.3em] mb-4"
            >
              Our Moments
            </motion.p>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="font-serif text-5xl md:text-6xl text-wedding-olive-dark"
            >
              Gallery
            </motion.h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "1lAaXPIuubHzn2qGRX4MP8QYZqNa6ws7A",
              "1ak-NjDMcuz9eP4kqjRg3M7kcRi4TSZhn",
              "1HApcWXxx4pKC0PD1B4mULe7YFiI5wqPe",
              "1s-OHq7f05yDeWFcDVhoT2mNL-HNUBuAi"
            ].map((id, idx) => (
              <motion.div 
                key={id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "relative overflow-hidden group rounded-sm",
                  idx % 2 !== 0 ? "md:mt-12" : ""
                )}
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img 
                    src={`https://drive.google.com/thumbnail?id=${id}&sz=w1000`} 
                    alt={`Gallery ${idx}`} 
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-110 grayscale group-hover:grayscale-0" 
                  />
                </div>
                <div className="absolute inset-0 bg-wedding-olive/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                  <Camera className="text-white w-8 h-8" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Guestbook Section */}
      <section id="guestbook" className="py-24 px-8 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-wedding-cream/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-20 relative z-10">
          <div>
            <p className="text-wedding-olive text-xs uppercase tracking-[0.3em] mb-4">Leave a Note</p>
            <h2 className="font-serif text-4xl md:text-5xl text-wedding-olive-dark mb-8">Digital Guestbook</h2>
            <p className="font-sans text-gray-500 mb-10 leading-relaxed text-lg">
              Stuck on what to say? Let our AI assistant help you craft the perfect message for our special day.
            </p>
            
            <div className="space-y-8 font-sans">
              <div className="group">
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-wedding-olive transition-colors">I am the couple's...</label>
                <input 
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  type="text" 
                  placeholder="e.g. Best Friend, Cousin, Colleague" 
                  className="w-full border-b border-gray-200 py-3 focus:outline-none focus:border-wedding-olive transition-all bg-transparent text-lg" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-4">Message Tone</label>
                <div className="flex flex-wrap gap-3">
                  {['Heartfelt', 'Funny', 'Poetic', 'Formal'].map((t) => (
                    <button 
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "px-6 py-2 text-[10px] uppercase tracking-widest rounded-full border transition-all duration-300",
                        tone === t 
                          ? "bg-wedding-olive text-white border-wedding-olive shadow-lg shadow-wedding-olive/20" 
                          : "bg-transparent text-gray-400 border-gray-200 hover:border-wedding-olive hover:text-wedding-olive"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={generateAiMessage}
                disabled={!relationship || isGenerating}
                className="w-full py-4 bg-wedding-olive text-white uppercase tracking-[0.3em] text-xs hover:bg-wedding-olive-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-wedding-olive/10"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? 'Crafting Message...' : 'Generate with AI'}
              </button>
            </div>

            <AnimatePresence>
              {generatedMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-12 p-8 bg-wedding-cream/40 rounded-sm border border-wedding-olive/10"
                >
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-4">Your Message</label>
                  <textarea 
                    value={generatedMessage}
                    onChange={(e) => setGeneratedMessage(e.target.value)}
                    className="w-full bg-transparent border-none p-0 text-wedding-olive-dark font-serif italic text-xl focus:ring-0 resize-none mb-6 leading-relaxed" 
                    rows={4}
                  />
                  <div className="space-y-6">
                    <input 
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      type="text" 
                      placeholder="Sign your name" 
                      className="w-full bg-transparent border-b border-wedding-olive/20 py-2 text-sm focus:outline-none focus:border-wedding-olive transition-colors" 
                    />
                    <button 
                      onClick={signGuestbook}
                      disabled={!guestName}
                      className="group flex items-center gap-2 text-xs uppercase font-bold text-wedding-olive hover:text-wedding-olive-dark transition-colors disabled:opacity-30"
                    >
                      Sign Guestbook 
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="bg-wedding-cream/30 p-8 md:p-12 rounded-sm border border-wedding-olive/5 h-fit max-h-[700px] overflow-y-auto custom-scrollbar">
            <h3 className="font-serif text-3xl text-wedding-olive-dark mb-12 text-center">Recent Wishes</h3>
            <div className="space-y-12">
              {entries.map((entry, idx) => (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-center border-b border-wedding-olive/10 pb-10 last:border-0"
                >
                  <p className="font-serif text-xl text-wedding-olive-dark italic mb-4 leading-relaxed">
                    "{entry.message}"
                  </p>
                  <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-gray-400">
                    — {entry.name}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Registry Section */}
      <section id="registry" className="py-32 bg-wedding-olive-dark text-wedding-cream text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none"></div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <Gift className="w-12 h-12 mx-auto mb-8 opacity-40" />
          <p className="text-xs uppercase tracking-[0.4em] mb-6 opacity-60">Gifts</p>
          <h2 className="font-serif text-5xl md:text-6xl mb-10">Registry</h2>
          <p className="font-sans text-lg mb-16 opacity-70 leading-relaxed max-w-xl mx-auto">
            Your presence is enough of a present to us! But for those of you who are stubborn, we've put together a wish-list to help you out.
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-6">
            {['Amazon', 'Crate & Barrel', 'Honeymoon Fund'].map((item) => (
              <a 
                key={item}
                href="#" 
                className="px-10 py-5 bg-transparent border border-wedding-cream/20 text-wedding-cream uppercase tracking-[0.3em] text-[10px] font-bold hover:bg-wedding-cream hover:text-wedding-olive-dark transition-all duration-500"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-wedding-cream py-20 text-center border-t border-wedding-olive/5">
        <Heart className="w-6 h-6 mx-auto mb-6 text-wedding-olive opacity-40" />
        <h2 className="font-serif text-3xl text-wedding-olive-dark mb-4">Lourens & Ané</h2>
        <p className="font-sans text-[10px] uppercase tracking-[0.4em] text-gray-400">
          November 21, 2026 • Cape Town, South Africa
        </p>
      </footer>

      {/* RSVP Modal */}
      <AnimatePresence>
        {isRsvpOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-wedding-charcoal/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-wedding-cream w-full max-w-xl p-8 md:p-12 rounded-sm shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => {
                  setIsRsvpOpen(false);
                  setRsvpStatus('idle');
                }}
                className="absolute top-6 right-6 text-wedding-olive-dark hover:text-black transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {rsvpStatus === 'success' ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-wedding-olive/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Heart className="text-wedding-olive w-10 h-10 fill-wedding-olive" />
                  </div>
                  <h3 className="text-4xl font-serif text-wedding-olive-dark mb-4">Thank You!</h3>
                  <p className="font-sans text-gray-600 mb-10 text-lg">We have received your response and can't wait to see you.</p>
                  <button 
                    onClick={() => {
                      setIsRsvpOpen(false);
                      setRsvpStatus('idle');
                    }}
                    className="text-[10px] uppercase tracking-[0.3em] font-bold border-b border-black pb-2 hover:text-wedding-olive hover:border-wedding-olive transition-all"
                  >
                    Close Window
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-4xl font-serif text-wedding-olive-dark mb-3">Join Us</h2>
                  <p className="text-[10px] font-sans text-gray-500 mb-10 uppercase tracking-[0.3em]">Please respond by September 1st, 2026</p>
                  
                  <form ref={rsvpFormRef} onSubmit={handleRsvpSubmit} className="space-y-8 font-sans">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="group">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-wedding-olive transition-colors">Full Name</label>
                        <input type="text" name="name" required className="w-full bg-white/50 border border-gray-200 p-4 text-wedding-olive-dark focus:outline-none focus:border-wedding-olive transition-all" />
                      </div>
                      <div className="group">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2 group-focus-within:text-wedding-olive transition-colors">Email</label>
                        <input type="email" name="email" required className="w-full bg-white/50 border border-gray-200 p-4 text-wedding-olive-dark focus:outline-none focus:border-wedding-olive transition-all" />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 py-4 border-y border-wedding-olive/10">
                      <label className="flex items-center gap-4 cursor-pointer group">
                        <input type="radio" name="attending" value="yes" defaultChecked className="w-5 h-5 accent-wedding-olive" />
                        <span className="text-wedding-olive-dark font-medium tracking-wide group-hover:text-wedding-olive transition-colors">Joyfully Accepts</span>
                      </label>
                      <label className="flex items-center gap-4 cursor-pointer group">
                        <input type="radio" name="attending" value="no" className="w-5 h-5 accent-wedding-olive" />
                        <span className="text-wedding-olive-dark font-medium tracking-wide group-hover:text-wedding-olive transition-colors">Regretfully Declines</span>
                      </label>
                    </div>

                    <div className="space-y-8">
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="group">
                          <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2">Total Guests</label>
                          <select name="guests" className="w-full bg-white/50 border border-gray-200 p-4 text-wedding-olive-dark focus:outline-none focus:border-wedding-olive transition-all appearance-none">
                            {[1, 2, 3, 4, 5].map(num => (
                              <option key={num} value={num}>{num} {num === 1 ? '(Just Me)' : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div className="group">
                          <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2">Song Request</label>
                          <div className="relative">
                            <Music className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input type="text" name="songRequest" placeholder="Title - Artist" className="w-full bg-white/50 border border-gray-200 p-4 pl-12 text-wedding-olive-dark focus:outline-none focus:border-wedding-olive transition-all" />
                          </div>
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-[10px] uppercase tracking-widest text-gray-400 mb-2">Dietary Restrictions</label>
                        <textarea name="dietaryRestrictions" placeholder="Allergies, preferences, etc." className="w-full bg-white/50 border border-gray-200 p-4 text-wedding-olive-dark focus:outline-none focus:border-wedding-olive transition-all h-24 resize-none"></textarea>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={rsvpStatus === 'submitting'}
                      className="w-full bg-wedding-olive text-white py-5 mt-4 uppercase tracking-[0.4em] text-xs font-bold hover:bg-wedding-olive-dark transition-all shadow-xl shadow-wedding-olive/20 disabled:opacity-50"
                    >
                      {rsvpStatus === 'submitting' ? 'Sending...' : 'Send RSVP'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
