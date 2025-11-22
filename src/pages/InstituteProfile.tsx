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
  width: 100vw;
  min-height: 100vh;
  background: ${props => props.theme.BG};
  padding: 0;
`;

const MainContent = styled.div`
  width: 100%;
  min-height: 100vh;
  padding: 3.5rem 0 3.5rem 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  box-sizing: border-box;
`;

const Card = styled.div`
  background: ${props => props.theme.CARD};
  border-radius: 18px;
  box-shadow: ${props => props.theme.SHADOW};
  padding: 2.5rem 2rem;
  border: 1.5px solid ${props => props.theme.BORDER};
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 950px;
  min-height: 420px;
  margin: 0 1.5rem;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: 200px 1fr 1fr;
  gap: 2rem 2rem;
  width: 100%;
  min-height: 320px;
  position: relative;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: center;
  }
`;

const AvatarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-width: 0;
  @media (max-width: 900px) {
    grid-column: 1 / -1;
    margin-bottom: 1.5rem;
  }
  @media (max-width: 600px) {
    margin-bottom: 0.5rem;
  }
`;

const FieldsCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  min-width: 0;
  @media (max-width: 900px) {
    align-items: center;
    width: 100%;
    gap: 1.2rem;
  }
`;

const LogoBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const LogoCircle = styled.div`
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: ${props => props.theme.ICON_BG};
  border: 3px solid ${props => props.theme.ACCENT};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  margin-bottom: 1rem;
  @media (max-width: 600px) {
    width: 120px;
    height: 120px;
  }
`;

const LogoButtonsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: center;
  justify-content: center;
`;

const LogoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const LogoUploadLabel = styled.label`
  background: ${props => props.theme.ACCENT};
  color: white;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.BORDER};
  opacity: 0.9;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  justify-content: center;
  
  &:hover { 
    opacity: 1;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const RemoveLogoLink = styled.button`
  background: ${props => props.theme.CANCEL_BG};
  border: 1px solid ${props => props.theme.BORDER};
  color: ${props => props.theme.CANCEL_COLOR};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  opacity: 0.85;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  width: 100%;
  justify-content: center;
  
  &:hover { 
    opacity: 1;
    background: ${props => props.theme === darkTheme ? '#3a3a3a' : '#e5e5e5'};
  }
`;

const FieldGroup = styled.div`
  width: 100%;
  margin-bottom: 0.2rem;
  @media (max-width: 900px) {
    width: 100%;
    max-width: 400px;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  color: ${props => props.theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const Value = styled.div`
  font-size: 1.13rem;
  color: ${props => props.theme.TEXT_PRIMARY};
  font-weight: 600;
  word-break: break-word;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7rem;
  border: 1px solid ${props => props.theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${props => props.theme.FIELD_BG};
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1rem;
  margin-bottom: 0.1rem;

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
  padding: 0.7rem;
  border: 1px solid ${props => props.theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${props => props.theme.FIELD_BG};
  color: ${props => props.theme.TEXT_PRIMARY};
  font-size: 1rem;
  min-height: 60px;

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus,
  &:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px ${props => props.theme.FIELD_BG} inset !important;
    -webkit-text-fill-color: ${props => props.theme.TEXT_PRIMARY} !important;
    transition: background-color 5000s ease-in-out 0s;
  }
`;

const FloatingButton = styled.button`
  position: absolute;
  right: 32px;
  bottom: 32px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  border: 1px solid ${props => props.theme.BORDER};
  background: ${props => props.theme.ACCENT};
  color: white;
  opacity: 0.9;
  box-shadow: ${props => props.theme.SHADOW};
  transition: all 0.2s ease;
  
  &:hover { 
    opacity: 1;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 900px) {
    position: static;
    width: 100%;
    margin: 1.5rem 0 0 0;
    justify-content: center;
    font-size: 0.95rem;
    padding: 0.6rem 1.2rem;
    display: flex;
    align-items: center;
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
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
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
                    <span style={{ fontSize: '2.5rem', color: theme === 'dark' ? '#b0b8d1' : '#b0b8d1', fontWeight: 700 }}>No Logo</span>
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
                    fontSize: '0.8rem', 
                    color: theme === 'dark' ? '#888' : '#666',
                    marginTop: '0.5rem',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    Data loaded from {dataSource === 'institute' ? 'Institute Profile' : 'School Database'}
                  </div>
                )}
              </LogoBlock>
            </AvatarCol>
            {isMobile ? (
              <FieldsCol>
                <FieldGroup>
                  <Label>Name</Label>
                  <Input 
                    name="name" 
                    value={form.name || ''} 
                    onChange={handleInputChange} 
                    onKeyPress={handleKeyPress}
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
                    placeholder="e.g., YIN, ABC School"
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
                    disabled={loading} 
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label>Phone</Label>
                  <Input 
                    name="phone" 
                    value={form.phone || ''} 
                    onChange={handleInputChange} 
                    onKeyPress={handleKeyPress}
                    required 
                    disabled={loading} 
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label>Country</Label>
                  <Input 
                    name="country" 
                    value={form.country || ''} 
                    onChange={handleInputChange} 
                    onKeyPress={handleKeyPress}
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
                    disabled={loading} 
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label>Address</Label>
                  <Textarea 
                    name="address" 
                    value={form.address || ''} 
                    onChange={handleInputChange} 
                    onKeyPress={handleKeyPress}
                    disabled={loading} 
                  />
                </FieldGroup>
              </FieldsCol>
            ) : (
              <>
                <FieldsCol>
                  <FieldGroup>
                    <Label>Name</Label>
                    <Input 
                      name="name" 
                      value={form.name || ''} 
                      onChange={handleInputChange} 
                      onKeyPress={handleKeyPress}
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
                      placeholder="e.g., YIN, ABC School"
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
                      disabled={loading} 
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Phone</Label>
                    <Input 
                      name="phone" 
                      value={form.phone || ''} 
                      onChange={handleInputChange} 
                      onKeyPress={handleKeyPress}
                      required 
                      disabled={loading} 
                    />
                  </FieldGroup>
                </FieldsCol>
                <FieldsCol>
                  <FieldGroup>
                    <Label>Country</Label>
                    <Input 
                      name="country" 
                      value={form.country || ''} 
                      onChange={handleInputChange} 
                      onKeyPress={handleKeyPress}
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
                      disabled={loading} 
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Address</Label>
                    <Textarea 
                      name="address" 
                      value={form.address || ''} 
                      onChange={handleInputChange} 
                      onKeyPress={handleKeyPress}
                      disabled={loading} 
                    />
                  </FieldGroup>
                </FieldsCol>
              </>
            )}
            <FloatingButton type="button" onClick={handleSave} disabled={loading}>
              <ButtonContent>
                {loading ? (
                  <>
                    <CircularProgress size={16} color="inherit" />
                    {profileId ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  profileId ? 'Update' : 'Save'
                )}
              </ButtonContent>
            </FloatingButton>
          </CardGrid>
        </Card>
      </MainContent>
    </PageContainer>
  );
};

export default InstituteProfile; 