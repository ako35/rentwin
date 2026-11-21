import { createSlice } from "@reduxjs/toolkit";

const SEARCH_STORAGE_KEY = "rentwinReservationSearch";

// A search is kept across reloads so the visitor doesn't retype it, but only
// while its pick-up is still ahead. A search saved days ago would otherwise
// keep filtering /vehicles by availability for dates that have already
// passed (and prefill the booking form with them).
const isStillAhead = (criteria) => {
    if (!criteria?.pickUpDate) return false;
    const pickUp = new Date(`${criteria.pickUpDate}T${criteria.pickUpTime || "23:59"}`);
    return !Number.isNaN(pickUp.getTime()) && pickUp.getTime() > Date.now();
};

const loadSearchCriteria = () => {
    try {
        const raw = localStorage.getItem(SEARCH_STORAGE_KEY);
        const criteria = raw ? JSON.parse(raw) : null;
        if (criteria && !isStillAhead(criteria)) {
            localStorage.removeItem(SEARCH_STORAGE_KEY);
            return null;
        }
        return criteria;
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
