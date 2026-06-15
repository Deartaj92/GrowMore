import React from 'react';
import IconButton from '@mui/material/IconButton';
import { Visibility, VisibilityOff } from '@mui/icons-material';

interface TogglePasswordProps {
  show: boolean;
  onToggle: () => void;
}

export const TogglePassword: React.FC<TogglePasswordProps> = ({ show, onToggle }) => (
  <IconButton onClick={onToggle} edge="end" size="small" aria-label={show ? 'Hide password' : 'Show password'}>
    {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
  </IconButton>
);

