const serializeUser = (user) => {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};

// Vehicle must expose `image` as an array of image ids (frontend reads
// response.image[0], values.image.length, etc). Requires `images` relation
// to have been included, ordered by createdAt asc (primary image first).
const serializeVehicle = (vehicle) => {
  const { images, ...rest } = vehicle;
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

module.exports = { serializeUser, serializeVehicle, serializeContract, serializeReservation, serializeScheduleRow };
