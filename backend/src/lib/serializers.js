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

module.exports = { serializeUser, serializeVehicle, serializeReservation };
