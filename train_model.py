# train_model.py
import requests, pandas as pd, time, joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# ── CONFIG ────────────────────────────────────────────────────────────
CONGRESS_API_KEY = "RJCRg8KPZlI1eo86WXRTn9qdRuGoQ76nesmXLpM2"
BASE = "https://api.congress.gov/v3"
H = {"X-API-Key": CONGRESS_API_KEY}

TOPIC_KEYWORDS = [
    "taxation", "defense", "healthcare", "education", "environment",
    "immigration", "housing", "labor", "energy", "agriculture",
    "crime", "trade", "budget", "veterans", "transportation"
]

# ── STEP 1: FETCH MEMBERS ─────────────────────────────────────────────
def fetch_members(congress=118):
    print("Fetching House members...")
    r = requests.get(
        f"{BASE}/member/congress/{congress}/house",
        headers=H,
        params={"limit": 250, "format": "json"}
    )
    members = r.json().get("members", [])
    rows = []
    for m in members:
        rows.append({
            "bioguide_id": m.get("bioguideId", ""),
            "name":        m.get("name", ""),
            "party":       m.get("partyName", ""),
            "state":       m.get("state", ""),
        })
    df = pd.DataFrame(rows)
    df["party_num"] = df["party"].map(
        {"Democratic": 0, "Republican": 1}
    ).fillna(2)
    print(f"  {len(df)} members fetched")
    return df

# ── STEP 2: FETCH LIST OF HOUSE VOTES ────────────────────────────────
def fetch_vote_list(congress=118, session=1, limit=50):
    """
    GET /house-vote/{congress}/{session}
    Returns a list of roll call votes for a given congress + session
    """
    print(f"  Fetching vote list for congress={congress} session={session}...")
    r = requests.get(
        f"{BASE}/house-vote/{congress}/{session}",
        headers=H,
        params={"limit": limit, "format": "json"}
    )
    data = r.json()
    # The list lives under "house-votes" -> "vote" (array)
    container = data.get("houseRollCallVotes", data.get("house-votes", {}))
    if isinstance(container, dict):
        return container.get("vote", [])
    return []

# ── STEP 3: FETCH HOW EACH MEMBER VOTED ON ONE VOTE ──────────────────
def fetch_member_votes(congress, session, vote_number):
    """
    GET /house-vote/{congress}/{session}/{voteNumber}/members
    Returns each member's vote position for one roll call
    """
    r = requests.get(
        f"{BASE}/house-vote/{congress}/{session}/{vote_number}/members",
        headers=H,
        params={"format": "json"}
    )
    data = r.json()
    # positions live under "members" -> "member"
    container = data.get("members", {})
    if isinstance(container, dict):
        return container.get("member", [])
    if isinstance(container, list):
        return container
    return []

# ── STEP 4: FETCH BILL SUBJECTS FOR FEATURE ENRICHMENT ───────────────
def fetch_bill_subjects(congress, bill_type, bill_number):
    """
    GET /bill/{congress}/{billType}/{billNumber}/subjects
    Optional — adds topic features if bill is linked to a vote
    """
    r = requests.get(
        f"{BASE}/bill/{congress}/{bill_type}/{bill_number}/subjects",
        headers=H,
        params={"format": "json"}
    )
    subjects = r.json().get("subjects", {}).get("legislativeSubjects", [])
    return [s["name"] for s in subjects]

# ── STEP 5: BILL TEXT -> FEATURE VECTOR ──────────────────────────────
def bill_to_features(bill_text: str) -> dict:
    text_lower = bill_text.lower()
    features = {}
    for topic in TOPIC_KEYWORDS:
        features[f"topic_{topic}"] = 1 if topic in text_lower else 0
    features["word_count"]  = len(bill_text.split())
    features["has_funding"] = 1 if any(w in text_lower for w in
        ["billion", "million", "appropriat", "fund", "spend"]) else 0
    features["has_mandate"] = 1 if any(w in text_lower for w in
        ["shall", "require", "must", "mandate"]) else 0
    return features

# ── MAIN ──────────────────────────────────────────────────────────────
if __name__ == "__main__":

    # 1. Get members
    members_df = fetch_members(congress=118)

    # 2. Collect vote rows across two sessions
    all_vote_rows = []

    for session in [1, 2]:
        vote_list = fetch_vote_list(congress=118, session=session, limit=75)
        print(f"  Found {len(vote_list)} votes in session {session}")

        for vote in vote_list:
            # vote number field may be "voteNumber" or "rollNumber"
            vote_num = (
                vote.get("voteNumber") or
                vote.get("rollNumber") or
                vote.get("number")
            )
            if not vote_num:
                continue

            # overall result of the vote (Passed / Failed)
            result = vote.get("result", "")

            # get per-member positions
            positions = fetch_member_votes(118, session, vote_num)
            time.sleep(0.35)  # stay within rate limits

            for pos in positions:
                # member info is usually nested under "member" key
                member_info = pos if "bioguideId" in pos else pos.get("member", {})
                bid        = member_info.get("bioguideId", "")
                vote_cast  = pos.get("votePosition", pos.get("vote", ""))
                voted_yes  = 1 if str(vote_cast).lower() in ["yea","yes","aye"] else 0

                all_vote_rows.append({
                    "bioguide_id": bid,
                    "vote_number": int(vote_num),
                    "session":     session,
                    "voted_yes":   voted_yes,
                    "result":      result,
                })

    if not all_vote_rows:
        print("\nNo vote rows collected — check your API key and endpoints.")
        exit(1)

    votes_df = pd.DataFrame(all_vote_rows)
    print(f"\n{len(votes_df)} total member-vote pairs collected")

    # 3. Merge votes with member party info
    merged = votes_df.merge(
        members_df[["bioguide_id", "party_num", "state"]],
        on="bioguide_id",
        how="left"
    ).dropna(subset=["party_num"])

    print(f"{len(merged)} rows after merging with member data")

    # 4. Define features and target
    FEATURES = ["party_num", "vote_number", "session"]
    TARGET   = "voted_yes"

    X = merged[FEATURES]
    y = merged[TARGET]

    # 5. Train / test split and fit model
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print("\nTraining model...")
    model = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=4,
        random_state=42
    )
    model.fit(X_train, y_train)

    acc = accuracy_score(y_test, model.predict(X_test))
    print(f"Accuracy on held-out test set: {acc:.1%}")

    # 6. Save both model and member table
    joblib.dump(model,      "model.pkl")
    joblib.dump(members_df, "members.pkl")
    print("\nSaved model.pkl and members.pkl")
    print("Done — run predict.py to use the model.")