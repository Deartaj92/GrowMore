import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { ThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import {
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  CircularProgress,
} from '@mui/material';

// Styled Components
const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  background: ${({ theme }) => theme.BG};
  min-height: 100vh;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 0;
`;

const SettingsCard = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SettingItem = styled.div`
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingDescription = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin: 8px 0 16px 0;
  line-height: 1.5;
`;

const RadioOptionWrapper = styled.div<{ $checked?: boolean }>`
  margin: 8px 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.BG};
    border-color: ${({ theme }) => theme.ACCENT};
  }
  
  ${({ $checked, theme }) => $checked && `
    border-color: ${theme.ACCENT};
    .MuiFormControlLabel-label {
      color: ${theme.ACCENT};
      font-weight: 600;
    }
  `}
`;

const ActionButton = styled(Button)`
  margin-top: 24px;
  padding: 12px 24px;
  font-weight: 600;
  text-transform: none;
  border-radius: 8px;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const FeeSettings: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth() as any;
  const { showToast } = useToast();
  const [defaultPrintType, setDefaultPrintType] = useState<'invoice' | 'thermal'>('invoice');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Type assertion for theme object
  const themeObj = theme as any;

  useEffect(() => {
    loadSettings();
  }, [user?.school_id]);

  const loadSettings = async () => {
    if (!user?.school_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Try to load from localStorage first (for quick access)
      const savedSetting = localStorage.getItem(`fee_print_default_${user.school_id}`);
      if (savedSetting && (savedSetting === 'invoice' || savedSetting === 'thermal')) {
        setDefaultPrintType(savedSetting);
      }

      // Also try to load from database if available
      try {
        const { data, error } = await supabase
          .from('fee_settings')
          .select('settings')
          .eq('school_id', user.school_id)
          .single();

        if (!error && data?.settings) {
          const feeDefaultPrintType = data.settings.fee_default_print_type;
          if (feeDefaultPrintType && (feeDefaultPrintType === 'invoice' || feeDefaultPrintType === 'thermal')) {
            setDefaultPrintType(feeDefaultPrintType);
            // Update localStorage
            localStorage.setItem(`fee_print_default_${user.school_id}`, feeDefaultPrintType);
          }
        }
      } catch (dbError: any) {
        // Table doesn't exist or other DB error - that's okay, we use localStorage
        // Silently ignore - localStorage is the primary storage
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.school_id) {
      showToast('User not authenticated', 'error');
      return;
    }

    setSaving(true);
    try {
      // Save to localStorage for quick access
      localStorage.setItem(`fee_print_default_${user.school_id}`, defaultPrintType);

      // Try to save to database (upsert with JSONB merge)
      // First, try to get existing settings
      const { data: existingData } = await supabase
        .from('fee_settings')
        .select('settings')
        .eq('school_id', user.school_id)
        .single();

      const currentSettings = existingData?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        fee_default_print_type: defaultPrintType,
      };

      const { error } = await supabase
        .from('fee_settings')
        .upsert({
          school_id: user.school_id,
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'school_id'
        });

      if (error) {
        // If table doesn't exist, that's okay - we'll just use localStorage
        console.warn('Could not save to database, using localStorage only:', error);
      }

      showToast('Settings saved successfully!', 'success');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer theme={theme}>
        <LoadingContainer theme={theme}>
          <CircularProgress size={24} style={{ marginRight: 12 }} />
          Loading settings...
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer theme={theme}>
      <Header>
        <Title theme={theme}>
          <SettingsIcon style={{ fontSize: 32 }} />
          Fee Settings
        </Title>
        <Subtitle theme={theme}>
          Configure fee collection preferences and default settings
        </Subtitle>
      </Header>

      <SettingsCard theme={theme}>
        <SectionTitle theme={theme}>
          <PrintIcon style={{ fontSize: 20 }} />
          Print Preferences
        </SectionTitle>

        <SettingItem>
          <FormLabel component="legend" style={{ color: themeObj.TEXT_PRIMARY, fontWeight: 600, marginBottom: 8 }}>
            Default Print Type
          </FormLabel>
          <SettingDescription theme={theme}>
            Choose the default document type that will be generated automatically after collecting a payment.
            You can still generate the other type manually from the payment history.
          </SettingDescription>
          
          <FormControl component="fieldset">
            <RadioGroup
              value={defaultPrintType}
              onChange={(e) => setDefaultPrintType(e.target.value as 'invoice' | 'thermal')}
            >
              <RadioOptionWrapper theme={theme} $checked={defaultPrintType === 'invoice'}>
                <FormControlLabel
                  value="invoice"
                  control={<Radio />}
                  label={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ReceiptIcon style={{ fontSize: 20, color: themeObj.ACCENT }} />
                      <div>
                        <div style={{ fontWeight: 600, color: themeObj.TEXT_PRIMARY }}>Invoice</div>
                        <div style={{ fontSize: '0.85rem', color: themeObj.TEXT_SECONDARY }}>
                          Full-size A4 invoice with detailed fee breakdown
                        </div>
                      </div>
                    </div>
                  }
                />
              </RadioOptionWrapper>
              <RadioOptionWrapper theme={theme} $checked={defaultPrintType === 'thermal'}>
                <FormControlLabel
                  value="thermal"
                  control={<Radio />}
                  label={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <PrintIcon style={{ fontSize: 20, color: themeObj.ACCENT }} />
                      <div>
                        <div style={{ fontWeight: 600, color: themeObj.TEXT_PRIMARY }}>Thermal Receipt</div>
                        <div style={{ fontSize: '0.85rem', color: themeObj.TEXT_SECONDARY }}>
                          Compact 80mm receipt optimized for thermal printers
                        </div>
                      </div>
                    </div>
                  }
                />
              </RadioOptionWrapper>
            </RadioGroup>
          </FormControl>
        </SettingItem>

        <ActionButton
          variant="contained"
          color="primary"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          style={{
            background: themeObj.ACCENT,
            color: '#fff',
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </ActionButton>
      </SettingsCard>
    </PageContainer>
  );
};

export default FeeSettings;

