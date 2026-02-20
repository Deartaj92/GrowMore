import React, { useContext } from 'react';
import { MuteContext } from './Layout';

interface ClickSoundButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const ClickSoundButton: React.FC<ClickSoundButtonProps> = ({ onClick, children, ...rest }) => {
  const { muted } = useContext(MuteContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (!muted) {
      const audio = new window.Audio(`${process.env.PUBLIC_URL || '.'}/click.mp3`);
      audio.volume = 1.0;
      audio.play().catch(() => { });
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button {...rest} onClick={handleClick}>
      {children}
    </button>
  );
};

export default ClickSoundButton; 