import congressClient from "./congressClient";

/**
 * function to fetch all VA members
 * @returns array of member objects; fields include "bioguideID" 
 */
export async function getMembers() {
  const { data } = await congressClient.get("/member/VA", {
    params: { currentMember: true, limit: 50 }
  });
  return data.members;
}

/**
 * function to fetch VA members by district 
 * @returns array of member objects; fields include "bioguideID" 
 */
export async function getMembersByDistrict(district) {
  const { data } = await congressClient.get("/member/VA/" + district, {
    params: { currentMember: true, limit: 50 }
  });
  return data.members;
}