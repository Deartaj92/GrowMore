import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styled, { css } from 'styled-components';
import { Editor } from '@tinymce/tinymce-react';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/models/dom';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/directionality';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/nonbreaking';
import { ThemeContext, darkTheme, lightTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/useToast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const Container = styled.div`
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0.75rem 2rem 1.5rem 2rem;
  box-sizing: border-box;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: 768px) {
    padding: 0.75rem 1rem;
  }
`;

const TargetingControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px dashed ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  background: ${({ theme }) => theme.BG};
`;

const TargetControl = styled.div`
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const Header = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 0.5rem 0.25rem;
  background: ${({ theme }) => theme.BG};
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}55;

  @media (max-width: 768px) {
    position: static;
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.25rem 0;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.6rem);
  font-weight: 700;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
  min-width: 220px;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.9rem;
  flex: 3;
  min-width: 360px;

  @media (min-width: 1025px) {
    flex-wrap: nowrap;
  }

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderControls = styled.div`
  margin-top: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: 0.6rem;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  min-width: 0;

  @media (max-width: 1024px) {
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
    margin-top: 0;
  }
`;

const HeaderControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 180px;
  flex: 1;

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: nowrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: stretch;
    flex-wrap: wrap;
  }
`;

const MultiSelect = styled.select`
  width: 100%;
  min-height: 120px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  padding: 0.4rem;
  font-size: 0.9rem;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.TEXT_SECONDARY}66 ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.TEXT_SECONDARY}66;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.BG};
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#383d4a' : '#edf1f7'};
    border-radius: 999px;
  }
`;

const StudentBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
`;

const StudentBadge = styled.span`
  background: ${({ theme }) => theme.ACCENT}22;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
`;

const ClearSelectionButton = styled.button`
  align-self: flex-start;
  margin-top: 0.4rem;
  border: none;
  background: none;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.8rem;
  cursor: pointer;
`;

const HeaderIconButton = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme }) => theme.BG};
  }
`;

const MainGrid = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 1rem 1.2rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 2.8rem;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.9;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
`;

const EditorWrapper = styled.div`
  .tox-tinymce {
    border-radius: 12px;
    border: 1px solid ${({ theme }) => theme.BORDER};
    background: ${({ theme }) => theme.CARD};
  }

  .tox .tox-toolbar, .tox .tox-editor-header, .tox .tox-toolbar__primary {
    background: ${({ theme }) => theme.BG};
    border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  }

  .tox .tox-toolbar__primary {
    flex-wrap: wrap;
  }

  .tox .tox-statusbar {
    display: none;
  }

  .tox .tox-edit-area__iframe {
    background: ${({ theme }) => theme.CARD};
  }

  .tox .tox-mbtn, .tox .tox-tbtn {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  .tox .tox-split-button__chevron svg, .tox .tox-tbtn svg {
    fill: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  .tox .tox-toolbar__overflow, .tox .tox-toolbar__primary {
    border: none;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 160px;
  padding: 0.7rem 0.8rem;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
  resize: vertical;
  outline: none;
`;

const Button = styled.button<{ $variant?: 'primary' | 'ghost' }>`
  border-radius: 999px;
  padding: 0.55rem 1.2rem;
  font-size: 0.9rem;
  font-weight: 600;
  border: ${({ theme, $variant }) =>
    $variant === 'ghost' ? `1px solid ${theme.BORDER}` : 'none'};
  background: ${({ theme, $variant }) =>
    $variant === 'ghost' ? theme.CARD : theme.ACCENT};
  color: ${({ theme, $variant }) =>
    $variant === 'ghost' ? theme.TEXT_PRIMARY : theme.BG};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 120px;

  @media (max-width: 768px) {
    width: 100%;
  }
`;


const PreviewOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
`;

const PreviewBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  border: 1px solid ${({ theme }) => theme.BORDER};
  max-width: 380px;
  width: min(380px, calc(100vw - 32px));
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PreviewHeader = styled.div`
  padding: 8px 16px 6px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`;

const quillContentStyles = css`
  & h1, & h2, & h3, & h4, & h5, & h6 {
    margin: 8px 0 4px 0;
    font-weight: 600;
  }

  & p {
    margin: 6px 0;
  }

  & ul, & ol {
    margin: 6px 0 6px 1.2rem;
    padding-left: 1rem;
  }

  & li {
    margin: 2px 0;
  }

  & code {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'};
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85em;
  }

  .ql-editor {
    font-family: 'JameelNooriNastaleeq', 'Inter', 'Segoe UI', Arial, sans-serif;
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }

  & strong, & b {
    font-weight: 600;
  }

  & em, & i {
    font-style: italic;
  }
`;

const PreviewHeaderTitle = styled.div`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  width: 100%;
  ${quillContentStyles}
