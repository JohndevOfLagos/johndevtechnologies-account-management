import { Smartphone } from "lucide-react";
import { ServicePage } from "./ServicePage";

const DeviceSales = () => (
  <ServicePage
    title="Device Sales"
    description="Track phone and computer sales"
    icon={Smartphone}
    fields={["Device Sold", "Amount", "Timestamp"]}
  />
);

export default DeviceSales;
