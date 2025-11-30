import React from 'react';
import ReactDOM from 'react-dom';
import { Delete } from '@mui/icons-material';
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalIcon,
  ModalTitle,
  ModalMessage,
  StudentInfoCard,
  StudentName,
  StudentDetails,
  DetailRow,
  DetailLabel,
  DetailValue,
  ModalActions,
  ModalButton
} from '../../styles';
import { FineToDelete } from '../../types';

interface DeleteModalProps {
  show: boolean;
  fineToDelete: FineToDelete | null;
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  show,
  fineToDelete,
  onCancel,
  onDelete
}) => {
  if (!show || !fineToDelete) return null;

  return ReactDOM.createPortal(
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalIcon color="#ef4444">
            <Delete />
          </ModalIcon>
          <ModalTitle>Delete Fine Payment</ModalTitle>
        </ModalHeader>
        <ModalMessage>
          Are you sure you want to delete this fine payment? This action cannot be undone.
        </ModalMessage>

        <StudentInfoCard>
          <StudentName>{fineToDelete.studentName}</StudentName>
          <StudentDetails>
            <DetailRow>
              <DetailLabel>Student ID:</DetailLabel>
              <DetailValue>{fineToDelete.studentId}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Class:</DetailLabel>
              <DetailValue>{fineToDelete.className}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Amount:</DetailLabel>
              <DetailValue highlight>Rs {fineToDelete.amount.toLocaleString()}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Date:</DetailLabel>
              <DetailValue>{fineToDelete.date}</DetailValue>
            </DetailRow>
          </StudentDetails>
        </StudentInfoCard>

        <ModalActions>
          <ModalButton variant="cancel" onClick={onCancel}>
            Cancel
          </ModalButton>
          <ModalButton variant="delete" onClick={onDelete}>
            Delete
          </ModalButton>
        </ModalActions>
      </ModalContent>
    </ModalOverlay>,
    document.body
  );
};

export default DeleteModal;

