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

export async function getSponsoredLegislation(ID){
    const { data } = await congressClient.get("/member/" + ID + "/sponsored-legislation",
        {params : {limit:50}}
    );
    return data.MemberSponsoredLegislation
}

export async function getCosponsoredLegislation(ID){
    const { data } = await congressClient.get("/member/" + ID + "/cosponsored-legislation",
        {params:{limit:50}}
    );
    return data.MemberSponsoredLegislation
}