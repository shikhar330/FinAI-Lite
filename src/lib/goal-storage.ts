
import type { FinancialGoal } from '@/types/finance';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";

const GOALS_COLLECTION = 'financialGoals';

// --- Generic Helper for adding items with auto-generated ID ---
async function addItemFS<T extends { id?: string }>(userId: string, collectionPath: string, item: Omit<T, 'id'>): Promise<T> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] addItemFS: Operation attempted without User ID for collection '${collectionPath}'. Aborting.`;
    console.error(errorMsg, "Item data:", item);
    throw new Error("User ID is required to add item.");
  }
  const fullPath = `users/${userId}/${collectionPath}`;
  console.log(`[Firestore Attempt] Action: addItemFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    const userColRef = collection(db, fullPath);
    const docRef = await addDoc(userColRef, item);
    console.log(`[Firestore Success] addItemFS: Document added with ID: ${docRef.id} to path: ${fullPath}`);
    return { ...item, id: docRef.id } as T;
  } catch (error: any) {
    console.error(`[Firestore Error] addItemFS to ${fullPath} failed for user ${userId}:`, error);
    if (error.code === 'permission-denied' || (error.message && error.message.includes("Missing or insufficient permissions"))) {
      console.error(" Firebase Permission Denied: Please check your Firestore security rules and ensure the authenticated user has write access to this path. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Generic Helper for getting items ---
async function getItemsFS<T extends { id?: string }>(userId: string, collectionPath: string): Promise<T[]> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] getItemsFS: Operation attempted without User ID for collection '${collectionPath}'. Returning empty array. Aborting.`;
    console.error(errorMsg);
    return [];
  }
  const fullPath = `users/${userId}/${collectionPath}`;
  console.log(`[Firestore Attempt] Action: getItemsFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    const userColRef = collection(db, fullPath);
    const snapshot = await getDocs(userColRef);
    console.log(`[Firestore Success] getItemsFS: Fetched ${snapshot.docs.length} documents from path: ${fullPath}`);
    return snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as T));
  } catch (error: any) {
    console.error(`[Firestore Error] getItemsFS from ${fullPath} failed for user ${userId}:`, error);
    if (error.code === 'permission-denied' || (error.message && error.message.includes("Missing or insufficient permissions"))) {
      console.error(" Firebase Permission Denied: Please check your Firestore security rules and ensure the authenticated user has read access to this path. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Generic Helper for updating items ---
async function updateItemFS<T extends { id: string }>(userId: string, collectionPath: string, itemId: string, updates: Partial<Omit<T, 'id'>>): Promise<void> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] updateItemFS: Operation attempted without User ID for collection '${collectionPath}', item ID '${itemId}'. Aborting.`;
    console.error(errorMsg, "Update data:", updates);
    throw new Error("User ID is required to update item.");
  }
  if (!itemId) {
    const errorMsg = `[Firestore FATAL] updateItemFS: Operation attempted without Item ID for collection '${collectionPath}'. Aborting.`;
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
      console.error(" Firebase Permission Denied: Please check your Firestore security rules and ensure the authenticated user has write access to this path. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}

// --- Generic Helper for deleting items ---
async function deleteItemFS(userId: string, collectionPath: string, itemId: string): Promise<void> {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] deleteItemFS: Operation attempted without User ID for collection '${collectionPath}', item ID '${itemId}'. Aborting.`;
    console.error(errorMsg);
    throw new Error("User ID is required to delete item.");
  }
  if (!itemId) {
    const errorMsg = `[Firestore FATAL] deleteItemFS: Operation attempted without Item ID for collection '${collectionPath}'. Aborting.`;
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
      console.error(" Firebase Permission Denied: Please check your Firestore security rules and ensure the authenticated user has delete access to this path. UserID used: '" + userId + "'. Path attempted: '" + fullPath + "'.");
    }
    throw error;
  }
}


// --- Financial Goals ---
export const getFinancialGoals = async (userId: string): Promise<FinancialGoal[]> => {
  if (!userId) {
    console.error("[goal-storage] getFinancialGoals: User ID is required.");
    return [];
  }
  const items = await getItemsFS<any>(userId, GOALS_COLLECTION);
  return items.map(item => ({
    ...item,
    targetDate: item.targetDate && item.targetDate instanceof Timestamp ? item.targetDate.toDate().toISOString() : undefined,
  }));
};

export const addFinancialGoal = (userId: string, goal: Omit<FinancialGoal, 'id'>): Promise<FinancialGoal> => {
  if (!userId) throw new Error("User ID is required for addFinancialGoal");
  const dataToSave: any = {
    ...goal,
    targetDate: goal.targetDate ? Timestamp.fromDate(new Date(goal.targetDate)) : null,
  };
  return addItemFS<FinancialGoal>(userId, GOALS_COLLECTION, dataToSave);
};

export const updateFinancialGoal = (userId: string, goalId: string, updates: Partial<Omit<FinancialGoal, 'id'>>): Promise<void> => {
  if (!userId) throw new Error("User ID is required for updateFinancialGoal");
  if (!goalId) throw new Error("Goal ID is required for updateFinancialGoal");
  const dataToUpdate: any = { ...updates };
  if (updates.targetDate) {
    dataToUpdate.targetDate = Timestamp.fromDate(new Date(updates.targetDate));
  } else if (updates.hasOwnProperty('targetDate') && updates.targetDate === undefined) {
    dataToUpdate.targetDate = null; // Explicitly set to null if undefined is passed
  }
  // Ensure goalType is included if present in updates
  if (updates.goalType) {
    dataToUpdate.goalType = updates.goalType;
  }
  return updateItemFS<FinancialGoal>(userId, GOALS_COLLECTION, goalId, dataToUpdate);
};

export const deleteFinancialGoal = (userId: string, goalId: string): Promise<void> => {
  if (!userId) throw new Error("User ID is required for deleteFinancialGoal");
  if (!goalId) throw new Error("Goal ID is required for deleteFinancialGoal");
  return deleteItemFS(userId, GOALS_COLLECTION, goalId);
};
