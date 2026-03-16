import { collection, getDocs, limit, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

export async function runFirestoreHealthcheck() {
  const healthcheckQuery = query(collection(db, "__healthcheck"), limit(1));
  const snapshot = await getDocs(healthcheckQuery);

  return {
    empty: snapshot.empty,
    size: snapshot.size,
  };
}
