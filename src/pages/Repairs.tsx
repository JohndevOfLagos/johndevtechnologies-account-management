import { Wrench } from "lucide-react";
import { ServicePage } from "./ServicePage";

const Repairs = () => (
  <ServicePage
    title="Repairs"
    description="Phone & computer repair service tracking"
    icon={Wrench}
    fields={["Device Type", "Fault", "Part Changed", "Amount"]}
  />
);

export default Repairs;
