import congressClient from "./congressClient";

/**
 * @param ID the bioguideID of the member
 * @retrurn an array of laws sponsored by the member which 
 * the following fields
 *  "number": "4417",
        "policyArea": {
            "name": "Government Operations and Politics"},
        "title": "Patent Trial and Appeal Board Reform Act of 2022",
        "type": "S",
 */

function extractArrayFromResponse(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) return data[key];
    }
    return [];
}

function filterValid(items) {
    return items.filter((it) => it && it.number != null && it.title != null && it.type != null);
}

export async function getSponLegislation(ID){
        const { data } = await congressClient.get("/member/" + ID + "/sponsored-legislation",
                {params : {limit:50}}
        );
    const arr = extractArrayFromResponse(data);
    console.log('[debug] getSponLegislation id=', ID, 'response keys=', Object.keys(data));
    console.log('[debug] getSponLegislation raw array length=', arr.length);
    const valid = filterValid(arr);
    console.log('[debug] getSponLegislation filtered length=', valid.length);
    console.log('[debug] getSponLegislation sample=', valid.slice(0, 3));
    return valid.slice(0, 10);
}

export async function getCosponLegislation(ID){
        const { data } = await congressClient.get("/member/" + ID + "/cosponsored-legislation",
                {params:{limit:50}}
        );
    const arr = extractArrayFromResponse(data);
    console.log('[debug] getCosponLegislation id=', ID, 'response keys=', Object.keys(data));
    console.log('[debug] getCosponLegislation raw array length=', arr.length);
    const valid = filterValid(arr);
    console.log('[debug] getCosponLegislation filtered length=', valid.length);
    console.log('[debug] getCosponLegislation sample=', valid.slice(0, 3));
    return valid.slice(0, 10);
}

/**
 * HELPER FUNCTION: Create a dictionary mapping bill number -> bill type from
 * the array returned by `getSponsoredLegislation` (or similar).
 * Returns an empty object for invalid input.
 */
export function extractNumberTypeMap(items) {
    if (!Array.isArray(items)) return {};
    return items.reduce((map, bill) => {
            map[bill.number] = bill.type;
        return map;
    }, {});
}