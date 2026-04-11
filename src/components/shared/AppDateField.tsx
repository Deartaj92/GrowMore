import React from 'react';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import type { TextFieldProps } from '@mui/material/TextField';

type AppDateFieldProps = {
  id?: string;
  value?: string | null;
  onChangeValue?: (value: string) => void;
  onChange?: (event: { target: { value: string; name?: string } }) => void;
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  inputRef?: React.Ref<any>;
  minDate?: string;
  maxDate?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  textFieldSlot?: React.ComponentType<TextFieldProps>;
  textFieldProps?: Record<string, any>;
};

const toDayjs = (value?: string | null): Dayjs | null => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const AppDateField: React.FC<AppDateFieldProps> = ({
  id,
  value,
  onChangeValue,
  onChange,
  label,
  name,
  required = false,
  disabled = false,
  fullWidth = true,
  size = 'small',
  inputRef,
  minDate,
  maxDate,
  title,
  className,
  style,
  placeholder,
  textFieldSlot,
  textFieldProps,
}) => {
  const handleChange = (newValue: Dayjs | null) => {
    const nextValue = newValue && newValue.isValid() ? newValue.format('YYYY-MM-DD') : '';
    onChangeValue?.(nextValue);
    onChange?.({ target: { value: nextValue, name } });
  };

  return (
    <DatePicker
      format="DD-MM-YYYY"
      value={toDayjs(value)}
      onChange={handleChange}
      disabled={disabled}
      minDate={toDayjs(minDate) ?? undefined}
      maxDate={toDayjs(maxDate) ?? undefined}
      slots={textFieldSlot ? { textField: textFieldSlot } : undefined}
      slotProps={{
        textField: {
          id,
          label,
          name,
          required,
          fullWidth,
          size,
          inputRef,
          title,
          className,
          style,
          placeholder,
          ...textFieldProps,
        },
      }}
    />
  );
};

export default AppDateField;
