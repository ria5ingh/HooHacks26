import congressClient from "./congressClient";

/**
 * 
 * @returns array of bill objects; fields include "number" and "type"
 */
export async function getAllBills(){
    const { data } = await congressClient.get("/bill", {
        params: { congress: 118 }
    });
    return data.bills;
}