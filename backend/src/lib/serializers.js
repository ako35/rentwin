const serializeUser = (user) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// Make+model key for VehicleModelImage lookups — normalized the same way the
// model-image API stores brand/model (trim + TR-uppercase). Year is irrelevant.
const modelImageKey = (brand, model) =>
  `${(brand || "").trim().toLocaleUpperCase("tr")} ${(model || "").trim().toLocaleUpperCase("tr")}`;

// Vehicle must expose `image` as an array of image ids (frontend reads
// response.image[0], values.image.length, etc). Resolution order:
//   1. the make+model's VehicleModelImage (when `modelImageMap` is supplied)
//   2. the vehicle's own VehicleImage rows (legacy per-vehicle fallback)
// `modelImageMap` is Map(modelImageKey -> VehicleModelImage); omit it to keep
// the legacy behaviour (used where a car image is never rendered).
const serializeVehicle = (vehicle, modelImageMap) => {
  const { images, ...rest } = vehicle;
  const modelImage = modelImageMap?.get(modelImageKey(vehicle.brand, vehicle.model));
  if (modelImage) return { ...rest, image: [modelImage.id] };
  return { ...rest, image: (images || []).map((image) => image.id) };
};

const serializeContract = (contract) => {
  const { car, ...rest } = contract;
  return { ...rest, car: car ? serializeVehicle(car) : undefined };
};

const serializeReservation = (reservation) => {
  const { car, ...rest } = reservation;
  return { ...rest, car: car ? serializeVehicle(car) : undefined };
};

// Lightweight row shape for the admin dashboard's returns/departures tables
// — only what the table needs, no image relation required on the query.
const serializeScheduleRow = (contract) => ({
  id: contract.id,
  contractNo: contract.contractNo || null,
  pickUpTime: contract.pickUpTime,
  dropOffTime: contract.dropOffTime,
  pickUpLocation: contract.pickUpLocation,
  dropOffLocation: contract.dropOffLocation,
  status: contract.status,
  car: contract.car
    ? {
        model: contract.car.model,
        brand: contract.car.brand,
        licensePlate: contract.car.licensePlate,
        branchCode: contract.car.branch?.code || null,
      }
    : undefined,
  user: contract.user
    ? {
        firstName: contract.user.firstName,
        lastName: contract.user.lastName,
        companyTitle: contract.user.companyTitle || null,
        email: contract.user.email,
      }
    : undefined,
});

// Admin dashboard "HGS check pending" bar: same lightweight shape plus the two
// fields that panel needs — when the contract was closed and its derived check
// status.
const serializeHgsPendingRow = (contract) => ({
  ...serializeScheduleRow(contract),
  returnedAt: contract.returnedAt || null,
  hgsStatus: contract.hgsStatus || null,
});

module.exports = {
  serializeUser,
  serializeVehicle,
  modelImageKey,
  serializeContract,
  serializeReservation,
  serializeScheduleRow,
  serializeHgsPendingRow,
};
