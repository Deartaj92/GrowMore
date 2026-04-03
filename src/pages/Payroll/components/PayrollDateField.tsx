import React, { useRef } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { CalendarToday as CalendarTodayIcon } from '@mui/icons-material';
import { displayToIsoDate, isoToDisplayDate } from '../utils';

interface PayrollDateFieldProps {
  label?: string;
  value: string;
  onChange: (isoValue: string, displayValue: string) => void;
  placeholder?: string;
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: any;
}

const PayrollDateField: React.FC<PayrollDateFieldProps> = ({
  value,
  onChange,
  placeholder = 'dd-mm-yyyy',
  size = 'small',
  fullWidth = true,
  disabled = false,
  sx,
}) => {
  const nativeDateRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    if (disabled) return;
    const input = nativeDateRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  };

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : undefined }}>
      <TextField
        size={size}
        value={value}
        onChange={(e) => {
          const displayValue = e.target.value;
          onChange(displayToIsoDate(displayValue), displayValue);
        }}
        fullWidth={fullWidth}
        disabled={disabled}
        variant="outlined"
        placeholder={placeholder}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={openPicker}
                edge="end"
                disabled={disabled}
                aria-label="Open calendar"
              >
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={sx}
      />

      <input
        ref={nativeDateRef}
        type="date"
        value={value ? displayToIsoDate(value) : ''}
        onChange={(e) => {
          const isoValue = e.target.value;
          onChange(isoValue, isoToDisplayDate(isoValue));
        }}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: 0,
          height: 0,
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default PayrollDateField;
