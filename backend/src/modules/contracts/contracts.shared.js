// Bits shared between the contract controllers.
const CAR_INCLUDE = { car: { include: { images: { orderBy: { createdAt: "asc" } } } } };
const ALLOWED_SORT_FIELDS = ["id", "pickUpTime", "dropOffTime", "status"];

module.exports = { CAR_INCLUDE, ALLOWED_SORT_FIELDS };
