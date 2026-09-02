/**
 * Validates Singapore Mobile Numbers
 * Rules: Must be exactly 8 digits and starting with 8, 9, or 7.
 * @param {string} phoneNumber 
 * @returns {boolean}
 */
export const validateSingaporePhone = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  // Strip away empty spaces or dashes if the user accidentally types them
  const cleanNumber = phoneNumber.trim().replace(/[\s-]/g, '');
  
  // Strict Regular Expression: Exactly 8 digits starting with 7, 8, or 9
  const sgPhoneRegex = /^[789]\d{7}$/;
  
  return sgPhoneRegex.test(cleanNumber);
};
