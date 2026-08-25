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

const serializeReservation = (reservation) => {
  const { car, ...rest } = reservation;
  return { ...rest, car: car ? serializeVehicle(car) : undefined };
};

// Lightweight row shape for the admin dashboard's returns/departures tables
// — only what the table needs, no image relation required on the query.
const serializeScheduleRow = (reservation) => ({
  id: reservation.id,
  pickUpTime: reservation.pickUpTime,
  dropOffTime: reservation.dropOffTime,
  pickUpLocation: reservation.pickUpLocation,
  dropOffLocation: reservation.dropOffLocation,
  status: reservation.status,
  car: reservation.car
    ? { model: reservation.car.model, brand: reservation.car.brand, licensePlate: reservation.car.licensePlate }
    : undefined,
  user: reservation.user
    ? { firstName: reservation.user.firstName, lastName: reservation.user.lastName, email: reservation.user.email }
    : undefined,
});

module.exports = { serializeUser, serializeVehicle, serializeReservation, serializeScheduleRow };
