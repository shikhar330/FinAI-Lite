
import type { BillItem } from '@/types/finance';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, orderBy, where } from "firebase/firestore";

const BILLS_COLLECTION = 'billItems';

// --- Generic Helper for adding items with auto-generated ID ---
async function addItemFS<T extends { id?: string; userId?: string }>(userId: string, collectionPath: string, item: Omit<T, 'id'>): Promise<T> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] addItemFS (bill-storage): Operation attempted without User ID for collection '${collectionPath}'. Aborting.`;
    console.error(errorMsg, "Item data:", item);
    throw new Error("User ID is required to add item.");
  }
  const fullPath = `users/${userId}/${collectionPath}`;
  const itemWithUserId = { ...item, userId }; // Ensure userId is part of the document
  console.log(`[Firestore Attempt] Action: addItemFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    const userColRef = collection(db, fullPath);
    const docRef = await addDoc(userColRef, itemWithUserId);
    console.log(`[Firestore Success] addItemFS: Document added with ID: ${docRef.id} to path: ${fullPath}`);
    return { ...itemWithUserId, id: docRef.id } as T;
  } catch (error: any) {
    console.error(`[Firestore Error] addItemFS to ${fullPath} failed for user ${userId}:`, error);
    if (error.code === 'permission-denied' || (error.message && error.message.includes("Missing or insufficient permissions"))) {
      console.error(" Firebase Permission Denied. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Generic Helper for getting items ---
async function getItemsFS<T extends { id?: string }>(userId: string, collectionPath: string): Promise<T[]> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] getItemsFS (bill-storage): Operation attempted without User ID for collection '${collectionPath}'. Returning empty array. Aborting.`;
    console.error(errorMsg);
    return [];
  }
  const fullPath = `users/${userId}/${collectionPath}`;
  console.log(`[Firestore Attempt] Action: getItemsFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    // Order by dueDate to get upcoming bills first
    const userColRef = collection(db, fullPath);
    const q = query(userColRef, orderBy("dueDate", "asc"));
    const snapshot = await getDocs(q);

    console.log(`[Firestore Success] getItemsFS: Fetched ${snapshot.docs.length} documents from path: ${fullPath}`);
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as T));
  } catch (error: any) {
    console.error(`[Firestore Error] getItemsFS from ${fullPath} failed for user ${userId}:`, error);
     if (error.code === 'permission-denied' || (error.message && error.message.includes("Missing or insufficient permissions"))) {
      console.error(" Firebase Permission Denied. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Generic Helper for updating items ---
async function updateItemFS<T extends { id: string }>(userId: string, collectionPath: string, itemId: string, updates: Partial<Omit<T, 'id'>>): Promise<void> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] updateItemFS (bill-storage): Operation attempted without User ID for collection '${collectionPath}', item ID '${itemId}'. Aborting.`;
    console.error(errorMsg, "Update data:", updates);
    throw new Error("User ID is required to update item.");
  }
  if (!itemId) {
    const errorMsg = `[Firestore FATAL] updateItemFS (bill-storage): Operation attempted without Item ID for collection '${collectionPath}'. Aborting.`;
    console.error(errorMsg, "User ID:", userId, "Update data:", updates);
    throw new Error("Item ID is required to update item.");
  }
  const fullPath = `users/${userId}/${collectionPath}/${itemId}`;
  console.log(`[Firestore Attempt] Action: updateItemFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    const itemDocRef = doc(db, `users/${userId}/${collectionPath}`, itemId);
    await updateDoc(itemDocRef, updates);
    console.log(`[Firestore Success] updateItemFS: Document updated at path: ${fullPath}`);
  } catch (error: any) {
    console.error(`[Firestore Error] updateItemFS for ${fullPath} failed for user ${userId}:`, error);
    if (error.code === 'permission-denied' || (error.message && error.message.includes("Missing or insufficient permissions"))) {
       console.error(" Firebase Permission Denied. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Generic Helper for deleting items ---
async function deleteItemFS(userId: string, collectionPath: string, itemId: string): Promise<void> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] deleteItemFS (bill-storage): Operation attempted without User ID for collection '${collectionPath}', item ID '${itemId}'. Aborting.`;
    console.error(errorMsg);
    throw new Error("User ID is required to delete item.");
  }
  if (!itemId) {
    const errorMsg = `[Firestore FATAL] deleteItemFS (bill-storage): Operation attempted without Item ID for collection '${collectionPath}'. Aborting.`;
    console.error(errorMsg, "User ID:", userId);
    throw new Error("Item ID is required to delete item.");
  }
  const fullPath = `users/${userId}/${collectionPath}/${itemId}`;
  console.log(`[Firestore Attempt] Action: deleteItemFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    const itemDocRef = doc(db, `users/${userId}/${collectionPath}`, itemId);
    await deleteDoc(itemDocRef);
    console.log(`[Firestore Success] deleteItemFS: Document deleted at path: ${fullPath}`);
  } catch (error: any) {
    console.error(`[Firestore Error] deleteItemFS for ${fullPath} failed for user ${userId}:`, error);
    if (error.code === 'permission-denied' || (error.message && error.message.includes("Missing or insufficient permissions"))) {
      console.error(" Firebase Permission Denied. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Bill Items Specific Functions ---
export const getBillItems = async (userId: string): Promise<BillItem[]> => {
  if (!userId) {
    console.error("[bill-storage] getBillItems: User ID is required.");
    return [];
  }
  const items = await getItemsFS<any>(userId, BILLS_COLLECTION);
  // Firestore returns Timestamps for date fields, convert to ISO strings for consistency
  return items.map(item => ({
    ...item,
    dueDate: item.dueDate && typeof item.dueDate.toDate === 'function' ? item.dueDate.toDate().toISOString() : item.dueDate, // Handle direct ISO strings or Timestamps
    paidDate: item.paidDate && typeof item.paidDate.toDate === 'function' ? item.paidDate.toDate().toISOString() : item.paidDate,
    createdAt: item.createdAt && typeof item.createdAt.toDate === 'function' ? item.createdAt.toDate().toISOString() : item.createdAt,
    // lateFeeValue and lateFeeGracePeriodDays should be numbers if they exist
    lateFeeValue: item.lateFeeValue !== undefined ? Number(item.lateFeeValue) : undefined,
    lateFeeGracePeriodDays: item.lateFeeGracePeriodDays !== undefined ? Number(item.lateFeeGracePeriodDays) : undefined,
  }));
};

export const addBillItem = (userId: string, bill: Omit<BillItem, 'id' | 'userId'>): Promise<BillItem> => {
  if (!userId) throw new Error("User ID is required for addBillItem");
  const dataToSave: any = {
    ...bill,
    userId: userId,
    createdAt: Timestamp.now(), // Set createdAt timestamp
    dueDate: Timestamp.fromDate(new Date(bill.dueDate)),
    // lateFeeValue and lateFeeGracePeriodDays are stored as numbers if provided
    lateFeeValue: bill.lateFeeValue !== undefined ? Number(bill.lateFeeValue) : undefined,
    lateFeeGracePeriodDays: bill.lateFeeGracePeriodDays !== undefined ? Number(bill.lateFeeGracePeriodDays) : undefined,
  };
  if (bill.paidDate) dataToSave.paidDate = Timestamp.fromDate(new Date(bill.paidDate));
  if (bill.lateFeeType === undefined) dataToSave.lateFeeType = null; // Explicitly null if not set
  if (bill.lateFeeValue === undefined) dataToSave.lateFeeValue = null;
  if (bill.lateFeeGracePeriodDays === undefined) dataToSave.lateFeeGracePeriodDays = null;


  return addItemFS<BillItem>(userId, BILLS_COLLECTION, dataToSave);
};

export const updateBillItem = (userId: string, billId: string, updates: Partial<Omit<BillItem, 'id' | 'userId'>>): Promise<void> => {
  if (!userId) throw new Error("User ID is required for updateBillItem");
  if (!billId) throw new Error("Bill ID is required for updateBillItem");
  
  const dataToUpdate: any = { ...updates };

  if (updates.dueDate) {
    dataToUpdate.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
  }
  if (updates.paidDate) {
    dataToUpdate.paidDate = Timestamp.fromDate(new Date(updates.paidDate));
  } else if (updates.hasOwnProperty('paidDate') && updates.paidDate === null) { // Allow setting paidDate to null
      dataToUpdate.paidDate = null; 
  }
  // createdAt should not be updated after creation
  if (dataToUpdate.hasOwnProperty('createdAt')) {
    delete dataToUpdate.createdAt;
  }
  
  // Handle late fee fields
  if (updates.lateFeeType !== undefined) {
    dataToUpdate.lateFeeType = updates.lateFeeType;
  } else if (updates.hasOwnProperty('lateFeeType') && updates.lateFeeType === undefined) {
     dataToUpdate.lateFeeType = null;
  }

  if (updates.lateFeeValue !== undefined) {
    dataToUpdate.lateFeeValue = Number(updates.lateFeeValue);
  } else if (updates.hasOwnProperty('lateFeeValue') && updates.lateFeeValue === undefined) {
     dataToUpdate.lateFeeValue = null;
  }

  if (updates.lateFeeGracePeriodDays !== undefined) {
    dataToUpdate.lateFeeGracePeriodDays = Number(updates.lateFeeGracePeriodDays);
  } else if (updates.hasOwnProperty('lateFeeGracePeriodDays') && updates.lateFeeGracePeriodDays === undefined) {
      dataToUpdate.lateFeeGracePeriodDays = null;
  }
  
  // Remove undefined keys from dataToUpdate to avoid Firestore errors if a field is meant to be unset vs set to null
  Object.keys(dataToUpdate).forEach(key => {
    if (dataToUpdate[key] === undefined && !updates.hasOwnProperty(key as keyof typeof updates)) {
        // This case should not happen if updates are well-formed, but good for safety
        delete dataToUpdate[key]; 
    } else if (updates.hasOwnProperty(key as keyof typeof updates) && (updates as any)[key] === undefined && key !== 'paidDate') { // Keep paidDate if explicitly set to null
        // If a field was explicitly set to undefined in the form (e.g. clearing an optional field),
        // and we intend to remove it or set it to null, this is where it's handled.
        // For lateFee fields, we've set them to null above if they become undefined,
        // which is usually what Firestore expects for "field removal" or "no value".
    }
  });

  return updateItemFS<BillItem>(userId, BILLS_COLLECTION, billId, dataToUpdate);
};

export const deleteBillItem = (userId: string, billId: string): Promise<void> => {
  if (!userId) throw new Error("User ID is required for deleteBillItem");
  if (!billId) throw new Error("Bill ID is required for deleteBillItem");
  return deleteItemFS(userId, BILLS_COLLECTION, billId);
};
