import { Gamepad2 } from "lucide-react";
import { ServicePage } from "./ServicePage";

const Snooker = () => (
  <ServicePage
    title="Snooker Spot"
    description="Track gaming sessions (9AM–9PM)"
    icon={Gamepad2}
    fields={["Game Type", "Games Played", "Amount", "Timestamp"]}
  />
);

export default Snooker;
