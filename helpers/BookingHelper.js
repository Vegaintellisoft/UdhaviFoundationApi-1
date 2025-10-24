class BookingHelper {
    static calculateAdvanceAmount(totalAmount) {
        const percentage = totalAmount * 0.25;
        return Math.max(percentage, 500);
    }
}

module.exports = BookingHelper;
