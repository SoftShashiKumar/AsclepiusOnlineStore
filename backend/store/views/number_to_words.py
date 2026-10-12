# number_to_words.py

def convert_number_to_words(amount):
    """Indian numbering system me amount ko words me convert karta hai."""
    words = {
        0: '', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
        10: 'Ten', 11: 'Eleven', 12: 'Twelve', 13: 'Thirteen', 14: 'Fourteen', 15: 'Fifteen', 16: 'Sixteen',
        17: 'Seventeen', 18: 'Eighteen', 19: 'Nineteen', 20: 'Twenty', 30: 'Thirty', 40: 'Forty', 50: 'Fifty',
        60: 'Sixty', 70: 'Seventy', 80: 'Eighty', 90: 'Ninety'
    }

    try:
        num = int(float(amount or 0))
    except (ValueError, TypeError):
        return 'Zero Rupees Only.'

    if num == 0:
        return 'Zero Rupees Only.'

    def convert_less_than_hundred(n):
        if n < 20:
            return words[n]
        res = words[(n // 10) * 10]
        if n % 10 > 0:
            res += ' ' + words[n % 10]
        return res

    words_str = ''

    if (num // 10000000) > 0:
        words_str += convert_less_than_hundred(num // 10000000) + ' Crore '
        num %= 10000000

    if (num // 100000) > 0:
        words_str += convert_less_than_hundred(num // 100000) + ' Lakh '
        num %= 100000

    if (num // 1000) > 0:
        words_str += convert_less_than_hundred(num // 1000) + ' Thousand '
        num %= 1000

    if (num // 100) > 0:
        words_str += convert_less_than_hundred(num // 100) + ' Hundred '
        num %= 100

    if num > 0:
        words_str += convert_less_than_hundred(num)

    return words_str.strip() + ' Rupees Only.'