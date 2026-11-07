import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllBranches } from "../api/admin";

const BRANCH_KEY = "rentwin-selected-branch-id";

const BranchContext = createContext({
  branches: [],
  selectedBranchId: null,
  selectedBranch: null,
  setSelectedBranchId: () => {},
  loadingBranches: false,
  refreshBranches: () => {},
});

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchIdState] = useState(null);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const fetchBranches = async () => {
    try {
      const list = await getAllBranches();
      if (Array.isArray(list)) {
        setBranches(list);
      }
    } catch {
      // Ignored if user not yet authenticated or offline
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(BRANCH_KEY);
        if (stored) setSelectedBranchIdState(stored);
      } catch {
        // ignore
      }
      fetchBranches();
    })();
  }, []);

  const setSelectedBranchId = async (id) => {
    setSelectedBranchIdState(id);
    try {
      if (id) {
        await AsyncStorage.setItem(BRANCH_KEY, id);
      } else {
        await AsyncStorage.removeItem(BRANCH_KEY);
      }
    } catch {
      // ignore
    }
  };

  const selectedBranch = useMemo(() => {
    if (!selectedBranchId) return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const value = useMemo(
    () => ({
      branches,
      selectedBranchId,
      selectedBranch,
      setSelectedBranchId,
      loadingBranches,
      refreshBranches: fetchBranches,
    }),
    [branches, selectedBranchId, selectedBranch, loadingBranches]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export const useBranch = () => useContext(BranchContext);

