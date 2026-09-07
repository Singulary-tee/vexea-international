let _dbInstance: any = null;
function getDbInstance() {
  if (!_dbInstance) {
    try {
      const { getFirestore } = require("firebase-admin/firestore");
      _dbInstance = getFirestore();
    } catch (e: any) {
      _dbInstance = new Proxy(
        {},
        {
          get(target, prop) {
            if (prop === "collection") {
              return () => ({
                doc: () => ({
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {},
                  get: async () => ({ exists: false, data: () => null }),
                }),
                where: () => ({
                  get: async () => ({ size: 0, forEach: () => {} }),
                }),
                get: async () => ({ size: 0, forEach: () => {} }),
              });
            }
            if (prop === "doc") {
              return () => ({
                set: async () => {},
                update: async () => {},
                delete: async () => {},
                get: async () => ({ exists: false, data: () => null }),
              });
            }
            if (prop === "runTransaction") {
              return async (fn: any) => {
                const tx = {
                  get: async () => ({ exists: false, data: () => null }),
                  set: () => tx,
                  update: () => tx,
                  delete: () => tx,
                };
                return fn(tx);
              };
            }
            return () => {
              return {
                doc: () => ({
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {},
                  get: async () => ({ exists: false, data: () => null }),
                }),
                collection: () => ({
                  doc: () => ({
                    set: async () => {},
                    update: async () => {},
                    delete: async () => {},
                    get: async () => ({ exists: false, data: () => null }),
                  }),
                }),
                where: () => ({
                  get: async () => ({ size: 0, forEach: () => {} }),
                }),
              };
            };
          },
        },
      );
    }
  }
  return _dbInstance;
}

export const db: any = new Proxy(
  {},
  {
    get(target, prop) {
      const inst = getDbInstance();
      const val = inst[prop];
      if (typeof val === "function") {
        return val.bind(inst);
      }
      return val;
    },
  },
) as any;

export function doc(database: any, collectionName: string, docId?: string) {
  if (docId) {
    return db.collection(collectionName).doc(docId);
  }
  return db.doc(collectionName);
}

export async function getDoc(docRef: any) {
  const snap = await docRef.get();
  return {
    exists: () => snap.exists,
    data: () => snap.data(),
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  return docRef.set(data, options);
}

export async function updateDoc(docRef: any, data: any) {
  return docRef.update(data);
}

export async function deleteDoc(docRef: any) {
  return docRef.delete();
}

export async function runTransaction(database: any, updateFunction: any) {
  return db.runTransaction(updateFunction);
}

export function increment(value: number) {
  try {
    const { FieldValue } = require("firebase-admin/firestore");
    return FieldValue.increment(value);
  } catch (e) {
    return { value, type: "increment" };
  }
}
