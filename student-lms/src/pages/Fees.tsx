import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import { CheckCircle, AlertCircle, FileText, Printer, X, Receipt } from 'lucide-react';
import { StatBlock } from '../components/StatBlock';
import { PageLoader, GrowMoreLoader } from '../components/GrowMoreLoader';
import './Fees.css';

export const Fees: React.FC = () => {
  const { student } = useAuth();
  const { getFeeData, getChallanDetails, loading } = useStudentData();
  const [challans, setChallans] = useState<any[]>([]);
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [challanItems, setChallanItems] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (student) {
      getFeeData(student.id, student.school_id)
        .then((data: any) => {
          if (data) setChallans(data);
        });
    }
  }, [student, getFeeData]);

  const handleViewChallan = async (challan: any) => {
    setSelectedChallan(challan);
    setLoadingDetails(true);
    setChallanItems([]);
    
    try {
      const items = await getChallanDetails(challan.id, student!.school_id);
      setChallanItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculations for stats
  const totalAmount = challans.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const unpaidChallans = challans.filter(c => c.status === 'unpaid');
  const totalUnpaid = unpaidChallans.reduce((sum, c) => sum + (c.total_amount || 0), 0);
  const paidChallans = challans.filter(c => c.status === 'paid');
  const totalPaid = paidChallans.reduce((sum, c) => sum + (c.total_amount || 0), 0);

  const getMonthName = (monthVal: string | number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (typeof monthVal === 'number' || !isNaN(Number(monthVal))) {
      return months[Number(monthVal) - 1] || 'Special';
    }
    return monthVal;
  };

  if (loading && challans.length === 0) {
    return (
      <PageLoader message="Loading fee records…" />
    );
  }

  return (
    <div className="fees-page">
      {/* Fees Stats Summary Grid */}
      <div className="stat-blocks">
        <StatBlock
          variant="green"
          icon={CheckCircle}
          value={`Rs. ${totalPaid.toLocaleString()}`}
          label="Paid"
          hint={`${paidChallans.length} invoice${paidChallans.length === 1 ? '' : 's'}`}
          valueClassName="stat-block-value--sm"
        />
        <StatBlock
          variant="red"
          icon={AlertCircle}
          value={`Rs. ${totalUnpaid.toLocaleString()}`}
          label="Outstanding"
          hint={`${unpaidChallans.length} pending`}
          valueClassName="stat-block-value--sm"
        />
        <StatBlock
          variant="blue"
          icon={Receipt}
          value={`Rs. ${totalAmount.toLocaleString()}`}
          label="Invoiced"
          hint={`${challans.length} challan${challans.length === 1 ? '' : 's'}`}
          valueClassName="stat-block-value--sm"
        />
      </div>

      {/* Challans Ledger List */}
      <div className="fees-ledger-card glass-panel">
        <div className="ledger-header">
          <h3>Fee Invoices & Challans Ledger</h3>
        </div>
        
        <div className="ledger-table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Challan No.</th>
                <th>Fee Month / Year</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {challans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-ledger-row">
                    <AlertCircle size={32} className="text-muted" />
                    <p>No fee challans registered in your account.</p>
                  </td>
                </tr>
              ) : (
                challans.map((c) => (
                  <tr key={c.id}>
                    <td><strong>#{c.id}</strong></td>
                    <td>{getMonthName(c.month)} {c.year}</td>
                    <td>{new Date(c.challan_date).toLocaleDateString()}</td>
                    <td>{c.due_date ? new Date(c.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td><strong>Rs. {(c.total_amount || 0).toLocaleString()}</strong></td>
                    <td>
                      <span className={`status-pill ${c.status.toLowerCase()}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary view-invoice-btn" onClick={() => handleViewChallan(c)}>
                        <FileText size={16} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal Overlay */}
      {selectedChallan && (
        <div className="invoice-modal-overlay" onClick={() => setSelectedChallan(null)}>
          <div className="invoice-modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-modal-header">
              <h3>Challan Invoice Details</h3>
              <div className="modal-actions">
                <button className="btn btn-primary print-btn" onClick={handlePrint}>
                  <Printer size={16} />
                  <span>Print / PDF</span>
                </button>
                <button className="close-btn" onClick={() => setSelectedChallan(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="invoice-print-container" id="invoice-print-area">
              {/* Printed Invoice Header */}
              <div className="invoice-print-header">
                <div className="school-branding">
                  <h2>GrowMore School LMS</h2>
                  <p>Main Campus, Student Fee Account Challan</p>
                </div>
                <div className="invoice-no-date">
                  <div><strong>Challan No:</strong> #{selectedChallan.id}</div>
                  <div><strong>Status:</strong> <span className={`invoice-status-text ${selectedChallan.status}`}>{selectedChallan.status.toUpperCase()}</span></div>
                </div>
              </div>

              <div className="invoice-bill-to">
                <div className="bill-col">
                  <strong>STUDENT DETAILS:</strong>
                  <div>Name: {student?.name}</div>
                  <div>Roll Number: {student?.roll_number || 'N/A'}</div>
                  <div>Class: {student?.class_name || 'N/A'} - {student?.section_name || 'N/A'}</div>
                  <div>Father's Name: {student?.father_name || 'N/A'}</div>
                </div>
                <div className="bill-col text-right">
                  <strong>CHALLAN DETAILS:</strong>
                  <div>Billing Month: {getMonthName(selectedChallan.month)} {selectedChallan.year}</div>
                  <div>Issue Date: {new Date(selectedChallan.challan_date).toLocaleDateString()}</div>
                  <div>Due Date: {selectedChallan.due_date ? new Date(selectedChallan.due_date).toLocaleDateString() : 'N/A'}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Fee Category / Item</th>
                    <th className="text-right">Base Amount</th>
                    <th className="text-right">Discount</th>
                    <th className="text-right">Fines</th>
                    <th className="text-right">Net Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDetails ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        <GrowMoreLoader size="small" centered={false} message="Loading breakdown…" />
                      </td>
                    </tr>
                  ) : challanItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">No item breakdowns found.</td>
                    </tr>
                  ) : (
                    challanItems.map((item) => {
                      const net = (item.amount || 0) - (item.discount || 0) + (item.fine || 0);
                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.fee_heads?.name || 'General Tuition'}</strong>
                            {item.remarks && <p className="item-remarks">{item.remarks}</p>}
                          </td>
                          <td className="text-right">Rs. {(item.amount || 0).toLocaleString()}</td>
                          <td className="text-right text-red">-Rs. {(item.discount || 0).toLocaleString()}</td>
                          <td className="text-right text-amber">+Rs. {(item.fine || 0).toLocaleString()}</td>
                          <td className="text-right"><strong>Rs. {net.toLocaleString()}</strong></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="text-right"><strong>Grand Total Amount:</strong></td>
                    <td className="text-right"><strong>Rs. {(selectedChallan.total_amount || 0).toLocaleString()}</strong></td>
                  </tr>
                </tfoot>
              </table>

              <div className="invoice-terms">
                <p><strong>Note:</strong> Fines may apply if payments are cleared post the due date.</p>
                <p>This is a computer-generated fee slip and does not require a physical signature.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
