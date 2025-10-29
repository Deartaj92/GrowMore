import React, { useEffect, useRef, useState } from 'react';

const texts = [
  'No Teachers Found!',
  'Add Teacher First!'
];

const TYPING_SPEED = 80; // ms per character
const ERASING_SPEED = 40; // ms per character
const PAUSE_AFTER_TYPED = 2000; // ms
const PAUSE_AFTER_ERASED = 400; // ms

const FONT_SIZE = 40; // px
const FONT_WEIGHT = 'bold';
const LONGEST_TEXT = texts.reduce((a, b) => (a.length > b.length ? a : b));

const DualTypingText: React.FC<{ className?: string }> = ({ className }) => {
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'erasing'>('typing');
  const [textIdx, setTextIdx] = useState(0);
  const currentText = texts[textIdx];
  const measureRef = useRef<HTMLSpanElement>(null);
  const [maxWidth, setMaxWidth] = useState<number>(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (phase === 'typing') {
      if (displayed.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayed(currentText.slice(0, displayed.length + 1));
        }, TYPING_SPEED);
      } else {
        timeout = setTimeout(() => setPhase('pausing'), PAUSE_AFTER_TYPED);
      }
    } else if (phase === 'pausing') {
      timeout = setTimeout(() => setPhase('erasing'), PAUSE_AFTER_ERASED);
    } else if (phase === 'erasing') {
      if (displayed.length > 0) {
        timeout = setTimeout(() => {
          setDisplayed(currentText.slice(0, displayed.length - 1));
        }, ERASING_SPEED);
      } else {
        setTextIdx((textIdx + 1) % texts.length);
        setPhase('typing');
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, phase, textIdx, currentText]);

  useEffect(() => {
    if (phase === 'typing' && displayed === '') {
      setDisplayed('');
    }
  }, [phase]);

  // Measure the max width of the longest text in the current font
  useEffect(() => {
    if (measureRef.current) {
      setMaxWidth(measureRef.current.offsetWidth);
    }
  }, []);

  return (
    <div
      className={`typing-center-wrapper ${className || ''}`}
      style={{ width: maxWidth ? maxWidth : undefined, minHeight: FONT_SIZE * 1.2, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      {/* Hidden span to measure max width */}
      <span
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          fontSize: FONT_SIZE,
          fontWeight: FONT_WEIGHT,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        {LONGEST_TEXT}
      </span>
      {/* Centered typing text */}
      <span
        className="typing-text"
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: FONT_SIZE,
          fontWeight: FONT_WEIGHT,
          color: '#7ecbff',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{displayed}</span>
        <span className="typing-cursor" aria-hidden> </span>
      </span>
      <style>{`
        .typing-center-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .typing-text {
          transition: color 0.2s;
        }
        .typing-cursor {
          display: inline-block;
          width: 3px;
          height: 1em;
          background: #7ecbff;
          margin-left: 2px;
          animation: blink 0.5s step-end infinite alternate;
          vertical-align: middle;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default DualTypingText; 