import React, { useState, useEffect, useContext } from 'react';
import styled, { useTheme as useStyledTheme } from 'styled-components';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ThemeContext } from '../contexts/ThemeContext';
import {
  Settings as SettingsIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Build as BuildIcon,
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  AttachMoney as AttachMoneyIcon,
  Feedback as FeedbackIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { LmsPortalSettings, DEFAULT_LMS_SETTINGS, encodeLmsSettings, decodeLmsSettings } from './GeneralSettings';

const PageContainer = styled.div<{ $theme: any }>`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  min-height: 100vh;
  background: ${({ $theme }) => $theme?.BG || '#f8fafc'};
  color: ${({ $theme }) => $theme?.TEXT_PRIMARY || '#0f172a'};
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const TitleBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const TitleIconBox = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3);
`;

const TitleText = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
`;

const SubTitleText = styled.p`
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0 0;
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const Button = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;

  background: ${({ $primary }) =>
    $primary ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(148, 163, 184, 0.15)'};
  color: ${({ $primary }) => ($primary ? '#ffffff' : '#334155')};
  box-shadow: ${({ $primary }) => ($primary ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none')};

  &:hover {
    transform: translateY(-2px);
    opacity: 0.95;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const Card = styled.div<{ $theme: any }>`
  background: ${({ $theme }) => $theme?.CARD || '#ffffff'};
  border: 1px solid ${({ $theme }) => $theme?.BORDER || 'rgba(226, 232, 240, 0.8)'};
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

const CardTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;

  svg {
    color: #3b82f6;
  }
`;

const ToggleSwitch = styled.label<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  cursor: pointer;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({ $checked }) => ($checked ? '#3b82f6' : '#cbd5e1')};
    transition: 0.3s;
    border-radius: 34px;

    &:before {
      position: absolute;
      content: '';
      height: 20px;
      width: 20px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
      transform: ${({ $checked }) => ($checked ? 'translateX(24px)' : 'translateX(0)')};
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 0.5rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1.5px solid #cbd5e1;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3b82f6;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1.5px solid #cbd5e1;
  font-size: 0.9rem;
  min-height: 100px;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    border-color: #3b82f6;
  }
`;

const CheckboxRow = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: #334155;

  input {
    width: 18px;
    height: 18px;
    accent-color: #3b82f6;
    cursor: pointer;
  }
`;

const NoticeBanner = styled.div`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.12) 100%);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #1e40af;
  font-size: 0.9rem;
  font-weight: 600;
`;

const LmsControlPanel: React.FC = () => {
  const { user } = useAuth();
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = useStyledTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<LmsPortalSettings>(DEFAULT_LMS_SETTINGS);

  useEffect(() => {
    fetchSettings();
  }, [user?.school_id]);

  const fetchSettings = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
      let loadedSettings: LmsPortalSettings | null = null;

      // 1. Try fetching from lms_control_settings table
      const { data: dbData, error: dbErr } = await supabase
        .from('lms_control_settings')
        .select('*')
        .eq('school_id', user.school_id)
        .maybeSingle();

      if (dbData) {
        loadedSettings = {
          portal_enabled: dbData.portal_enabled ?? true,
          maintenance_mode: dbData.maintenance_mode ?? false,
          maintenance_message: dbData.maintenance_message || DEFAULT_LMS_SETTINGS.maintenance_message,
          tabs: dbData.tabs_config ? { ...DEFAULT_LMS_SETTINGS.tabs, ...dbData.tabs_config } : DEFAULT_LMS_SETTINGS.tabs,
        };
      }

      // 2. Fallback to institute_profile table
      if (!loadedSettings) {
        const { data: profileData } = await supabase
          .from('institute_profile')
          .select('website')
          .eq('school_id', user.school_id)
          .maybeSingle();

        if (profileData?.website?.includes('LMS:')) {
          loadedSettings = decodeLmsSettings(profileData.website);
        }
      }

      if (loadedSettings) {
        setSettings(loadedSettings);
        localStorage.setItem('lms_portal_settings', JSON.stringify(loadedSettings));
      }
    } catch (e: any) {
      console.warn('Could not fetch LMS control settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.school_id) return;
    try {
      setSaving(true);
      localStorage.setItem('lms_portal_settings', JSON.stringify(settings));

      // 1. Save to dedicated lms_control_settings table
      const { error: dbErr } = await supabase
        .from('lms_control_settings')
        .upsert(
          {
            school_id: user.school_id,
            portal_enabled: settings.portal_enabled,
            maintenance_mode: settings.maintenance_mode,
            maintenance_message: settings.maintenance_message,
            tabs_config: settings.tabs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'school_id' }
        );

      // 2. Dual save to institute_profile (website column) as fail-safe fallback
      const compactPayload = encodeLmsSettings(settings);
      const { data: profileRows } = await supabase
        .from('institute_profile')
        .select('id')
        .eq('school_id', user.school_id);

      if (profileRows && profileRows.length > 0) {
        await supabase
          .from('institute_profile')
          .update({ website: compactPayload })
          .eq('id', profileRows[0].id);
      } else {
        await supabase.from('institute_profile').insert([
          {
            school_id: user.school_id,
            name: 'School',
            website: compactPayload,
          },
        ]);
      }

      toast.showToast('LMS Control Settings saved successfully!', 'success');
    } catch (e: any) {
      toast.showToast('Failed to save settings: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateTab = (tabKey: keyof LmsPortalSettings['tabs'], key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      tabs: {
        ...prev.tabs,
        [tabKey]: {
          ...prev.tabs[tabKey],
          [key]: value,
        },
      },
    }));
  };

  return (
    <PageContainer $theme={theme}>
      <HeaderSection>
        <TitleBlock>
          <TitleIconBox>
            <SettingsIcon style={{ fontSize: 30 }} />
          </TitleIconBox>
          <div>
            <TitleText>Student LMS Control Panel</TitleText>
            <SubTitleText>Manage student portal rendering, tab configurations, and maintenance mode</SubTitleText>
          </div>
        </TitleBlock>

        <ActionGroup>
          <Button onClick={fetchSettings} disabled={loading || saving}>
            <RefreshIcon style={{ fontSize: 18 }} />
            Refresh
          </Button>
          <Button $primary onClick={handleSave} disabled={loading || saving}>
            <SaveIcon style={{ fontSize: 18 }} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </ActionGroup>
      </HeaderSection>

      <NoticeBanner>
        <InfoIcon style={{ fontSize: 24 }} />
        <span>
          Changes made here instantly reflect across all student accounts on the Student LMS Portal in real-time.
        </span>
      </NoticeBanner>

      <GridContainer>
        {/* Global Settings */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <BuildIcon /> Global Controls
            </CardTitle>
          </CardHeader>
          <FormGroup>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Label style={{ margin: 0 }}>Enable LMS Portal</Label>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Master toggle for student portal access</span>
              </div>
              <ToggleSwitch $checked={settings.portal_enabled}>
                <input
                  type="checkbox"
                  checked={settings.portal_enabled}
                  onChange={(e) => setSettings({ ...settings, portal_enabled: e.target.checked })}
                />
                <span />
              </ToggleSwitch>
            </div>
          </FormGroup>

          <FormGroup style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Label style={{ margin: 0 }}>Maintenance Mode</Label>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Show maintenance screen to all students</span>
              </div>
              <ToggleSwitch $checked={settings.maintenance_mode}>
                <input
                  type="checkbox"
                  checked={settings.maintenance_mode}
                  onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
                />
                <span />
              </ToggleSwitch>
            </div>
          </FormGroup>

          <FormGroup style={{ marginTop: '1.25rem' }}>
            <Label>Maintenance Announcement Message</Label>
            <TextArea
              value={settings.maintenance_message}
              onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
              placeholder="Enter announcement message..."
            />
          </FormGroup>
        </Card>

        {/* Dashboard Tab */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <DashboardIcon /> Dashboard Tab
            </CardTitle>
            <ToggleSwitch $checked={settings.tabs.dashboard.enabled}>
              <input
                type="checkbox"
                checked={settings.tabs.dashboard.enabled}
                onChange={(e) => updateTab('dashboard', 'enabled', e.target.checked)}
              />
              <span />
            </ToggleSwitch>
          </CardHeader>
          <FormGroup>
            <Label>Custom Tab Label</Label>
            <Input
              value={settings.tabs.dashboard.label}
              onChange={(e) => updateTab('dashboard', 'label', e.target.value)}
            />
          </FormGroup>
        </Card>

        {/* Attendance Tab */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <AssessmentIcon /> Attendance Tab
            </CardTitle>
            <ToggleSwitch $checked={settings.tabs.attendance.enabled}>
              <input
                type="checkbox"
                checked={settings.tabs.attendance.enabled}
                onChange={(e) => updateTab('attendance', 'enabled', e.target.checked)}
              />
              <span />
            </ToggleSwitch>
          </CardHeader>
          <FormGroup>
            <Label>Custom Tab Label</Label>
            <Input
              value={settings.tabs.attendance.label}
              onChange={(e) => updateTab('attendance', 'label', e.target.value)}
            />
          </FormGroup>
        </Card>

        {/* Academics Tab */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <SchoolIcon /> Academics Tab
            </CardTitle>
            <ToggleSwitch $checked={settings.tabs.academics.enabled}>
              <input
                type="checkbox"
                checked={settings.tabs.academics.enabled}
                onChange={(e) => updateTab('academics', 'enabled', e.target.checked)}
              />
              <span />
            </ToggleSwitch>
          </CardHeader>
          <FormGroup>
            <Label>Custom Tab Label</Label>
            <Input
              value={settings.tabs.academics.label}
              onChange={(e) => updateTab('academics', 'label', e.target.value)}
            />
          </FormGroup>
          <CheckboxRow>
            <input
              type="checkbox"
              checked={settings.tabs.academics.show_class_tests}
              onChange={(e) => updateTab('academics', 'show_class_tests', e.target.checked)}
            />
            Show Class Tests Section
          </CheckboxRow>
          <CheckboxRow>
            <input
              type="checkbox"
              checked={settings.tabs.academics.show_exam_results}
              onChange={(e) => updateTab('academics', 'show_exam_results', e.target.checked)}
            />
            Show Exam Results Section
          </CheckboxRow>
        </Card>

        {/* Fees Tab */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <AttachMoneyIcon /> Fees Tab
            </CardTitle>
            <ToggleSwitch $checked={settings.tabs.fees.enabled}>
              <input
                type="checkbox"
                checked={settings.tabs.fees.enabled}
                onChange={(e) => updateTab('fees', 'enabled', e.target.checked)}
              />
              <span />
            </ToggleSwitch>
          </CardHeader>
          <FormGroup>
            <Label>Custom Tab Label</Label>
            <Input
              value={settings.tabs.fees.label}
              onChange={(e) => updateTab('fees', 'label', e.target.value)}
            />
          </FormGroup>
          <CheckboxRow>
            <input
              type="checkbox"
              checked={settings.tabs.fees.allow_online_payment}
              onChange={(e) => updateTab('fees', 'allow_online_payment', e.target.checked)}
            />
            Allow Online Payment Submissions
          </CheckboxRow>
        </Card>

        {/* Feedback Tab */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <FeedbackIcon /> Feedback Tab
            </CardTitle>
            <ToggleSwitch $checked={settings.tabs.feedback.enabled}>
              <input
                type="checkbox"
                checked={settings.tabs.feedback.enabled}
                onChange={(e) => updateTab('feedback', 'enabled', e.target.checked)}
              />
              <span />
            </ToggleSwitch>
          </CardHeader>
          <FormGroup>
            <Label>Custom Tab Label</Label>
            <Input
              value={settings.tabs.feedback.label}
              onChange={(e) => updateTab('feedback', 'label', e.target.value)}
            />
          </FormGroup>
        </Card>

        {/* Profile Tab */}
        <Card $theme={theme}>
          <CardHeader>
            <CardTitle>
              <PersonIcon /> Profile Tab
            </CardTitle>
            <ToggleSwitch $checked={settings.tabs.profile.enabled}>
              <input
                type="checkbox"
                checked={settings.tabs.profile.enabled}
                onChange={(e) => updateTab('profile', 'enabled', e.target.checked)}
              />
              <span />
            </ToggleSwitch>
          </CardHeader>
          <FormGroup>
            <Label>Custom Tab Label</Label>
            <Input
              value={settings.tabs.profile.label}
              onChange={(e) => updateTab('profile', 'label', e.target.value)}
            />
          </FormGroup>
          <CheckboxRow>
            <input
              type="checkbox"
              checked={settings.tabs.profile.allow_password_change}
              onChange={(e) => updateTab('profile', 'allow_password_change', e.target.checked)}
            />
            Allow Student Password Modification
          </CheckboxRow>
        </Card>
      </GridContainer>
    </PageContainer>
  );
};

export default LmsControlPanel;
