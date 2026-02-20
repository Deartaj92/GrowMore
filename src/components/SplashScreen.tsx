import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT = '#4a6cf7';
const ACCENT_BRIGHT = '#6b8cff';
const CYAN = '#22d3ee';
const VIOLET = '#a78bfa';
const PINK = '#ec4899';

export interface SplashScreenProps {
  isExiting?: boolean;
  onExitComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isExiting = false, onExitComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isExiting) return;
    const start = Date.now();
    const duration = 2200;
    const tick = () => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed < duration) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isExiting]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        onAnimationComplete={() => isExiting && onExitComplete?.()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 25%, #16213e 50%, #0f0c29 100%)',
          overflow: 'hidden',
        }}
      >
        {/* Animated gradient overlay - moves slowly */}
        <motion.div
          style={{
            position: 'absolute',
            inset: '-50%',
            background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${ACCENT}40 0%, transparent 50%),
                        radial-gradient(ellipse 60% 40% at 80% 80%, ${VIOLET}35 0%, transparent 50%),
                        radial-gradient(ellipse 50% 30% at 20% 100%, ${CYAN}25 0%, transparent 50%)`,
          }}
          animate={{
            opacity: [0.8, 1, 0.8],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Moving gradient blob */}
        <motion.div
          style={{
            position: 'absolute',
            width: '120%',
            height: '120%',
            top: '-10%',
            left: '-10%',
            background: `conic-gradient(from 0deg at 50% 50%, ${ACCENT}20, ${VIOLET}15, ${CYAN}20, ${ACCENT}20)`,
            filter: 'blur(80px)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />

        {/* Floating orbs */}
        {[
          { size: 300, x: '10%', y: '20%', color: ACCENT, delay: 0 },
          { size: 200, x: '75%', y: '60%', color: VIOLET, delay: 0.5 },
          { size: 250, x: '85%', y: '15%', color: CYAN, delay: 1 },
          { size: 180, x: '5%', y: '70%', color: PINK, delay: 0.3 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: orb.size,
              height: orb.size,
              left: orb.x,
              top: orb.y,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${orb.color}30 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: orb.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Sharp grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 70%)',
          }}
        />

        {/* Center content - glass card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 56px',
            borderRadius: 32,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.05),
              0 25px 50px -12px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Logo - book with growth arrow, path draw */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ marginBottom: 28 }}
          >
            <svg width={88} height={88} viewBox="0 0 88 88" fill="none" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="splashLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ACCENT_BRIGHT} />
                  <stop offset="50%" stopColor={VIOLET} />
                  <stop offset="100%" stopColor={CYAN} />
                </linearGradient>
                <filter id="splashGlow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <motion.path
                d="M44 16 L64 26 L64 58 L44 68 L24 58 L24 26 Z"
                stroke="url(#splashLogoGrad)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#splashGlow)"
                initial={{ pathLength: 0, opacity: 0.8 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
              />
              <motion.path
                d="M44 28 L58 36 L58 56 L44 62 L30 56 L30 36 Z"
                stroke="url(#splashLogoGrad)"
                strokeWidth="2"
                fill="rgba(74, 108, 247, 0.15)"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
              />
              <motion.path
                d="M44 38 L52 42 L52 52 L44 56 L36 52 L36 42 Z"
                stroke="url(#splashLogoGrad)"
                strokeWidth="1.5"
                fill="rgba(167, 139, 250, 0.2)"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.75, ease: 'easeOut' }}
              />
              <motion.path
                d="M44 46 L44 62 M40 54 L44 62 L48 54"
                stroke="url(#splashLogoGrad)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 1.1, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>

          {/* Title - gradient + shimmer */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              position: 'relative',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <motion.h1
              style={{
                margin: 0,
                fontSize: 'clamp(2rem, 6vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                background: `linear-gradient(110deg, ${ACCENT_BRIGHT} 0%, ${VIOLET} 40%, ${CYAN} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: 'none',
                lineHeight: 1.1,
              }}
            >
              Grow More
            </motion.h1>
            {/* Shimmer sweep */}
            <motion.div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '-100%',
                width: '60%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
                skewX: -20,
              }}
              animate={{ x: '350%' }}
              transition={{ duration: 2.2, delay: 1.2, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              margin: 0,
              fontSize: 'clamp(0.85rem, 2.5vw, 1rem)',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            School Management System
          </motion.p>
        </motion.div>

        {/* Progress - pill with glow */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            position: 'absolute',
            bottom: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(320px, 85vw)',
            height: 6,
            borderRadius: 999,
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <motion.div
            style={{
              height: '100%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${ACCENT}, ${VIOLET})`,
              boxShadow: `0 0 30px ${ACCENT}60, 0 0 60px ${ACCENT}30`,
            }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.12 }}
          />
        </motion.div>

        {/* Loading text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          style={{
            position: 'absolute',
            bottom: '10%',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            Loading
          </span>
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: ACCENT,
                boxShadow: `0 0 10px ${ACCENT}`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
