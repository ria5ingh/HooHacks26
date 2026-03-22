import congressClient from "./congressClient";
import { getSponLegislation } from "./votes";

/**
 * 
 * @returns array of bill objects; fields include "number" and "type"
 */
export async function getAllBills(){
    const { data } = await congressClient.get("/bill", {
        params: { congress: 119 }
    });
    return data;
}

export async function getBillSummaries(billNumber, billType){
    const { data } = await congressClient.get("/bill/" + billType + "/" + billNumber + "/summaries", {
        params: { limit : 10}
    });
    return data;
}