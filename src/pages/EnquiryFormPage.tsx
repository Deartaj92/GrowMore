import React from 'react';
import { useParams } from 'react-router-dom';
import EnquiryForm from '../components/EnquiryForm';

const EnquiryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const enquiryId = id ? parseInt(id) : undefined;

  return <EnquiryForm enquiryId={enquiryId} />;
};

export default EnquiryFormPage;
