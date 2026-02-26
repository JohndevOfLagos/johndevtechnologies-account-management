import { CreditCard } from "lucide-react";
import { ServicePage } from "./ServicePage";

const PosAgent = () => (
  <ServicePage
    title="POS Agent"
    description="Manage withdrawals, transfers, and bill payments"
    icon={CreditCard}
    fields={["Withdraw Amount", "Transfer Amount", "Bill Type", "Cash Received", "Profit"]}
  />
);

export default PosAgent;
