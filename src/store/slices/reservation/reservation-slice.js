import { createSlice } from "@reduxjs/toolkit";

const SEARCH_STORAGE_KEY = "rentwinReservationSearch";

const loadSearchCriteria = () => {
    try {
        const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const persistSearchCriteria = (criteria) => {
    try {
        if (criteria) {
            localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(criteria));
        } else {
            localStorage.removeItem(SEARCH_STORAGE_KEY);
        }
    } catch {
        /* storage unavailable – criteria simply won't persist across reloads */
    }
};

const reservationSlice = createSlice({
    name: 'reservation',
    initialState: {
        vehicle: null,
        reservations: null,
        searchCriteria: loadSearchCriteria(),
    },
    reducers: {
        setVehicle: (state, action) => {
            state.vehicle = action.payload;
        },
        setReservations: (state, action) => {
            state.reservations = action.payload;
        },
        setSearchCriteria: (state, action) => {
            state.searchCriteria = action.payload;
            persistSearchCriteria(action.payload);
        },
        clearSearchCriteria: (state) => {
            state.searchCriteria = null;
            persistSearchCriteria(null);
        },
    }
});

export const { setReservations, setVehicle, setSearchCriteria, clearSearchCriteria } = reservationSlice.actions;
export default reservationSlice.reducer;
