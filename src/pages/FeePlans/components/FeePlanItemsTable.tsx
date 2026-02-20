import React, { useMemo } from 'react';
import styled from 'styled-components';
import { FeePlanItemFormData } from '../types';
import { FeeHead } from '../../../types/fee';
import { Delete as DeleteIcon } from '@mui/icons-material';

const DISCOUNT_TYPES = [
  'Siblings',
  'Merit',
  'Need-based',
  'Staff',
  'Early Payment',
  'Bulk Payment',
  'Other'
];

const TableContainer = styled.div`
  background: ${({ theme }) => theme.CARD};
  border: 1px solid ${({ theme }) => theme.BORDER};
  border-radius: 12px;
  padding: 20px;
  overflow-x: auto;
  overflow-y: visible;
  max-height: none;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
`;

const TableHeader = styled.thead`
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
`;

const HeaderRow = styled.tr`
  border-bottom: 2px solid ${({ theme }) => theme.BORDER};
`;

const HeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 700;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  white-space: nowrap;
`;

const TableBody = styled.tbody``;

const BodyRow = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.BORDER}40;
  transition: background 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
  }
  
  &:last-child {
    border-bottom: 2px solid ${({ theme }) => theme.BORDER};
    font-weight: 700;
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'};
  }
`;

const BodyCell = styled.td`
  padding: 12px 16px;
  vertical-align: middle;
`;

const Input = styled.input<{ $color?: string }>`
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme, $color }) => $color || theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
  text-align: right;
  font-weight: ${({ $color }) => $color ? '600' : 'normal'};
  
  /* Hide spinner controls for number inputs */
  &[type="number"] {
    -moz-appearance: textfield;
    
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
  
  &[readonly] {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
    cursor: not-allowed;
    color: ${({ theme, $color }) => $color || theme.TEXT_SECONDARY};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
  cursor: pointer;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
  
  &:disabled {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'};
    cursor: not-allowed;
    color: ${({ theme }) => theme.TEXT_SECONDARY};
    opacity: 0.8;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid ${({ theme }) => theme.FIELD_BORDER};
  border-radius: 6px;
  background: ${({ theme }) => theme.FIELD_BG};
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  outline: none;
  transition: all 0.2s;
  resize: none;
  height: 38px;
  font-family: inherit;
  line-height: 1.4;
  overflow-y: auto;
  
  &:focus {
    border-color: ${({ theme }) => theme.ACCENT};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.ACCENT}20;
  }
`;

const ReadOnlyText = styled.div<{ $color?: string }>`
  padding: 8px 10px;
  color: ${({ theme, $color }) => $color || theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  text-align: right;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-weight: ${({ $color }) => $color ? '600' : 'normal'};
`;

const ReadOnlyTextLeft = styled.div`
  padding: 8px 10px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  text-align: left;
  min-height: 38px;
  display: flex;
  align-items: center;
`;

const ReadOnlyTextArea = styled.div`
  padding: 8px 10px;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.9rem;
  text-align: left;
  min-height: 38px;
  height: 38px;
  overflow-y: auto;
  word-wrap: break-word;
  white-space: pre-wrap;
  display: flex;
  align-items: center;
`;

const FeeHeadName = styled.div`
  font-weight: 600;
  color: ${({ theme }) => theme.TEXT_PRIMARY};
  font-size: 0.95rem;
`;

const FeeHeadDescription = styled.div`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.TEXT_SECONDARY};
  margin-top: 2px;
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'};
  color: #ef4444;
  border: 1px solid ${({ theme }) => theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.BG === '#252525' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'};
    transform: scale(1.05);
  }
`;

const ActionCell = styled(BodyCell)`
  width: 60px;
  text-align: center;
`;

interface FeePlanItemsTableProps {
  feeHeads: FeeHead[];
  items: FeePlanItemFormData[];
  onChange: (index: number, updates: Partial<FeePlanItemFormData>) => void;
  onRemoveItem?: (index: number) => void;
}

