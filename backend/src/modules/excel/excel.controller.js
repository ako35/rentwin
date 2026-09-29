const prisma = require("../../lib/prisma");
const { sendWorkbook } = require("./excel-builders");
const asyncHandler = require("../../middleware/async-handler");
const { getRentedVehicleIds, getVehicleStatus } = require("../vehicles/vehicles.shared");

const TRANSMISSION_LABELS = { Manual: "Manuel", SemiAutomatic: "Yarı Otomatik", Automatic: "Otomatik" };
const FUEL_LABELS = {
  Diesel: "Dizel",
  Gasoline: "Benzin",
  Hybrid: "Hibrit",
  Electricity: "Elektrik",
  LPG: "LPG",
  CNG: "CNG",
  Hydrogen: "Hidrojen",
};
const STATUS_LABELS = { AVAILABLE: "Müsait", RENTED: "Kirada", OUT_OF_SERVICE: "Servis Dışı", SOLD: "Satıldı" };

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

// Mirrors the admin Araçlar list as closely as an xlsx can: same columns, same
// order, same Turkish labels for the enum/status fields — so the exported
// report reads like the on-screen table rather than the raw DB values.
const downloadCars = asyncHandler(async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ include: { branch: true } });
  const rentedIds = await getRentedVehicleIds(vehicles.map((v) => v.id));
  await sendWorkbook(
    res,
    "cars.xlsx",
    [
      { header: "Plaka", key: "licensePlate", width: 14 },
      { header: "Marka", key: "brand", width: 16 },
      { header: "Model", key: "model", width: 22 },
      { header: "Şube", key: "branch", width: 18 },
      { header: "Vites", key: "transmission", width: 16 },
      { header: "Yakıt", key: "fuelType", width: 12 },
      { header: "Durum", key: "status", width: 14 },
      { header: "Satış Tarihi", key: "saleDate", width: 14 },
    ],
    vehicles.map((vehicle) => ({
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
      branch: vehicle.branch?.name || "-",
      transmission: TRANSMISSION_LABELS[vehicle.transmission] || vehicle.transmission,
      fuelType: FUEL_LABELS[vehicle.fuelType] || vehicle.fuelType,
      status: STATUS_LABELS[getVehicleStatus(vehicle, rentedIds)],
      saleDate: vehicle.soldAt ? vehicle.soldAt.toLocaleDateString("tr-TR") : "-",
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