`;

const PreviewBodyScrollable = styled.div`
  padding: 14px 18px;
  flex: 1;
  overflow-y: auto;
  font-size: 0.95rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  line-height: 1.5;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'};
  min-height: 180px;
  ${quillContentStyles}

  /* Minimal scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.28);
  }
`;

const PreviewFooter = styled.div`
  padding: 10px 18px 12px 18px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  min-height: 44px;
  justify-content: center;
`;

const PreviewFooterHighlight = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  width: 100%;
  font-family: 'JameelNooriNastaleeq', 'Inter', 'Segoe UI', Arial, sans-serif;
  ${quillContentStyles}
`;

const PreviewActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
`;

const PreviewActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.2s ease, background 0.2s ease;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  ${({ theme, $variant }) => $variant === 'primary'
    ? css`
        background: ${theme.ACCENT};
        color: ${theme.BG};
        &:hover {
          transform: translateY(-1px);
          background: ${theme.ACCENT}cc;
        }
      `
    : css`
        background: ${theme.CARD};
        color: ${theme.TEXT_PRIMARY};
        border-color: ${theme.BORDER};
        &:hover {
          transform: translateY(-1px);
          background: ${theme.BG};
        }
      `}
`;

const PreviewContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const PreviewFlexArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const PreviewOptions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 0.85rem;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
`;

const PreviewHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`;

const ListContainer = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const ListHeader = styled.div`
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ListHeaderTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  flex: 1;
`;

const ListSearchInput = styled.input`
  min-width: 220px;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  outline: none;
`;

const SelectSearchInput = styled.input`
  width: 100%;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
`;

const ListScrollArea = styled.div`
  max-height: 420px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.TEXT_SECONDARY}66 ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.TEXT_SECONDARY}66;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.BG};
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG === '#252525' ? '#383d4a' : '#edf1f7'};
    border-radius: 999px;
  }
`;

const AnnouncementRow = styled.div`
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: ${({ theme }) => theme.BG};
`;

const AnnouncementRowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
`;

const AnnouncementRowTitle = styled.button`
  font-size: 0.9rem;
  font-weight: 600;
  background: none;
  border: none;
  padding: 0;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  text-align: left;
  cursor: pointer;
`;

const AnnouncementRowMeta = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
`;

const AnnouncementRowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const AnnouncementIconButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  &:hover {
    transform: translateY(-1px);
    background: ${({ theme }) => theme.BG};
  }
`;

const SeenByOverlay = styled(PreviewOverlay)`
  z-index: 13000;
`;

const SeenByBox = styled.div`
  background: ${({ theme }) => theme.CARD};
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  border: 1px solid ${({ theme }) => theme.BORDER};
  width: min(420px, calc(100vw - 32px));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const SeenByHeader = styled.div`
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const SeenByHeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
`;

const SeenByTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const SeenByAnnouncementTitle = styled.div`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.3;
  max-height: 72px;
  overflow: hidden;
  word-break: break-word;
`;

const SeenByClose = styled(AnnouncementIconButton)`
  width: 32px;
  height: 32px;
`;

const SeenBySearchRow = styled.div`
  padding: 0 18px 10px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}44;
`;

const SeenBySearchInput = styled.input`
  width: 100%;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.85rem;
`;

const SeenByList = styled.div`
  padding: 14px 18px;
  flex: 1;
  overflow-y: scroll;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px;
  scrollbar-width: thin;
  scrollbar-color: ${({ theme }) => `${theme.ACCENT} ${theme.BG}`};

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.BG};
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.ACCENT};
    border-radius: 999px;
    border: 2px solid ${({ theme }) => theme.BG};
  }
`;

const SeenByItem = styled.div`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const SeenByPrimaryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
`;

const SeenById = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.9rem;
`;

const SeenByName = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.ACCENT};
  font-size: 0.95rem;
`;

const SeenBySeparator = styled.span`
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-weight: 500;
`;

const SeenByDetails = styled.span`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  line-height: 1.3;
`;

const SeenByMeta = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
`;

const SeenByEmpty = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  padding: 24px 12px;
  font-size: 0.9rem;
`;

const SmallActionButton = styled.button`
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  border: 1px solid ${({ theme }) => theme.BORDER};
  background: ${({ theme }) => theme.CARD};
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  font-size: 0.7rem;
  cursor: pointer;
`;

type AudienceType = 'all_students' | 'all_staff' | 'students_by_class' | 'students_selected' | 'staff_selected' | 'all_users';

const UserAnnouncements: React.FC = () => {
  const { theme: themeMode } = useContext(ThemeContext);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  const toast = useToast();
  const { user } = useAuth();

  const [audience, setAudience] = useState<AudienceType>('all_students');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const todayISO = new Date().toISOString().split('T')[0];
  const [showFrom, setShowFrom] = useState(todayISO);
  const [expiresAt, setExpiresAt] = useState('');
  const [sending, setSending] = useState(false);
  const [footerText, setFooterText] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<{ title?: string; message?: string; footer_text?: string } | null>(null);
  const [hideDontShow, setHideDontShow] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [seenByModalOpen, setSeenByModalOpen] = useState(false);
  const [seenByLoading, setSeenByLoading] = useState(false);
  const [seenByError, setSeenByError] = useState<string | null>(null);
  const [seenByEntries, setSeenByEntries] = useState<any[]>([]);
  const [seenByAnnouncement, setSeenByAnnouncement] = useState<any | null>(null);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [sections, setSections] = useState<Array<{ id: number; name: string; class_id: number }>>([]);
  const [students, setStudents] = useState<Array<{ id: number; name: string; father_name?: string | null; class_id: number; section_id: number | null }>>([]);
  const [staffMembers, setStaffMembers] = useState<Array<{ id: number; name: string; role?: string | null }>>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedSectionId, setSelectedSectionId] = useState<number | ''>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [seenBySearchTerm, setSeenBySearchTerm] = useState('');

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds(prev => (prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]));
  };

  const toggleStaffSelection = (staffId: number) => {
    setSelectedStaffIds(prev => (prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]));
  };

  useEffect(() => {
    const loadTargetingData = async () => {
      if (!user?.school_id) return;
      try {
        const [{ data: classData }, { data: sectionData }, { data: studentData }, { data: staffData }] = await Promise.all([
          supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name'),
          supabase.from('sections').select('id, name, class_id').eq('school_id', user.school_id).order('name'),
          supabase.from('students').select('id, name, father_name, class_id, section_id').eq('school_id', user.school_id).order('id'),
          supabase.from('staff').select('id, name, role').eq('school_id', user.school_id).order('name')
        ]);
        if (classData) setClasses(classData);
        if (sectionData) setSections(sectionData);
        if (studentData) setStudents(studentData);
        if (staffData) setStaffMembers(staffData);
      } catch (error) {
      }
    };
    loadTargetingData();
  }, [user?.school_id]);

  const filteredSections = useMemo(() => {
    if (!selectedClassId) return sections;
    return sections.filter(section => section.class_id === selectedClassId);
  }, [sections, selectedClassId]);

  const filteredStudents = useMemo(() => {
    const needle = studentSearchTerm.trim().toLowerCase();
    return students.filter(student => {
      if (audience === 'students_selected') {
        if (selectedClassId && student.class_id !== selectedClassId) return false;
        if (selectedSectionId && student.section_id !== selectedSectionId) return false;
      }
      if (!needle) return true;
      const idMatch = String(student.id).includes(needle);
      const nameMatch = student.name.toLowerCase().includes(needle);
      const fatherMatch = (student.father_name || '').toLowerCase().includes(needle);
      const className = classes.find(cls => cls.id === student.class_id)?.name?.toLowerCase() || '';
      const sectionName = student.section_id ? (sections.find(sec => sec.id === student.section_id)?.name?.toLowerCase() || '') : '';
      const classMatch = className.includes(needle) || sectionName.includes(needle);
      return idMatch || nameMatch || fatherMatch || classMatch;
    });
  }, [students, audience, selectedClassId, selectedSectionId, studentSearchTerm, classes, sections]);

  const filteredStaffMembers = useMemo(() => {
    const needle = staffSearchTerm.trim().toLowerCase();
    if (!needle) return staffMembers;
    return staffMembers.filter(member => {
      const idMatch = String(member.id).includes(needle);
      const nameMatch = member.name?.toLowerCase().includes(needle);
      const roleMatch = member.role?.toLowerCase().includes(needle);
      return idMatch || nameMatch || roleMatch;
    });
  }, [staffMembers, staffSearchTerm]);

  const classesMap = useMemo(() => {
    const map = new Map<number, string>();
    classes.forEach(cls => map.set(cls.id, cls.name));
    return map;
  }, [classes]);

  const sectionsMap = useMemo(() => {
    const map = new Map<number, { name: string; class_id: number }>();
    sections.forEach(sec => map.set(sec.id, { name: sec.name, class_id: sec.class_id }));
    return map;
  }, [sections]);

  const studentsMap = useMemo(() => {
    const map = new Map<number, typeof students[number]>();
    students.forEach(student => map.set(student.id, student));
    return map;
  }, [students]);

  const staffMap = useMemo(() => {
    const map = new Map<number, typeof staffMembers[number]>();
    staffMembers.forEach(member => map.set(member.id, member));
    return map;
  }, [staffMembers]);

  const formatSelections = (ids: number[] | null | undefined, formatter: (id: number) => string) => {
    if (!ids || !ids.length) return '';
    const labels = ids
      .map(id => formatter(id))
      .filter(Boolean);
    if (!labels.length) return '';
    const preview = labels.slice(0, 3).join(', ');
    const extra = labels.length > 3 ? ` +${labels.length - 3} more` : '';
    return `${preview}${extra}`;
  };

  const getSeenByPrimaryLabel = useCallback((entry: any) => {
    if (entry.student_id) return String(entry.student_id);
    if (entry.staff_id) return String(entry.staff_id);
    return entry.viewer_identifier || entry.viewer_name || '—';
  }, []);

  const getSeenByNameValue = useCallback((entry: any) => {
    if (entry.student_id) {
      const student = studentsMap.get(entry.student_id);
      return student?.name || entry.viewer_name || entry.viewer_identifier || '';
    }
    if (entry.staff_id) {
      const staff = staffMap.get(entry.staff_id);
      return staff?.name || entry.viewer_name || entry.viewer_identifier || '';
    }
    return entry.viewer_name || entry.viewer_identifier || '';
  }, [studentsMap, staffMap]);

  const getSeenByDetailLine = useCallback((entry: any) => {
    if (entry.student_id) {
      const student = studentsMap.get(entry.student_id);
      const parts: string[] = [];
      if (student?.father_name) parts.push(student.father_name);
      const className = student ? classesMap.get(student.class_id) : null;
      const sectionName = student?.section_id ? sectionsMap.get(student.section_id)?.name : null;
      if (className) parts.push(sectionName ? `${className} (${sectionName})` : className);
      return parts.join(' · ');
    }
    if (entry.staff_id) {
      const staff = staffMap.get(entry.staff_id);
      const parts: string[] = [];
      if (staff?.role || entry.viewer_role) parts.push(staff?.role || entry.viewer_role);
      return parts.join(' · ');
    }
    return entry.viewer_name || entry.viewer_identifier || '';
  }, [classesMap, sectionsMap, studentsMap, staffMap]);

  const filteredSeenByEntries = useMemo(() => {
    const needle = seenBySearchTerm.trim().toLowerCase();
    if (!needle) return seenByEntries;
    return seenByEntries.filter(entry => {
      const name = getSeenByNameValue(entry).toLowerCase();
      const role = (entry.viewer_role || entry.viewer_type || '').toLowerCase();
      const identifier = (entry.viewer_identifier || '').toLowerCase();
      const detail = getSeenByDetailLine(entry).toLowerCase();
      const primary = getSeenByPrimaryLabel(entry).toLowerCase();
      return name.includes(needle) || role.includes(needle) || identifier.includes(needle) || detail.includes(needle) || primary.includes(needle);
    });
  }, [seenByEntries, seenBySearchTerm, getSeenByDetailLine, getSeenByPrimaryLabel, getSeenByNameValue]);

  const getAnnouncementAudienceLabel = useCallback((announcement: any) => {
    if (!announcement) return '';
    if (announcement.audience_group === 'students') {
      switch (announcement.target_scope) {
        case 'all':
          return 'Audience: All students';
        case 'class': {
          const className = classesMap.get(announcement.class_id) || `Class #${announcement.class_id}`;
          const sectionName = announcement.section_id
            ? sectionsMap.get(announcement.section_id)?.name
            : null;
          return `Audience: ${className || 'Specific class'}${sectionName ? ` · Section: ${sectionName}` : ''}`;
        }
        case 'single':
        case 'multi': {
          const ids: number[] = (announcement.student_ids && announcement.student_ids.length
            ? announcement.student_ids
            : announcement.student_id
              ? [announcement.student_id]
              : []) as number[];
          const details = formatSelections(ids, id => {
            const student = studentsMap.get(id);
            if (!student) return `ID ${id}`;
            const className = classesMap.get(student.class_id);
            const sectionName = student.section_id ? sectionsMap.get(student.section_id)?.name : null;
            return `${student.name}${className ? ` · ${className}` : ''}${sectionName ? ` (${sectionName})` : ''}`;
          });
          return details ? `Audience: ${details}` : 'Audience: Selected students';
        }
        default:
          return 'Audience: Students';
      }
    }

    if (announcement.audience_group === 'staff') {
      switch (announcement.target_scope) {
        case 'all':
          return 'Audience: All staff';
        case 'role':
          return `Audience: ${announcement.staff_role || 'Staff role'}`;
        case 'single':
        case 'multi': {
          const ids: number[] = (announcement.staff_ids && announcement.staff_ids.length
            ? announcement.staff_ids
            : announcement.staff_id
              ? [announcement.staff_id]
              : []) as number[];
          const details = formatSelections(ids, id => {
            const staff = staffMap.get(id);
            if (!staff) return `ID ${id}`;
            return `${staff.name}${staff.role ? ` · ${staff.role}` : ''}`;
          });
          return details ? `Audience: ${details}` : 'Audience: Selected staff';
        }
        default:
          return 'Audience: Staff';
      }
    }

    return 'Audience: Custom';
  }, [classesMap, sectionsMap, studentsMap, staffMap, formatSelections]);

  const resetForm = () => {
    setAudience('all_students');
    setTitle('');
    setMessage('');
    setFooterText('');
    setShowFrom('');
    setExpiresAt('');
    setEditingId(null);
    setPreviewData(null);
    setSelectedClassId('');
    setSelectedSectionId('');
    setSelectedStudentIds([]);
    setSelectedStaffIds([]);
    setStudentSearchTerm('');
    setStaffSearchTerm('');
    setHideDontShow(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.showToast('Please enter a title and message', 'error');
      return;
    }

    if (!showFrom) {
      toast.showToast('Please select the “Show from” date.', 'error');
      return;
    }

    if (!user?.school_id || !user?.id) {
      toast.showToast('Missing school information. Please re-login.', 'error');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const effectiveShowFrom = showFrom || today;

    let payload: any = {
      school_id: user.school_id,
      created_by: user.id,
      title: title.trim(),
      message: message.trim(),
      show_from: effectiveShowFrom,
      show_until: expiresAt || null,
      is_active: true,
      footer_text: footerText.trim() || null,
      hide_dont_show: hideDontShow,
    };
    if (audience === 'all_students') {
      payload = {
        ...payload,
        audience_group: 'students',
        target_scope: 'all',
      };
    } else if (audience === 'all_staff') {
      payload = {
        ...payload,
        audience_group: 'staff',
        target_scope: 'all',
        staff_role: null,
      };
    } else if (audience === 'students_by_class') {
      if (!selectedClassId) {
        toast.showToast('Please select a class for targeting.', 'error');
        return;
      }
      payload = {
        ...payload,
        audience_group: 'students',
        target_scope: 'class',
        class_id: selectedClassId,
        section_id: selectedSectionId || null,
      };
    } else if (audience === 'students_selected') {
      if (!selectedStudentIds.length) {
        toast.showToast('Please select at least one student.', 'error');
        return;
      }

      const multiPayload = {
        ...payload,
        audience_group: 'students',
        target_scope: 'multi',
        class_id: selectedClassId || null,
        section_id: selectedSectionId || null,
        student_ids: selectedStudentIds,
        student_id: null,
      };

      try {
        setSending(true);
        if (editingId) {
          const { error } = await supabase
            .from('announcements')
            .update(multiPayload)
            .eq('id', editingId);
          if (error) throw error;
          toast.showToast('Announcement updated successfully!', 'success');
        } else {
          const { error } = await supabase.from('announcements').insert([multiPayload]);
          if (error) throw error;
          toast.showToast('Announcement sent to selected students!', 'success');
        }
        resetForm();
        await loadAnnouncements();
      } catch (error: any) {
        toast.showToast('Failed to save announcement: ' + (error.message || ''), 'error');
      } finally {
        setSending(false);
      }
      return;
    } else if (audience === 'staff_selected') {
      if (!selectedStaffIds.length) {
        toast.showToast('Please select at least one staff member.', 'error');
        return;
      }

      const multiStaffPayload = {
        ...payload,
        audience_group: 'staff',
        target_scope: 'multi',
        staff_ids: selectedStaffIds,
        staff_id: null,
      };

      try {
        setSending(true);
        if (editingId) {
          const { error } = await supabase
            .from('announcements')
            .update(multiStaffPayload)
            .eq('id', editingId);
          if (error) throw error;
          toast.showToast('Announcement updated successfully!', 'success');
        } else {
          const { error } = await supabase.from('announcements').insert([multiStaffPayload]);
          if (error) throw error;
          toast.showToast('Announcement sent to selected staff!', 'success');
        }
        resetForm();
        await loadAnnouncements();
      } catch (error: any) {
        toast.showToast('Failed to save announcement: ' + (error.message || ''), 'error');
      } finally {
        setSending(false);
      }
      return;
    } else if (audience === 'all_users') {
      const studentPayload = {
        ...payload,
        audience_group: 'students',
        target_scope: 'all',
      };
      const staffPayload = {
        ...payload,
        audience_group: 'staff',
        target_scope: 'all',
      };

      try {
        setSending(true);
        if (editingId) {
          const { error } = await supabase
            .from('announcements')
            .update(studentPayload)
            .eq('id', editingId);
          if (error) throw error;
          const { error: staffError } = await supabase.from('announcements').insert([staffPayload]);
          if (staffError) throw staffError;
          toast.showToast('Announcement updated for all users.', 'success');
        } else {
          const { error } = await supabase.from('announcements').insert([studentPayload, staffPayload]);
          if (error) throw error;
          toast.showToast('Announcement sent to all users!', 'success');
        }
        resetForm();
        await loadAnnouncements();
      } catch (error: any) {
        toast.showToast('Failed to save announcement: ' + (error.message || ''), 'error');
      } finally {
        setSending(false);
      }
      return;
    }

    try {
      setSending(true);
      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.showToast('Announcement updated successfully!', 'success');
      } else {
        const { error } = await supabase.from('announcements').insert([payload]);
        if (error) throw error;
        toast.showToast('Announcement saved successfully!', 'success');
      }

      setTitle('');
      setMessage('');
      setFooterText('');
      setEditingId(null);
      await loadAnnouncements();
    } catch (error: any) {
      toast.showToast('Failed to save announcement: ' + (error.message || ''), 'error');
    } finally {
      setSending(false);
    }
  };

  const loadAnnouncements = async () => {
    if (!user?.school_id) return;
    try {
      setLoadingList(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('school_id', user.school_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (e) {
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user?.school_id]);

  useEffect(() => {
    const handleClickAway = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('.tox')) return;
      const escEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        keyCode: 27,
        which: 27,
        bubbles: true,
      });
      document.dispatchEvent(escEvent);
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, []);

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setTitle(a.title || '');
    setMessage(a.message || '');
    setFooterText(a.footer_text || '');
    setShowFrom(a.show_from || '');
    setExpiresAt(a.show_until || '');
    setHideDontShow(!!a.hide_dont_show);

    const toArray = (value: number | number[] | null | undefined) => {
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'number') return [value];
      return [];
    };

    if (a.audience_group === 'students') {
      if (a.target_scope === 'all') {
        setAudience('all_students');
        setSelectedClassId('');
        setSelectedSectionId('');
        setSelectedStudentIds([]);
      } else if (a.target_scope === 'class') {
        setAudience('students_by_class');
        setSelectedClassId(a.class_id || '');
        setSelectedSectionId(a.section_id || '');
        setSelectedStudentIds([]);
      } else {
        setAudience('students_selected');
        setSelectedClassId(a.class_id || '');
        setSelectedSectionId(a.section_id || '');
        setSelectedStudentIds(toArray(a.student_ids) || toArray(a.student_id));
      }
    } else if (a.audience_group === 'staff') {
      if (a.target_scope === 'all') {
        setAudience('all_staff');
        setSelectedStaffIds([]);
      } else if (a.target_scope === 'role') {
        setAudience('staff_selected');
        setSelectedStaffIds([]);
      } else {
        setAudience('staff_selected');
        setSelectedStaffIds(toArray(a.staff_ids) || toArray(a.staff_id));
      }
    } else if (a.audience_group === 'students_staff') {
      setAudience('all_users');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this announcement permanently?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.showToast('Announcement deleted.', 'success');
      if (editingId === id) setEditingId(null);
      await loadAnnouncements();
    } catch (e: any) {
      toast.showToast('Failed to delete announcement: ' + (e.message || ''), 'error');
    }
  };

  const loadSeenByEntries = async (announcementId: number) => {
    setSeenByLoading(true);
    setSeenByError(null);
    try {
      const { data, error } = await supabase
        .from('announcement_views')
        .select('*')
        .eq('announcement_id', announcementId)
        .order('seen_at', { ascending: false });
      if (error) throw error;
      setSeenByEntries(data || []);
    } catch (error) {
      setSeenByError('Unable to load viewers right now.');
    } finally {
      setSeenByLoading(false);
    }
  };

  const handleOpenSeenBy = (announcement: any) => {
    setSeenByAnnouncement(announcement);
    setSeenBySearchTerm('');
    setSeenByModalOpen(true);
    loadSeenByEntries(announcement.id);
  };

  const handleCloseSeenBy = () => {
    setSeenByModalOpen(false);
    setSeenByAnnouncement(null);
    setSeenByEntries([]);
    setSeenByError(null);
  };

  const handleOpenPreview = (announcement: any) => {
    setPreviewData({
      title: announcement.title,
      message: announcement.message,
      footer_text: announcement.footer_text,
    });
    setShowPreviewModal(true);
  };

  const getPlainText = (value?: string | null) => {
    if (!value) return '';
    return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (!searchTerm.trim()) return true;
    const needle = searchTerm.trim().toLowerCase();
    const titleText = getPlainText(a.title).toLowerCase();
    const messageText = getPlainText(a.message).toLowerCase();
    return titleText.includes(needle) || messageText.includes(needle);
  });

  const isDark = themeMode === 'dark';

  const editorInit = (height: number) => ({
    menubar: false,
    height,
    statusbar: false,
    branding: false,
    plugins: 'advlist lists link directionality autoresize charmap wordcount nonbreaking',
    toolbar:
      'undo redo | fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist | ltr rtl | removeformat',
    skin_url: `${process.env.PUBLIC_URL || '.'}/tinymce/skins/ui/${isDark ? 'oxide-dark' : 'oxide'}`,
    content_css: `${process.env.PUBLIC_URL || '.'}/tinymce/skins/content/${isDark ? 'dark' : 'default'}/content.min.css`,
    font_family_formats:
      "Urdu Jameel='JameelNooriNastaleeq', serif;Inter='Inter',sans-serif;Arial=arial,helvetica,sans-serif;'Times New Roman'=times new roman,times,serif;",
    fontsize_formats: '10px 12px 14px 16px 18px 20px 22px 24px 28px 32px 36px 48px 60px 72px 84px 96px 120px',
    content_style: `@font-face { font-family: 'JameelNooriNastaleeq'; src: url('/fonts/JameelNooriNastaleeq.ttf') format('truetype'); font-weight: normal; font-style: normal; }
      body { font-family: 'JameelNooriNastaleeq', Inter, 'Segoe UI', sans-serif; font-size: 14px; color: ${theme.TEXT_PRIMARY}; background: ${theme.CARD}; }`,
  });

  return (
    <Container theme={theme}>
      <Header>
        <HeaderLeft>
          <Title>User Announcements</Title>
        </HeaderLeft>
        <HeaderRight>
          <HeaderControls>
            <HeaderControlGroup>
              <Label>Select audience</Label>
              <Select
                theme={theme}
                value={audience}
                onChange={e => setAudience(e.target.value as AudienceType)}
              >
                <option value="all_students">All students</option>
                <option value="students_by_class">Specific class / section</option>
                <option value="students_selected">Specific students</option>
                <option value="staff_selected">Specific staff</option>
                <option value="all_staff">All staff</option>
                <option value="all_users">All users (students + staff)</option>
              </Select>
            </HeaderControlGroup>

            <HeaderControlGroup>
              <Label>Show from *</Label>
              <Input
                theme={theme}
                type="date"
                value={showFrom}
                onChange={e => setShowFrom(e.target.value)}
              />
            </HeaderControlGroup>

            <HeaderControlGroup>
              <Label>Show until (optional)</Label>
              <Input
                theme={theme}
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
              />
            </HeaderControlGroup>
          </HeaderControls>
          <HeaderActions>
            <HeaderIconButton
              theme={theme}
              type="button"
              title="Reset form"
              aria-label="Reset form"
              onClick={resetForm}
            >
              <RestartAltIcon fontSize="small" />
            </HeaderIconButton>
            <Button
              $variant="primary"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Saving…' : 'Save announcement'}
            </Button>
            <Button
              $variant="ghost"
              type="button"
              onClick={() => setShowPreviewModal(true)}
            >
              Preview only
            </Button>
          </HeaderActions>
        </HeaderRight>
      </Header>

      {(audience === 'students_by_class' || audience === 'students_selected') && (
        <TargetingControls theme={theme}>
          <TargetControl>
            <Label>Select class</Label>
            <Select
              theme={theme}
              value={selectedClassId}
              onChange={e => {
                const value = e.target.value ? Number(e.target.value) : '';
                setSelectedClassId(value);
                setSelectedSectionId('');
                if (audience === 'students_selected') setSelectedStudentIds([]);
              }}
            >
              <option value="">All classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </Select>
          </TargetControl>

          <TargetControl>
            <Label>Section (optional)</Label>
            <Select
              theme={theme}
              value={selectedSectionId}
              onChange={e => {
                const value = e.target.value ? Number(e.target.value) : '';
                setSelectedSectionId(value);
                if (audience === 'students_selected') setSelectedStudentIds([]);
              }}
              disabled={!selectedClassId}
            >
              <option value="">All sections</option>
              {filteredSections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </Select>
          </TargetControl>

          {audience === 'students_selected' && (
            <TargetControl>
              <Label>Select students</Label>
              <SelectSearchInput
                theme={theme}
                type="search"
                placeholder="Search students by name, ID, class..."
                value={studentSearchTerm}
                onChange={e => setStudentSearchTerm(e.target.value)}
              />
              <MultiSelect
                theme={theme}
                multiple
                value={selectedStudentIds.map(String)}
                onChange={e => {
                  const lastSelectedIndex = e.target.selectedIndex;
                  const options = Array.from(e.target.options);
                  const selectedOption = options[lastSelectedIndex];
                  const selectedValue = selectedOption ? Number(selectedOption.value) : null;
                  if (selectedValue) {
                    toggleStudentSelection(selectedValue);
                  }
                }}
                disabled={!filteredStudents.length}
              >
                {filteredStudents.map(student => {
                  const sectionName = student.section_id ? sections.find(sec => sec.id === student.section_id)?.name : '';
                  const className = classes.find(cls => cls.id === student.class_id)?.name || '';
                  const label = `${student.id} · ${student.name} · ${student.father_name || '—'} · ${className}${sectionName ? ` (${sectionName})` : ''}`;
                  return (
                    <option key={student.id} value={student.id}>
                      {label}
                    </option>
                  );
                })}
              </MultiSelect>
              {selectedStudentIds.length > 0 && (
                <StudentBadgeRow>
                  {selectedStudentIds.map(id => {
                    const stu = students.find(s => s.id === id);
                    return <StudentBadge key={id}>{stu?.name || id}</StudentBadge>;
                  })}
                </StudentBadgeRow>
              )}
              {selectedStudentIds.length > 0 && (
                <ClearSelectionButton theme={theme} type="button" onClick={() => setSelectedStudentIds([])}>
                  Clear selection
                </ClearSelectionButton>
              )}
            </TargetControl>
          )}
        </TargetingControls>
      )}

      {audience === 'staff_selected' && (
        <TargetingControls theme={theme}>
          <TargetControl>
            <Label>Select staff members</Label>
            <SelectSearchInput
              theme={theme}
              type="search"
              placeholder="Search staff by name, ID, role..."
              value={staffSearchTerm}
              onChange={e => setStaffSearchTerm(e.target.value)}
            />
            <MultiSelect
              theme={theme}
              multiple
              value={selectedStaffIds.map(String)}
              onChange={e => {
                const lastIndex = e.target.selectedIndex;
                const options = Array.from(e.target.options);
                const selectedOption = options[lastIndex];
                const selectedValue = selectedOption ? Number(selectedOption.value) : null;
                if (selectedValue) {
                  toggleStaffSelection(selectedValue);
                }
              }}
              disabled={!filteredStaffMembers.length}
            >
              {filteredStaffMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {`${member.id} · ${member.name}${member.role ? ` · ${member.role}` : ''}`}
                </option>
              ))}
            </MultiSelect>
            {selectedStaffIds.length > 0 && (
              <StudentBadgeRow>
                {selectedStaffIds.map(id => {
                  const staff = staffMembers.find(s => s.id === id);
                  return <StudentBadge key={id}>{staff?.name || id}</StudentBadge>;
                })}
              </StudentBadgeRow>
            )}
            {selectedStaffIds.length > 0 && (
              <ClearSelectionButton theme={theme} type="button" onClick={() => setSelectedStaffIds([])}>
                Clear selection
              </ClearSelectionButton>
            )}
          </TargetControl>
        </TargetingControls>
      )}

      <MainGrid>
        <Card theme={theme}>
          <FormGroup>
            <Label>Popup title</Label>
            <EditorWrapper theme={theme}>
              <Editor
                value={title}
                init={editorInit(120)}
                licenseKey="gpl"
                onEditorChange={content => setTitle(content)}
              />
            </EditorWrapper>
          </FormGroup>

          <FormGroup>
            <Label>Popup message</Label>
            <EditorWrapper theme={theme}>
              <Editor
                value={message}
                init={editorInit(260)}
                licenseKey="gpl"
                onEditorChange={content => setMessage(content)}
              />
            </EditorWrapper>
          </FormGroup>

          <FormGroup>
            <Label>Footer text (optional, shown in popup footer)</Label>
            <EditorWrapper theme={theme}>
              <Editor
                value={footerText}
                init={editorInit(160)}
                licenseKey="gpl"
                onEditorChange={content => setFooterText(content)}
              />
            </EditorWrapper>
          </FormGroup>

          {/* Buttons moved to header */}
        </Card>

        <Card theme={theme}>
          <PreviewHeaderRow>
            <Label>Live modal preview</Label>
            <PreviewOptions>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="checkbox"
                  checked={hideDontShow}
                  onChange={e => setHideDontShow(e.target.checked)}
                />
                Hide "Don't show again" button
              </label>
            </PreviewOptions>
          </PreviewHeaderRow>
          <PreviewFlexArea>
            <PreviewContainer>
              <PreviewBox theme={theme}>
                <PreviewHeader>
                  <PreviewHeaderTitle
                    theme={theme}
                    className="ql-editor"
                    dangerouslySetInnerHTML={{ __html: title || 'Announcement title' }}
                  />
                </PreviewHeader>
                <PreviewBodyScrollable theme={theme}>
                  <div
                    className="ql-editor"
                    dangerouslySetInnerHTML={{
                      __html: message || 'This is how your announcement message will look.',
                    }}
                  />
                </PreviewBodyScrollable>
                {footerText && (
                  <PreviewFooter theme={theme}>
                    <PreviewFooterHighlight
                      theme={theme}
                      className="ql-editor"
                      dangerouslySetInnerHTML={{ __html: footerText }}
                    />
                  </PreviewFooter>
                )}
                <PreviewActions>
                  <PreviewActionButton $variant="primary" type="button" disabled>
                    Remind me later
                  </PreviewActionButton>
                  {!hideDontShow && (
                    <PreviewActionButton type="button" disabled>
                      Don't show again
                    </PreviewActionButton>
                  )}
                </PreviewActions>
              </PreviewBox>
            </PreviewContainer>
          </PreviewFlexArea>
        </Card>
      </MainGrid>

      <Card theme={theme}>
        <ListContainer>
          <ListHeader theme={theme}>
            <ListHeaderTitle theme={theme}>
              Existing announcements {loadingList ? '(loading...)' : `(${announcements.length})`}
            </ListHeaderTitle>
            <ListSearchInput
              theme={theme}
              type="search"
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </ListHeader>
          <ListScrollArea theme={theme}>
            {filteredAnnouncements.length === 0 && !loadingList && (
              <AnnouncementRow theme={theme}>
                <AnnouncementRowMeta theme={theme}>
                  {searchTerm.trim() ? 'No announcements match your search.' : 'No announcements created yet.'}
                </AnnouncementRowMeta>
              </AnnouncementRow>
            )}
            {filteredAnnouncements.map(a => (
              <AnnouncementRow key={a.id} theme={theme}>
                <AnnouncementRowHeader>
                  <AnnouncementRowTitle onClick={() => handleOpenPreview(a)}>
                    {getPlainText(a.title) || 'Untitled announcement'}
                  </AnnouncementRowTitle>
                  <AnnouncementRowActions>
                    <AnnouncementIconButton
                      theme={theme}
                      type="button"
                      title="View seen list"
                      onClick={() => handleOpenSeenBy(a)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </AnnouncementIconButton>
                    <SmallActionButton theme={theme} type="button" onClick={() => handleEdit(a)}>
                      Edit
                    </SmallActionButton>
                    <SmallActionButton theme={theme} type="button" onClick={() => handleDelete(a.id)}>
                      Delete
                    </SmallActionButton>
                  </AnnouncementRowActions>
                </AnnouncementRowHeader>
                <AnnouncementRowMeta theme={theme}>
                  {getAnnouncementAudienceLabel(a)}
                </AnnouncementRowMeta>
                <AnnouncementRowMeta theme={theme}>
                  {a.show_from && `From: ${a.show_from}`} {a.show_until && ` | Until: ${a.show_until}`}
                </AnnouncementRowMeta>
              </AnnouncementRow>
            ))}
          </ListScrollArea>
        </ListContainer>
      </Card>

      {showPreviewModal && typeof document !== 'undefined' && ReactDOM.createPortal(
        <PreviewOverlay onClick={() => setShowPreviewModal(false)}>
          <PreviewBox theme={theme} onClick={e => e.stopPropagation()}>
            <PreviewHeader>
              <PreviewHeaderTitle
                theme={theme}
                className="ql-editor"
                dangerouslySetInnerHTML={{ __html: previewData?.title || title || 'Announcement title' }}
              />
            </PreviewHeader>
            <PreviewBodyScrollable theme={theme}>
              <div
                className="ql-editor"
                dangerouslySetInnerHTML={{
                  __html: previewData?.message || message || 'This is how your announcement message will look.',
                }}
              />
            </PreviewBodyScrollable>
            {(previewData?.footer_text || footerText) && (
              <PreviewFooter theme={theme}>
                <PreviewFooterHighlight
                  theme={theme}
                  className="ql-editor"
                  dangerouslySetInnerHTML={{ __html: previewData?.footer_text || footerText }}
                />
              </PreviewFooter>
            )}
            <PreviewActions>
              <PreviewActionButton $variant="primary" type="button" disabled>
                Remind me later
              </PreviewActionButton>
              <PreviewActionButton type="button" disabled>
                Don't show again
              </PreviewActionButton>
            </PreviewActions>
          </PreviewBox>
        </PreviewOverlay>,
        document.body
      )}

      {seenByModalOpen && typeof document !== 'undefined' && ReactDOM.createPortal(
        <SeenByOverlay onClick={handleCloseSeenBy}>
          <SeenByBox theme={theme} onClick={e => e.stopPropagation()}>
            <SeenByHeader>
              <SeenByHeaderContent>
                <SeenByTitle>Seen by</SeenByTitle>
                {seenByAnnouncement?.title && (
                  <SeenByAnnouncementTitle
                    className="ql-editor"
                    dangerouslySetInnerHTML={{ __html: seenByAnnouncement.title }}
                  />
                )}
              </SeenByHeaderContent>
              <SeenByClose onClick={handleCloseSeenBy}>
                <CloseIcon fontSize="small" />
              </SeenByClose>
            </SeenByHeader>
            <SeenBySearchRow>
              <SeenBySearchInput
                type="search"
                placeholder="Search viewers…"
                value={seenBySearchTerm}
                onChange={e => setSeenBySearchTerm(e.target.value)}
              />
            </SeenBySearchRow>
            <SeenByList>
              {seenByLoading && <SeenByEmpty>Loading…</SeenByEmpty>}
              {!seenByLoading && seenByError && <SeenByEmpty>{seenByError}</SeenByEmpty>}
              {!seenByLoading && !seenByError && filteredSeenByEntries.length === 0 && (
                <SeenByEmpty>
                  {seenByEntries.length === 0 ? 'No viewers yet.' : 'No viewers match your search.'}
                </SeenByEmpty>
              )}
              {!seenByLoading && !seenByError && filteredSeenByEntries.map(entry => (
                <SeenByItem key={`${entry.announcement_id}-${entry.viewer_identifier}`}>
                  <SeenByPrimaryRow>
                    <SeenById>{getSeenByPrimaryLabel(entry)}</SeenById>
                    {getSeenByNameValue(entry) && (
                      <>
                        <SeenBySeparator>-</SeenBySeparator>
                        <SeenByName>{getSeenByNameValue(entry)}</SeenByName>
                      </>
                    )}
                    {getSeenByDetailLine(entry) && (
                      <>
                        <SeenBySeparator>·</SeenBySeparator>
                        <SeenByDetails>{getSeenByDetailLine(entry)}</SeenByDetails>
                      </>
                    )}
                  </SeenByPrimaryRow>
                  <SeenByMeta>
                    <span>{entry.viewer_role || entry.viewer_type}</span>
                    {entry.seen_at && <span>{new Date(entry.seen_at).toLocaleString()}</span>}
                  </SeenByMeta>
                </SeenByItem>
              ))}
            </SeenByList>
          </SeenByBox>
        </SeenByOverlay>,
        document.body
      )}
    </Container>
  );
};

export default UserAnnouncements;
