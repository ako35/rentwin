const MIN_COMPLETED_RENTALS = 3;
const LATE_RETURN_GRACE_MS = 60 * 60 * 1000;

const summarizeCustomerReturns = (contracts) => {
  const completed = contracts.filter(
    (contract) => contract.status === "DONE" && contract.returnedAt
  );
  const lateReturns = completed.filter((contract) => {
    const returnedAt = new Date(contract.returnedAt).getTime();
    const dueAt = new Date(contract.dropOffTime).getTime();
    return returnedAt - dueAt > LATE_RETURN_GRACE_MS;
  }).length;
  const onTimeReturns = completed.length - lateReturns;

  return {
    score:
      completed.length >= MIN_COMPLETED_RENTALS
        ? Math.round((onTimeReturns / completed.length) * 100)
        : null,
    completedRentals: completed.length,
    onTimeReturns,
    lateReturns,
    minimumCompletedRentals: MIN_COMPLETED_RENTALS,
    lateReturnGraceHours: 1,
  };
};

module.exports = { summarizeCustomerReturns };
