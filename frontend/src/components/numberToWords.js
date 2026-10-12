export function convertNumberToWords(amount) {
  const words = {
    0: '', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
    10: 'Ten', 11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen', 16: 'Sixteen',
    17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty', 30: 'Thirty', 40: 'Forty', 50: 'Fifty',
    60: 'Sixty', 70: 'Seventy', 80: 'Eighty', 90: 'Ninety'
  };

  // Agar amount 0 hai toh seedhe return karein
  if (!amount || parseFloat(amount) === 0) return 'Zero Rupees Only.';

  let num = Math.floor(parseFloat(amount));
  let wordsStr = '';

  // Crore check
  if (Math.floor(num / 10000000) > 0) {
    wordsStr += convertLessThanHundred(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  // Lakh check
  if (Math.floor(num / 100000) > 0) {
    wordsStr += convertLessThanHundred(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  // Thousand check
  if (Math.floor(num / 1000) > 0) {
    wordsStr += convertLessThanHundred(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  // Hundred check
  if (Math.floor(num / 100) > 0) {
    wordsStr += convertLessThanHundred(Math.floor(num / 100)) + ' Hundred ';
    num %= 100;
  }
  // Bacha hua check (Less than 100)
  if (num > 0) {
    wordsStr += convertLessThanHundred(num);
  }

  return wordsStr.trim() + ' Rupees Only.';

  function convertLessThanHundred(n) {
    if (n < 20) return words[n];
    let res = words[Math.floor(n / 10) * 10];
    if (n % 10 > 0) res += ' ' + words[n % 10];
    return res;
  }
}