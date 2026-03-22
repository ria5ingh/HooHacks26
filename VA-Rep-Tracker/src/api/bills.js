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
