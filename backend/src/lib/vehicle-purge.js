const prisma = require("./prisma");

// Hard-delete a vehicle and every piece of rental paperwork tied to it:
// contracts (cascade takes their invoices, drivers, payments, extras, return
// charges, extensions, vehicle-changes and HGS checks), reservations, and the
// vehicle's own insurance / tax / maintenance / inspection rows (cascade).
// VehicleImage.vehicleId is SET NULL.
//
// The customer ledger is deliberately preserved. LedgerEntry.contractId is
// ON DELETE SET NULL, so every ledger row survives the contract being removed —
// no LedgerEntry is ever deleted here, so cari balances never change. Before
// the link is severed we copy the contract number onto the row
// (LedgerEntry.contractNo) so the current-account view still shows which rental
// each movement belongs to.
//
// Used by the manual "delete vehicle" action (any sold vehicle, even one with
// history) and by the scheduled 5-year purge. Safe on a vehicle with no
// history — there is simply nothing to cascade. Runs in one transaction and
// throws on failure.
const purgeVehicle = async (vehicleId) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, licensePlate: true, brand: true, model: true },
  });
  if (!vehicle) return { purged: false, reason: "not-found" };

  await prisma.$transaction(async (tx) => {
    const contracts = await tx.contract.findMany({
      where: { carId: vehicleId },
      select: { id: true, contractNo: true },
    });

    // Snapshot the contract number onto the ledger rows that are about to lose
    // their FK link, so the cari stays readable after the contract is gone.
    for (const c of contracts) {
      if (!c.contractNo) continue;
      await tx.ledgerEntry.updateMany({
        where: { contractId: c.id, contractNo: null },
        data: { contractNo: c.contractNo },
      });
    }

    await tx.contract.deleteMany({ where: { carId: vehicleId } });
    await tx.reservation.deleteMany({ where: { carId: vehicleId } });
    await tx.vehicle.delete({ where: { id: vehicleId } });
  });

  return { purged: true, vehicle };
};

module.exports = { purgeVehicle };
