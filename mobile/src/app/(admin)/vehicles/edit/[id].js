import { useLocalSearchParams } from "expo-router";
import VehicleForm from "../../../../components/admin/VehicleForm";

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams();
  return <VehicleForm id={id} />;
}
