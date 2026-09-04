export function validateTransaction(data) {

    const errors = {};

    if (!data.amount || Number(data.amount) <= 0) {

        errors.amount =
            "Please enter an amount greater than zero.";

    }

    if (!data.category) {

        errors.category =
            "Please select a category.";

    }

    if (!data.date) {

        errors.date =
            "Please select a date.";

    }

    if (!data.type) {

        errors.type =
            "Please select a transaction type.";

    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };

}