// Phone Number Formatting Utility for Pakistan (+92)
// This can be used to test phone number formatting

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Handle different phone number formats for Pakistan
  if (cleanPhone.length === 10) {
    // 10 digits: assume Pakistan (+92)
    return `92${cleanPhone}`;
  } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    // 11 digits starting with 0: remove leading 0 and add Pakistan country code
    return `92${cleanPhone.substring(1)}`;
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('92')) {
    // Already has Pakistan country code
    return cleanPhone;
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('092')) {
    // 13 digits starting with 092: remove leading 0
    return cleanPhone.substring(1);
  } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
    // 12 digits starting with 91: change to Pakistan country code
    return `92${cleanPhone.substring(2)}`;
  } else if (cleanPhone.length === 13 && cleanPhone.startsWith('091')) {
    // 13 digits starting with 091: change to Pakistan country code
    return `92${cleanPhone.substring(3)}`;
  } else {
    // For other formats, try to add +92 if it looks like a Pakistani number
    if (cleanPhone.length >= 10 && cleanPhone.length <= 12) {
      return `92${cleanPhone}`;
    }
    // Return as is for international numbers
    return cleanPhone;
  }
};

// Test cases for Pakistan phone numbers
console.log('Pakistan Phone Number Formatting Tests:');
console.log('03139794635 →', formatPhoneNumber('03139794635')); // Should output: 923139794635
console.log('3139794635 →', formatPhoneNumber('3139794635'));   // Should output: 923139794635
console.log('923139794635 →', formatPhoneNumber('923139794635')); // Should output: 923139794635
console.log('0923139794635 →', formatPhoneNumber('0923139794635')); // Should output: 923139794635
console.log('+92-313-979-4635 →', formatPhoneNumber('+92-313-979-4635')); // Should output: 923139794635
console.log('913139794635 →', formatPhoneNumber('913139794635')); // Should output: 923139794635 (converts from India to Pakistan)
