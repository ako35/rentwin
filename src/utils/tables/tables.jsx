const API_URL = import.meta.env.VITE_APP_API_URL;

export const getAdminUserColumns = (t, tCommon) => [
    {
        name: t("table.user.firstName"),
        selector: (row) => row?.firstName,
    },
    {
        name: t("table.user.lastName"),
        selector: (row) => row?.lastName,
    },
    {
        name: t("table.user.email"),
        selector: (row) => row?.email,
    },
    {
        name: t("table.user.roles"),
        selector: (row) => row?.roles?.map((role) => tCommon(`options.roles.${role}`)).join(" — "),
    },
];

export const getAdminReservationsColumns = (t) => [
    {
        name: t("table.reservation.vehicle"),
        selector: (row) => row?.car?.model,
    },
    {
        name: t("table.reservation.pickup"),
        selector: (row) => row?.pickUpLocation,
    },
    {
        name: t("table.reservation.dropoff"),
        selector: (row) => row?.dropOffLocation,
    },
    {
        name: t("table.reservation.price"),
        selector: (row) => `$ ${row?.totalPrice}`,
    },
];

export const getAdminContactMessagesColumns = (t) => [
    {
        name: t("table.contactMessage.senderName"),
        selector: (row) => row?.name,
        sortable: true,
    },
    {
        name: t("table.contactMessage.senderEmail"),
        selector: (row) => row?.email,
        sortable: true,
    },
    {
        name: t("table.contactMessage.subject"),
        selector: (row) => row?.subject,
        sortable: true,
    },
];

export const getAdminVehiclesColumns = (t) => {
    const STATUS_BADGE = {
        AVAILABLE: { label: t("vehicleStatus.AVAILABLE"), background: "#1b7a43" },
        RENTED: { label: t("vehicleStatus.RENTED"), background: "#c98a1f" },
        OUT_OF_SERVICE: { label: t("vehicleStatus.OUT_OF_SERVICE"), background: "#b93a3a" },
    };

    return [
        {
            name: t("table.vehicle.image"),
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
            name: t("table.vehicle.brand"),
            selector: (row) => row?.brand,
        },
        {
            name: t("table.vehicle.model"),
            selector: (row) => row?.model,
        },
        {
            name: t("table.vehicle.plate"),
            selector: (row) => row?.licensePlate,
        },
        {
            name: t("table.vehicle.age"),
            selector: (row) => row?.age,
        },
        {
            name: t("table.vehicle.transmission"),
            selector: (row) => row?.transmission,
        },
        {
            name: t("table.vehicle.fuel"),
            selector: (row) => row?.fuelType,
        },
        {
            name: t("table.vehicle.pricePerHour"),
            selector: (row) => `$ ${row?.pricePerHour}`,
        },
        {
            name: t("table.vehicle.status"),
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
};