export const FeePlanItemsTable: React.FC<FeePlanItemsTableProps> = ({
  feeHeads,
  items,
  onChange,
  onRemoveItem
}) => {
  const handleRemoveItem = (index: number) => {
    if (onRemoveItem) {
      onRemoveItem(index);
    } else {
      console.warn('onRemoveItem callback is not provided');
    }
  };
  const totals = useMemo(() => {
    return items.reduce((acc, item) => ({
      actualFee: acc.actualFee + (item.actualFee || 0),
      discountAmount: acc.discountAmount + (item.discountAmount || 0),
      feeAfterDiscount: acc.feeAfterDiscount + (item.feeAfterDiscount || 0),
    }), { actualFee: 0, discountAmount: 0, feeAfterDiscount: 0 });
  }, [items]);

  const handleItemChange = (index: number, field: keyof FeePlanItemFormData, value: number | string | undefined) => {
    const item = items[index];
    let updates: Partial<FeePlanItemFormData> = { [field]: value };

    // Auto-calculate discount percent and fee after discount
    if (field === 'actualFee' || field === 'discountAmount' || field === 'feeAfterDiscount') {
      let actualFee = item.actualFee;
      let discountAmount = item.discountAmount;
      let feeAfterDiscount = item.feeAfterDiscount;

      if (field === 'actualFee' && typeof value === 'number') {
        actualFee = value;
        feeAfterDiscount = actualFee - discountAmount;
      } else if (field === 'discountAmount' && typeof value === 'number') {
        discountAmount = value;
        feeAfterDiscount = actualFee - discountAmount;
      } else if (field === 'feeAfterDiscount' && typeof value === 'number') {
        feeAfterDiscount = value;
        discountAmount = actualFee - feeAfterDiscount;
      }

      const discountPercent = actualFee > 0 
        ? Math.round((discountAmount / actualFee) * 100 * 100) / 100 
        : (discountAmount > 0 ? -Infinity : 0);
      
      updates = {
        ...updates,
        discountAmount: Math.max(0, discountAmount),
        discountPercent,
        feeAfterDiscount: Math.max(0, feeAfterDiscount)
      };
    }

    onChange(index, updates);
  };

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <HeaderRow>
            <HeaderCell style={{ width: '20px' }}>#</HeaderCell>
            <HeaderCell style={{ width: '20%' }}>Fee Particulars</HeaderCell>
            <HeaderCell style={{ textAlign: 'right', width: '10%' }}>Actual Fee</HeaderCell>
            <HeaderCell style={{ textAlign: 'right', width: '10%' }}>Discount Amount</HeaderCell>
            <HeaderCell style={{ textAlign: 'right', width: '8%' }}>Discount %</HeaderCell>
            <HeaderCell style={{ width: '12%' }}>Discount Type</HeaderCell>
            <HeaderCell style={{ width: '20%' }}>Discount Reason</HeaderCell>
            <HeaderCell style={{ textAlign: 'right', width: '12%' }}>Fee After Discount</HeaderCell>
            {onRemoveItem && <HeaderCell style={{ width: '8%', textAlign: 'center' }}>Action</HeaderCell>}
          </HeaderRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const feeHead = feeHeads.find(fh => fh.id === item.feeHeadId);
            if (!feeHead) return null;

            return (
              <BodyRow key={item.feeHeadId}>
                <BodyCell>{index + 1}</BodyCell>
                <BodyCell>
                  <FeeHeadName>{feeHead.name}</FeeHeadName>
                  {feeHead.description && (
                    <FeeHeadDescription>{feeHead.description}</FeeHeadDescription>
                  )}
                </BodyCell>
                <BodyCell>
                  {onRemoveItem ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.actualFee || 0}
                      onChange={(e) => handleItemChange(index, 'actualFee', parseFloat(e.target.value) || 0)}
                      onWheel={(e) => {
                        e.currentTarget.blur();
                      }}
                    />
                  ) : (
                    <ReadOnlyText>{item.actualFee?.toFixed(2) || '0.00'}</ReadOnlyText>
                  )}
                </BodyCell>
                <BodyCell>
                  {onRemoveItem ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discountAmount || 0}
                      onChange={(e) => handleItemChange(index, 'discountAmount', parseFloat(e.target.value) || 0)}
                      onWheel={(e) => {
                        e.currentTarget.blur();
                      }}
                      $color="#22c55e"
                    />
                  ) : (
                    <ReadOnlyText $color="#22c55e">{item.discountAmount?.toFixed(2) || '0.00'}</ReadOnlyText>
                  )}
                </BodyCell>
                <BodyCell>
                  <ReadOnlyText $color="#22c55e">
                    {(() => {
                      const actualFee = item.actualFee || 0;
                      const discountAmount = item.discountAmount || 0;
                      if (actualFee === 0) {
                        return '0%';
                      }
                      const percent = (discountAmount / actualFee) * 100;
                      return `${percent.toFixed(2)}%`;
                    })()}
                  </ReadOnlyText>
                </BodyCell>
                <BodyCell>
                  {onRemoveItem ? (
                    <Select
                      value={item.discountType || ''}
                      onChange={(e) => handleItemChange(index, 'discountType', e.target.value || undefined)}
                    >
                      <option value="">Select discount type</option>
                      {DISCOUNT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </Select>
                  ) : (
                    <ReadOnlyTextLeft>{item.discountType ? item.discountType : '-'}</ReadOnlyTextLeft>
                  )}
                </BodyCell>
                <BodyCell>
                  {onRemoveItem ? (
                    <TextArea
                      value={item.discountReason || ''}
                      onChange={(e) => handleItemChange(index, 'discountReason', e.target.value || undefined)}
                      placeholder="Enter discount reason..."
                    />
                  ) : (
                    <ReadOnlyTextArea>{item.discountReason ? item.discountReason : '-'}</ReadOnlyTextArea>
                  )}
                </BodyCell>
                <BodyCell>
                  {onRemoveItem ? (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.feeAfterDiscount || 0}
                      onChange={(e) => handleItemChange(index, 'feeAfterDiscount', parseFloat(e.target.value) || 0)}
                      onWheel={(e) => {
                        e.currentTarget.blur();
                      }}
                    />
                  ) : (
                    <ReadOnlyText>{item.feeAfterDiscount?.toFixed(2) || '0.00'}</ReadOnlyText>
                  )}
                </BodyCell>
                {onRemoveItem && (
                  <ActionCell>
                    <DeleteButton
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleRemoveItem(index);
                      }}
                      title="Remove this fee head"
                      type="button"
                    >
                      <DeleteIcon style={{ fontSize: '18px' }} />
                    </DeleteButton>
                  </ActionCell>
                )}
              </BodyRow>
            );
          })}
          <BodyRow>
            <BodyCell colSpan={2} style={{ fontWeight: 700 }}>
              Total
            </BodyCell>
            <BodyCell>
              <Input
                type="text"
                value={totals.actualFee.toFixed(2)}
                readOnly
              />
            </BodyCell>
            <BodyCell>
              <Input
                type="text"
                value={totals.discountAmount.toFixed(2)}
                readOnly
                $color="#22c55e"
              />
            </BodyCell>
            <BodyCell>
              <Input
                type="text"
                value={totals.actualFee > 0 
                  ? `${((totals.discountAmount / totals.actualFee) * 100).toFixed(2)}%`
                  : '0%'}
                readOnly
                $color="#22c55e"
              />
            </BodyCell>
            <BodyCell colSpan={2}></BodyCell>
            <BodyCell>
              <Input
                type="text"
                value={totals.feeAfterDiscount.toFixed(2)}
                readOnly
                $color="#eab308"
              />
            </BodyCell>
            {onRemoveItem && <BodyCell></BodyCell>}
          </BodyRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

