const prisma = require("../../lib/prisma");
const { sendWorkbook } = require("./excel-builders");
const asyncHandler = require("../../middleware/async-handler");

const downloadUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  await sendWorkbook(
    res,
    "users.xlsx",
    [
      { header: "ID", key: "id", width: 36 },
      { header: "First Name", key: "firstName", width: 18 },
      { header: "Last Name", key: "lastName", width: 18 },
      { header: "Email", key: "email", width: 28 },
      { header: "Phone Number", key: "phoneNumber", width: 18 },
      { header: "Address", key: "address", width: 28 },
      { header: "Zip Code", key: "zipCode", width: 12 },
      { header: "Roles", key: "roles", width: 24 },
      { header: "Built In", key: "builtIn", width: 10 },
    ],
    users.map((user) => ({ ...user, roles: user.roles.join(" — ") }))
  );
});

const downloadCars = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ include: { images: true } });
  await sendWorkbook(
    res,
    "cars.xlsx",
    [
      { header: "ID", key: "id", width: 36 },
      { header: "Model", key: "model", width: 22 },
      { header: "Doors", key: "doors", width: 8 },
      { header: "Seats", key: "seats", width: 8 },
      { header: "Luggage", key: "luggage", width: 8 },
      { header: "Transmission", key: "transmission", width: 14 },
      { header: "Air Conditioning", key: "airConditioning", width: 16 },
      { header: "Fuel Type", key: "fuelType", width: 12 },
      { header: "Age", key: "age", width: 8 },
      { header: "Price Per Hour", key: "pricePerHour", width: 14 },
      { header: "Image Count", key: "imageCount", width: 12 },
    ],
    vehicles.map((vehicle) => ({
      ...vehicle,
      airConditioning: vehicle.airConditioning ? "Yes" : "No",
      imageCount: vehicle.images.length,
    }))
  );
});

const downloadReservations = asyncHandler(async (req, res) => {
  const reservations = await prisma.reservation.findMany({
    include: { car: true, user: true },
  });
  await sendWorkbook(
    res,
    "reservations.xlsx",
    [
      { header: "ID", key: "id", width: 36 },
      { header: "Car Model", key: "carModel", width: 22 },
      { header: "Customer Email", key: "customerEmail", width: 28 },
      { header: "Pick Up Location", key: "pickUpLocation", width: 20 },
      { header: "Drop Off Location", key: "dropOffLocation", width: 20 },
      { header: "Pick Up Time", key: "pickUpTime", width: 20 },
      { header: "Drop Off Time", key: "dropOffTime", width: 20 },
      { header: "Status", key: "status", width: 12 },
      { header: "Total Price", key: "totalPrice", width: 12 },
    ],
    reservations.map((reservation) => ({
      id: reservation.id,
      carModel: reservation.car.model,
      customerEmail: reservation.user.email,
      pickUpLocation: reservation.pickUpLocation,
      dropOffLocation: reservation.dropOffLocation,
      pickUpTime: reservation.pickUpTime,
      dropOffTime: reservation.dropOffTime,
      status: reservation.status,
      totalPrice: reservation.totalPrice,
    }))
  );
});

module.exports = { downloadUsers, downloadCars, downloadReservations };
