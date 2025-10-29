import React, { useState, useEffect } from 'react';
import { styled as muiStyled } from '@mui/material/styles';
import { Box } from '@mui/material';

const TypingContainer = muiStyled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '60px',
  marginBottom: '8px',
});

const TypingText = muiStyled('div')({
  fontSize: '2.2rem',
  fontWeight: 800,
  color: '#6366f1',
  textAlign: 'center',
  letterSpacing: '1px',
  textShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  '@media (max-width: 600px)': {
    fontSize: '1.8rem',
  },
});

const DualTypingTextClasses: React.FC = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const messages = [
    "No Classes Found",
    "Add a class to get started"
  ];

  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    
    if (!isDeleting) {
      if (currentText.length < currentMessage.length) {
        const timeout = setTimeout(() => {
          setCurrentText(currentMessage.slice(0, currentText.length + 1));
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (currentText.length > 0) {
        const timeout = setTimeout(() => {
          setCurrentText(currentText.slice(0, -1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        setIsDeleting(false);
        setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
      }
    }
  }, [currentText, isDeleting, currentMessageIndex, messages]);

  return (
    <TypingContainer>
      <TypingText>
        {currentText}
        <span style={{ animation: 'blink 1s infinite' }}>|</span>
      </TypingText>
    </TypingContainer>
  );
};

export default DualTypingTextClasses; 