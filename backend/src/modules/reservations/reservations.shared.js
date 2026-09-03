// Bits shared between the public and admin reservation controllers.
const CAR_INCLUDE = { car: { include: { images: { orderBy: { createdAt: "asc" } } } } };
const ALLOWED_SORT_FIELDS = ["id", "pickUpTime", "dropOffTime", "status"];
const isAdmin = (user) => user.roles?.includes("Administrator");

module.exports = { CAR_INCLUDE, ALLOWED_SORT_FIELDS, isAdmin };
