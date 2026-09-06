// Ledger category / method vocabularies, shared by the cari page (filter
// dropdown) and the add/edit EntryModal. Labels resolve via
// t(`finance.categories.*`) / t(`finance.methods.*`).
export const DEBIT_CATEGORIES = ["TRAFFIC_FINE", "DAMAGE", "FUEL", "MANUAL_DEBIT"];
export const CREDIT_CATEGORIES = ["PAYMENT", "REFUND", "DISCOUNT", "MANUAL_CREDIT"];
export const PAYMENT_METHODS = ["Cash", "CreditCard", "Transfer", "Other"];
export const FILTER_CATEGORIES = ["RENTAL", ...DEBIT_CATEGORIES, ...CREDIT_CATEGORIES];
