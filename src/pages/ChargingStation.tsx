import { BatteryCharging } from "lucide-react";
import { ServicePage } from "./ServicePage";

const ChargingStation = () => (
  <ServicePage
    title="Charging Station"
    description="Manage device charging records and billing"
    icon={BatteryCharging}
    fields={["Customer Name", "Device Type", "Amount", "Payment Status"]}
  />
);

export default ChargingStation;
