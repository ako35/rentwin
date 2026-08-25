const API_URL = import.meta.env.VITE_APP_API_URL;

export const adminUserColumns = [
    {
        name: "First Name",
        selector: (row) => row?.firstName,
    },
    {
        name: "Last Name",
        selector: (row) => row?.lastName,
    },
    {
        name: "Email",
        selector: (row) => row?.email,
    },
    {
        name: "Roles",
        selector: (row) => row?.roles?.join(" — "),
    },
];

export const adminReservationsColumns = [
    {
        name: "Vehicle",
        selector: (row) => row?.car?.model,
    },
    {
        name: "Pickup",
        selector: (row) => row?.pickUpLocation,
    },
    {
        name: "Dropoff",
        selector: (row) => row?.dropOffLocation,
    },
    {
        name: "Price",
        selector: (row) => `$ ${row?.totalPrice}`,
    },
];

export const adminContactMessagesColumns = [
    {
        name: "Sender Name",
        selector: (row) => row?.name,
        sortable: true,
    },
    {
        name: "Sender Email",
        selector: (row) => row?.email,
        sortable: true,
    },
    {
        name: "Subject",
        selector: (row) => row?.subject,
        sortable: true,
    },
];

const STATUS_BADGE = {
    AVAILABLE: { label: "Available", background: "#1b7a43" },
    RENTED: { label: "Rented", background: "#c98a1f" },
    OUT_OF_SERVICE: { label: "Out of Service", background: "#b93a3a" },
};

export const adminVehiclesColumns = [
    {
        name: "Image",
        selector: (row) => (
            <img
                src={`${API_URL}/files/display/${row?.image[0]}`}
                alt={row?.model}
                title={row?.model}
                width={80}
                style={{
                    pointerEvents: "none",
                }}
            />
        ),
    },
    {
        name: "Brand",
        selector: (row) => row?.brand,
    },
    {
        name: "Model",
        selector: (row) => row?.model,
    },
    {
        name: "Plate",
        selector: (row) => row?.licensePlate,
    },
    {
        name: "Age",
        selector: (row) => row?.age,
    },
    {
        name: "Transmission",
        selector: (row) => row?.transmission,
    },
    {
        name: "Fuel",
        selector: (row) => row?.fuelType,
    },
    {
        name: "Price/hour",
        selector: (row) => `$ ${row?.pricePerHour}`,
    },
    {
        name: "Status",
        selector: (row) => {
            const status = STATUS_BADGE[row?.status];
            if (!status) return null;
            return (
                <span
                    style={{
                        backgroundColor: status.background,
                        color: "#fff",
                        padding: "0.25rem 0.6rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                    }}
                >
                    {status.label}
                </span>
            );
        },
    },
];