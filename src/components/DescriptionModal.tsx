import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/useToast';
import { AddCircle, Edit, DeleteOutline, Close, Check } from '@mui/icons-material';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Reuse existing modal overlay and dialog styles (copy from SpecialFines for consistency)
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
`;

const ModalDialog = styled.div`
  width: min(540px, 100%);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 1.6rem 1.4rem 1.2rem 1.4rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
`;

const CloseButton = styled(Close)`
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  cursor: pointer;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  transition: color 0.12s;
  &:hover {
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const ModalTitle = styled.h3`
  margin: 0 0 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 1.25rem;
  font-weight: 600;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const DescriptionForm = styled.form`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const DescriptionListContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 8px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 6px;
  transition: background 0.12s ease-in-out, color 0.12s;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  &:hover {
    background: ${({ theme }) => theme.HOVER_BG};
    color: ${({ theme }) => theme.TEXT_PRIMARY};
  }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0, 123, 255, 0.85);
  color: #fff;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s ease-in-out;
  &:hover { background: rgba(0, 123, 255, 1); }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 1rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  z-index: 10;
`;

const Spinner = styled.div`
  border: 3px solid ${({ theme }) => theme.BORDER};
  border-top: 3px solid rgba(0, 123, 255, 0.9);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 0.8s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

interface DescriptionModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({ open, onClose, onRefresh }) => {
  const [descriptions, setDescriptions] = useState<Array<{ id: number; name: string }>>([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const fetch = async () => {
    const { data, error } = await supabase
      .from('specialfines_descriptions')
      .select('id, name')
      .eq('school_id', user?.school_id)
      .order('name', { ascending: true });
    if (error) {
      console.error('Failed to fetch descriptions', error);
      toast.showToast('Failed to load descriptions', 'error');
    } else {
      setDescriptions(data as any);
    }
  };

  useEffect(() => {
    if (open) fetch();
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const create = async () => {
    if (!newName.trim()) return;
    setIsProcessing(true);
    const { error } = await supabase.from('specialfines_descriptions').insert([{ name: newName.trim(), school_id: user?.school_id }]);
    setIsProcessing(false);
    if (error) {
      console.error('Create error', error);
      toast.showToast('Failed to add description', 'error');
    } else {
      toast.showToast('Description added');
      setNewName('');
      await fetch();
      onRefresh();
    }
  };

  const startEdit = (d: { id: number; name: string }) => {
    setEditId(d.id);
    setEditName(d.name);
  };

  const saveEdit = async () => {
    if (editId === null) return;
    setIsProcessing(true);
    const { error } = await supabase
      .from('specialfines_descriptions')
      .update({ name: editName.trim() })
      .eq('id', editId);
    setIsProcessing(false);
    if (error) {
      console.error('Edit error', error);
      toast.showToast('Failed to edit description', 'error');
    } else {
      toast.showToast('Description updated');
      setEditId(null);
      setEditName('');
      await fetch();
      onRefresh();
    }
  };

  const remove = async (id: number) => {
    setIsProcessing(true);
    const { error } = await supabase.from('specialfines_descriptions').delete().eq('id', id);
    setIsProcessing(false);
    if (error) {
      console.error('Delete error', error);
      toast.showToast('Failed to delete description', 'error');
    } else {
      toast.showToast('Description deleted');
      await fetch();
      onRefresh();
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay>
      <ModalDialog role="dialog" aria-labelledby="description-modal-title">
        <Header>
          <ModalTitle id="description-modal-title">Manage Descriptions</ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close modal" />
        </Header>

        {isProcessing && (
          <LoadingOverlay>
            <Spinner />
          </LoadingOverlay>
        )}

        <DescriptionForm onSubmit={e => { e.preventDefault(); create(); }}>
          <Input
            ref={inputRef}
            placeholder="New description"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            disabled={isProcessing}
          />
          <PrimaryButton type="submit" title="Add description" disabled={isProcessing}>
            <AddCircle />
          </PrimaryButton>
        </DescriptionForm>

        <DescriptionListContainer>
          {descriptions.map(d => (
            <ModalRow key={d.id}>
              {editId === d.id ? (
                <>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                  <PrimaryButton onClick={saveEdit} title="Save" disabled={isProcessing}>
                    <Check />
                  </PrimaryButton>
                  <ActionButton onClick={() => setEditId(null)} title="Cancel" disabled={isProcessing}>
                    ✖
                  </ActionButton>
                </>
              ) : (
                <>
                  <span style={{ flexGrow: 1 }}>{d.name}</span>
                  <ActionButton onClick={() => startEdit(d)} title="Edit">
                    <Edit />
                  </ActionButton>
                  <ActionButton onClick={() => remove(d.id)} title="Delete">
                    <DeleteOutline />
                  </ActionButton>
                </>
              )}
            </ModalRow>
          ))}
        </DescriptionListContainer>

        <PrimaryButton onClick={onClose} title="Close modal" style={{ marginTop: '1rem' }} disabled={isProcessing}>
          Close
        </PrimaryButton>
      </ModalDialog>
    </ModalOverlay>
  );
};

export default DescriptionModal;
