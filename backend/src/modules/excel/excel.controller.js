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
      { header: "Brand", key: "brand", width: 16 },
      { header: "Model", key: "model", width: 22 },
      { header: "License Plate", key: "licensePlate", width: 14 },
      { header: "Transmission", key: "transmission", width: 14 },
      { header: "Fuel Type", key: "fuelType", width: 12 },
      { header: "Out Of Service", key: "outOfService", width: 14 },
      { header: "Image Count", key: "imageCount", width: 12 },
    ],
    vehicles.map((vehicle) => ({
      ...vehicle,
      outOfService: vehicle.outOfService ? "Yes" : "No",
      imageCount: vehicle.images.length,
    }))
  );
});

const downloadContracts = asyncHandler(async (req, res) => {
  const contracts = await prisma.contract.findMany({
    include: { car: true, user: true },
  });
  await sendWorkbook(
    res,
    "contracts.xlsx",
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
    contracts.map((contract) => ({
      id: contract.id,
      carModel: contract.car.model,
      customerEmail: contract.user.email,
      pickUpLocation: contract.pickUpLocation,
      dropOffLocation: contract.dropOffLocation,
      pickUpTime: contract.pickUpTime,
      dropOffTime: contract.dropOffTime,
      status: contract.status,
      totalPrice: contract.totalPrice,
    }))
  );
});

module.exports = { downloadUsers, downloadCars, downloadContracts };
