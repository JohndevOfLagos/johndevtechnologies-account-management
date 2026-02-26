import { ShoppingBag } from "lucide-react";
import { ServicePage } from "./ServicePage";

const Accessories = () => (
  <ServicePage
    title="Accessories"
    description="Track accessory sales and inventory"
    icon={ShoppingBag}
    fields={["Accessory Type", "Amount", "Timestamp"]}
  />
);

export default Accessories;
