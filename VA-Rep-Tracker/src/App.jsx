import { getAllBills } from "./api/bills";

//testing getting all bill for current congress and printing it 
const billsArray = getAllBills()
console.log(billsArray)

export default function App() {
  return <div>VA Rep Dashboard</div>
}