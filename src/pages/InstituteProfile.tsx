import React, { useState, useRef, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, Upload as UploadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { ThemeContext, darkTheme, lightTheme } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import { useLoading } from '../contexts/LoadingContext';
import Loader from '../components/Loader';

const PageContainer = styled.div`
  width: 100%;
  height: 100%;
  min-height: 100%;
  background: ${props => props.theme.BG};
  padding: 20px 16px;
  padding-bottom: 2rem; /* Extra padding at bottom to prevent clipping */
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
  position: relative;
  
  @media (max-width: 768px) {
    padding: 16px 12px;
    padding-bottom: 2rem;
  }
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${props => props.theme.BORDER};
`;

const PageTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 800;
  color: ${props => props.theme.TEXT_PRIMARY};
  margin: 0 0 6px 0;
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const PageSubtitle = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  margin: 0;
  line-height: 1.5;
`;

const Card = styled.div`
  background: ${props => props.theme.CARD};
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 32px;
  border: 1px solid ${props => props.theme.BORDER};
  width: 100%;
  
  @media (max-width: 768px) {
    padding: 24px 20px;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 20px 16px;
  }
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 32px;
  width: 100%;
  position: relative;
  
  @media (max-width: 1024px) {
    grid-template-columns: 200px 1fr;
    gap: 28px;
  }
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  
  @media (max-width: 768px) {
    gap: 24px;
  }
`;

const AvatarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;
  
  @media (max-width: 900px) {
    width: 100%;
    align-items: center;
  }
`;

const FieldsCol = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  min-width: 0;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  @media (max-width: 480px) {
    gap: 18px;
  }
`;

const LogoBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 20px;
  background: ${props => props.theme.FIELD_BG};
  border-radius: 12px;
  border: 1px solid ${props => props.theme.BORDER};
  
  @media (max-width: 900px) {
    max-width: 300px;
    margin: 0 auto;
  }
`;

const LogoCircle = styled.div`
  width: 160px;
  height: 160px;
  border-radius: 12px;
  background: ${props => props.theme.ICON_BG || props.theme.FIELD_BG};
  border: 2px solid ${props => props.theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  @media (max-width: 600px) {
    width: 140px;
    height: 140px;
  }
  
  @media (max-width: 480px) {
    width: 120px;
    height: 120px;
  }
`;

const LogoButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
  justify-content: center;
  width: 100%;
  max-width: 180px;
`;

const LogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const LogoUploadLabel = styled.label`
  background: ${props => props.theme.ACCENT};
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  box-shadow: 0 2px 8px ${props => props.theme.ACCENT}33;
  
  &:hover { 
    transform: translateY(-1px);
    box-shadow: 0 4px 12px ${props => props.theme.ACCENT}44;
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const RemoveLogoLink = styled.button`
  background: ${props => props.theme.FIELD_BG};
  border: 1px solid ${props => props.theme.BORDER};
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  
  &:hover { 
    background: ${props => props.theme.BG === '#252525' || props.theme.BG === '#181c2a' 
      ? props.theme.BORDER 
      : '#f3f4f6'};
    border-color: ${props => props.theme.TEXT_SECONDARY};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const FieldGroup = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  @media (max-width: 900px) {
    grid-column: 1 / -1;
  }
`;

const Label = styled.label`
  display: block;
  color: ${props => props.theme.TEXT_SECONDARY};
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.2px;
`;

const Value = styled.div`
  font-size: 1.13rem;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-weight: 600;
  word-break: break-word;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${props => props.theme.BORDER};
  border-radius: 8px;
  background: ${props => props.theme.FIELD_BG};
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.ACCENT};
    box-shadow: 0 0 0 3px ${props => props.theme.ACCENT}15;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${props => props.theme.TEXT_SECONDARY};
    opacity: 0.6;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px ${props => props.theme.FIELD_BG} inset !important;
    -webkit-text-fill-color: ${props => props.theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${props => props.theme.BORDER};
  border-radius: 8px;
  background: ${props => props.theme.FIELD_BG};
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  font-weight: 500;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.ACCENT};
    box-shadow: 0 0 0 3px ${props => props.theme.ACCENT}15;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${props => props.theme.TEXT_SECONDARY};
    opacity: 0.6;
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px ${props => props.theme.FIELD_BG} inset !important;
    -webkit-text-fill-color: ${props => props.theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  background: ${props => props.theme.ACCENT};
  color: white;
  box-shadow: 0 4px 12px ${props => props.theme.ACCENT}33;
  transition: all 0.2s ease;
  margin-top: 24px;
  width: 100%;
  justify-content: center;
  
  &:hover:not(:disabled) { 
    transform: translateY(-2px);
    box-shadow: 0 6px 16px ${props => props.theme.ACCENT}44;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 900px) {
    margin-top: 20px;
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const DataSourceIndicator = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  opacity: 0.7;
  margin-top: 12px;
  text-align: center;
  font-style: italic;
  padding: 8px;
  background: ${props => props.theme.FIELD_BG};
  border-radius: 6px;
  border: 1px solid ${props => props.theme.BORDER};
`;

const dummyProfile = {
  name: '',
  short_name: '',
  tagline: '',
  phone: '',
  website: '',
  address: '',
  country: '',
  logo_url: null,
};

const InstituteProfile: React.FC = () => {
  const [profile, setProfile] = useState<any>(dummyProfile);
  const [form, setForm] = useState<any>(dummyProfile);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'school' | 'institute' | 'none'>('none');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const { setLoading, loading } = useLoading();

  useEffect(() => {
    if (user?.school_id) {
      const minDuration = 2000;
      const start = Date.now();
      setLoading(true);
      fetchProfile().finally(() => {
        const elapsed = Date.now() - start;
        if (elapsed < minDuration) {
          setTimeout(() => setLoading(false), minDuration - elapsed);
        } else {
          setLoading(false);
        }
      });
    }
  }, [user?.school_id]);

  const fetchProfile = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }

    try {
      // Fetch institute profile
      const { data: profileData, error: profileError } = await supabase
      .from('institute_profile')
      .select('*')
      .eq('school_id', user.school_id)
      .single();

      // Fetch school data
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('id', user.school_id)
        .single();

      if (schoolError) {
        showToast('Failed to fetch school information', 'error');
        return;
      }

      // Merge school data with institute profile data
      const mergedData = {
        name: profileData?.name || schoolData?.name || '',
        short_name: profileData?.short_name || schoolData?.name?.substring(0, 3).toUpperCase() || '',
        tagline: profileData?.tagline || `Welcome to ${schoolData?.name || 'Our School'}`,
        phone: profileData?.phone || schoolData?.contact || '',
        website: profileData?.website || '',
        address: profileData?.address || schoolData?.address || '',
        country: profileData?.country || 'Pakistan',
        logo_url: profileData?.logo_url || schoolData?.logo_url || null,
      };

      if (profileData) {
        // Update with merged data, preserving institute profile fields
        const updatedProfile = { ...mergedData, ...profileData };
        setProfile(updatedProfile);
        setForm(updatedProfile);
        setLogoPreview(updatedProfile.logo_url || null);
        setProfileId(profileData.id);
        setDataSource('institute');
    } else {
        // No institute profile exists, use merged school data
        setProfile(mergedData);
        setForm(mergedData);
        setLogoPreview(mergedData.logo_url || null);
        setProfileId(null);
        setDataSource('school');
      }
    } catch (error) {
      showToast('Failed to fetch profile information', 'error');
      setProfile(dummyProfile);
      setForm(dummyProfile);
      setLogoPreview(null);
      setProfileId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      // If file is larger than 100KB, compress it
      if (file.size > 100 * 1024) {
        try {
          file = await imageCompression(file, {
            maxSizeMB: 0.09, // Stricter: target < 100KB
            maxWidthOrHeight: 400, // Stricter: smaller dimensions
            useWebWorker: true,
          });
        } catch (err) {
          showToast('Failed to compress image', 'error');
          return;
        }
      }
      // Log the file size for debugging
      // For preview
      const reader = new FileReader();
      reader.onload = (ev: ProgressEvent<FileReader>) => setLogoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      // Store the file for upload
      setLogoFile(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm({ ...form, logo_url: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user?.school_id) {
      showToast('User school information not found', 'error');
      return;
    }
    
    // Validate required fields
    if (!form.name || !form.name.trim()) {
      showToast('Institute name is required', 'error');
      return;
    }
    
    if (!form.phone || !form.phone.trim()) {
      showToast('Phone number is required', 'error');
      return;
    }
    
    if (!form.country || !form.country.trim()) {
      showToast('Country is required', 'error');
      return;
    }
    
    const minDuration = 2000;
    const start = Date.now();
    setLoading(true);
    let logo_url = form.logo_url;
    try {
      // Handle logo deletion if removed
      if (logoPreview === null && profile.logo_url) {
        const url = profile.logo_url;
        const match = url.match(/institute-logos\/([^?\s]+)/);
        if (match && match[1]) {
          const path = match[1];
          const { error: removeError } = await supabase.storage.from('institute-logos').remove([path]);
          if (removeError) {
            // Failed to delete old logo
          }
        }
        logo_url = null;
      }
      
      // Upload new logo if changed
      if (logoFile) {
        // Delete old logo if exists
        if (profile.logo_url) {
          const url = profile.logo_url;
          const match = url.match(/institute-logos\/([^?\s]+)/);
          if (match && match[1]) {
            const path = match[1];
            const { error: removeError } = await supabase.storage.from('institute-logos').remove([path]);
            if (removeError) {
              // Failed to delete old logo
            }
          }
        }

        // Upload new logo
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `institute_logo_${user.school_id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('institute-logos')
          .upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('institute-logos')
          .getPublicUrl(fileName);
        logo_url = publicUrl;
      }

      let error;
      if (!profileId) {
        // Insert new profile - ensure all required fields are set
        const insertData = { 
          name: form.name || profile.name || '',
          short_name: form.short_name || profile.short_name || '',
          tagline: form.tagline || profile.tagline || '',
          phone: form.phone || profile.phone || '',
          website: form.website || profile.website || '',
          address: form.address || profile.address || '',
          country: form.country || profile.country || 'Pakistan',
          logo_url: logo_url,
          school_id: user.school_id
        };
        
        const { data: insertResult, error: insertError } = await supabase
          .from('institute_profile')
          .insert([insertData])
          .select()
          .single();
          
        if (insertError) {
        error = insertError;
        } else if (insertResult) {
          // Set the profile ID for future updates
          setProfileId(insertResult.id);
        }
      } else {
        // Update existing profile - preserve existing data and update with form data
        const updateData = { 
          name: form.name || profile.name || '',
          short_name: form.short_name || profile.short_name || '',
          tagline: form.tagline || profile.tagline || '',
          phone: form.phone || profile.phone || '',
          website: form.website || profile.website || '',
          address: form.address || profile.address || '',
          country: form.country || profile.country || 'Pakistan',
          logo_url: logo_url
        };
        
        const { error: updateError } = await supabase
          .from('institute_profile')
          .update(updateData)
          .eq('id', profileId)
          .eq('school_id', user.school_id);
        error = updateError;
      }
      if (error) {
        throw error;
      }
      
      // Show appropriate success message
      if (!profileId) {
        showToast('Institute profile created successfully!', 'success');
      } else {
        showToast('Institute profile updated successfully!', 'success');
      }
      
      // Refresh the profile data to get the latest information
      await fetchProfile();
    } catch (error: any) {
      showToast('Failed to save profile: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < minDuration) {
        setTimeout(() => setLoading(false), minDuration - elapsed);
      } else {
      setLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleSave();
    }
  };

  if (loading) return <Loader />;

  return (
    <PageContainer>
      <MainContent>
        <PageHeader>
          <PageTitle>
            🏫 Institute Profile
          </PageTitle>
          <PageSubtitle>
            Manage your institute information, logo, and contact details
          </PageSubtitle>
        </PageHeader>
        <Card>
          <CardGrid>
            <AvatarCol>
              <LogoBlock>
                <LogoCircle>
                  {logoPreview || form.logo_url ? (
                    <>
                      <LogoImg src={logoPreview || form.logo_url} alt="Logo" />
                    </>
                  ) : (
                    <span style={{ fontSize: '1.5rem', color: 'inherit', opacity: 0.4, fontWeight: 600 }}>No Logo</span>
                  )}
                </LogoCircle>
                <LogoButtonsContainer>
                  <LogoUploadLabel htmlFor="logo-upload">
                    <UploadIcon style={{ fontSize: 16 }} />
                    Upload
                  </LogoUploadLabel>
                  <HiddenFileInput id="logo-upload" type="file" accept="image/*" onChange={handleLogoChange} ref={fileInputRef} />
                  {(logoPreview || form.logo_url) && (
                    <RemoveLogoLink type="button" onClick={removeLogo}>
                      <DeleteIcon style={{ fontSize: 16 }} />
                      Remove
                    </RemoveLogoLink>
                  )}
                </LogoButtonsContainer>
                {/* Data source indicator */}
                {dataSource !== 'none' && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'inherit',
                    opacity: 0.6,
                    marginTop: '12px',
                    textAlign: 'center',
                    fontStyle: 'italic',
                    padding: '8px',
                    background: 'inherit',
                    borderRadius: '6px'
                  }}>
                    Data from {dataSource === 'institute' ? 'Institute Profile' : 'School Database'}
                  </div>
                )}
              </LogoBlock>
            </AvatarCol>
            <FieldsCol>
              <FieldGroup>
                <Label>Institute Name *</Label>
                <Input 
                  name="name" 
                  value={form.name || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="Enter institute name"
                  required 
                  disabled={loading} 
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Short Name</Label>
                <Input 
                  name="short_name" 
                  value={form.short_name || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="e.g., YIN, ABC"
                  disabled={loading} 
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Tagline</Label>
                <Input 
                  name="tagline" 
                  value={form.tagline || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="Enter tagline"
                  disabled={loading} 
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Phone Number *</Label>
                <Input 
                  name="phone" 
                  value={form.phone || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="Enter phone number"
                  required 
                  disabled={loading} 
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Country *</Label>
                <Input 
                  name="country" 
                  value={form.country || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="Enter country"
                  required 
                  disabled={loading} 
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Website</Label>
                <Input 
                  name="website" 
                  value={form.website || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com"
                  disabled={loading} 
                />
              </FieldGroup>
              <FieldGroup style={{ gridColumn: '1 / -1' }}>
                <Label>Address</Label>
                <Textarea 
                  name="address" 
                  value={form.address || ''} 
                  onChange={handleInputChange} 
                  onKeyPress={handleKeyPress}
                  placeholder="Enter full address"
                  disabled={loading} 
                />
              </FieldGroup>
            </FieldsCol>
          </CardGrid>
          <ActionButton type="button" onClick={handleSave} disabled={loading}>
            <ButtonContent>
              {loading ? (
                <>
                  <CircularProgress size={16} color="inherit" />
                  {profileId ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <SaveIcon style={{ fontSize: 18 }} />
                  {profileId ? 'Update Profile' : 'Save Profile'}
                </>
              )}
            </ButtonContent>
          </ActionButton>
        </Card>
      </MainContent>
    </PageContainer>
  );
};

export default InstituteProfile; 