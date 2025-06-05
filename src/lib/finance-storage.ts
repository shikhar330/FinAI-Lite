
import type { IncomeItem, ExpenseItem, InvestmentItem, LoanItem } from '@/types/finance';
import { db } from './firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";

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
    console.log(`==> PRE-OPERATION LOG (addItemFS): About to call addDoc. UserID: '${userId}', Path: '${fullPath}', Data:`, item);
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
    return []; // Still return empty array to prevent breaking UI, but error is logged.
  }
  const fullPath = `users/${userId}/${collectionPath}`;
  console.log(`[Firestore Attempt] Action: getItemsFS, UserID: ${userId}, Path: ${fullPath}`);
  try {
    const userColRef = collection(db, fullPath);
    console.log(`==> PRE-OPERATION LOG (getItemsFS): About to call getDocs. UserID: '${userId}', Path: '${fullPath}'`);
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
    console.log(`==> PRE-OPERATION LOG (updateItemFS): About to call updateDoc. UserID: '${userId}', Path: '${fullPath}', Updates:`, updates);
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
    console.log(`==> PRE-OPERATION LOG (deleteItemFS): About to call deleteDoc. UserID: '${userId}', Path: '${fullPath}'`);
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

// --- Income ---
const INCOME_COLLECTION = 'incomeItems';
export const getIncomeItems = (userId: string): Promise<IncomeItem[]> => getItemsFS<IncomeItem>(userId, INCOME_COLLECTION);
export const addIncomeItem = (userId: string, item: Omit<IncomeItem, 'id'>): Promise<IncomeItem> => addItemFS<IncomeItem>(userId, INCOME_COLLECTION, item);
export const updateIncomeItem = (userId: string, itemId: string, updates: Partial<Omit<IncomeItem, 'id'>>): Promise<void> => updateItemFS<IncomeItem>(userId, INCOME_COLLECTION, itemId, updates);
export const deleteIncomeItem = (userId: string, itemId: string): Promise<void> => deleteItemFS(userId, INCOME_COLLECTION, itemId);

// --- Expenses ---
const EXPENSES_COLLECTION = 'expenseItems';
export const getExpenseItems = (userId: string): Promise<ExpenseItem[]> => getItemsFS<ExpenseItem>(userId, EXPENSES_COLLECTION);
export const addExpenseItem = (userId: string, item: Omit<ExpenseItem, 'id'>): Promise<ExpenseItem> => addItemFS<ExpenseItem>(userId, EXPENSES_COLLECTION, item);
export const updateExpenseItem = (userId: string, itemId: string, updates: Partial<Omit<ExpenseItem, 'id'>>): Promise<void> => updateItemFS<ExpenseItem>(userId, EXPENSES_COLLECTION, itemId, updates);
export const deleteExpenseItem = (userId: string, itemId: string): Promise<void> => deleteItemFS(userId, EXPENSES_COLLECTION, itemId);

// --- Investments ---
const INVESTMENTS_COLLECTION = 'investmentItems';

export const getInvestmentItems = async (userId: string): Promise<InvestmentItem[]> => {
  if (!userId) {
    console.error("[Firestore FATAL] getInvestmentItems: User ID is required. Returning empty array.");
    return [];
  }
  console.log(`[FinanceStorage] getInvestmentItems called for UserID: ${userId}`);
  const items = await getItemsFS<any>(userId, INVESTMENTS_COLLECTION);
  return items.map(item => ({
    ...item,
    purchaseDate: item.purchaseDate && item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate().toISOString() : undefined,
  }));
};

export const addInvestmentItem = (userId: string, item: Omit<InvestmentItem, 'id'>): Promise<InvestmentItem> => {
    if (!userId) {
        const errorMsg = `[Firestore FATAL] addInvestmentItem: Operation attempted without User ID for collection '${INVESTMENTS_COLLECTION}'. Aborting.`;
        console.error(errorMsg, "Item data:", item);
        throw new Error("User ID is required to add investment item.");
    }
    console.log(`[FinanceStorage] addInvestmentItem called for UserID: ${userId}`, item);
    const dataToSave: any = {
        name: item.name,
        type: item.type,
        currentValue: item.currentValue,
        initialInvestment: item.initialInvestment === undefined ? null : item.initialInvestment,
        purchaseDate: item.purchaseDate ? Timestamp.fromDate(new Date(item.purchaseDate)) : null,
    };
    return addItemFS<InvestmentItem>(userId, INVESTMENTS_COLLECTION, dataToSave);
};

export const updateInvestmentItem = (userId: string, itemId: string, updates: Partial<Omit<InvestmentItem, 'id'>>): Promise<void> => {
    if (!userId) {
        const errorMsg = `[Firestore FATAL] updateInvestmentItem: Operation attempted without User ID for collection '${INVESTMENTS_COLLECTION}', item ID '${itemId}'. Aborting.`;
        console.error(errorMsg, "Update data:", updates);
        throw new Error("User ID is required to update investment item.");
    }
    if (!itemId) {
        const errorMsg = `[Firestore FATAL] updateInvestmentItem: Operation attempted without Item ID for collection '${INVESTMENTS_COLLECTION}'. Aborting.`;
        console.error(errorMsg, "User ID:", userId, "Update data:", updates);
        throw new Error("Item ID is required to update investment item.");
    }
    console.log(`[FinanceStorage] updateInvestmentItem called for UserID: ${userId}, ItemID: ${itemId}`, updates);
    const dataToUpdate: any = {};
    for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
            const k = key as keyof typeof updates;
            if (k === 'purchaseDate') {
                dataToUpdate[k] = updates.purchaseDate ? Timestamp.fromDate(new Date(updates.purchaseDate)) : null;
            } else {
                dataToUpdate[k] = (updates as any)[k] === undefined ? null : (updates as any)[k];
            }
        }
    }
    return updateItemFS<InvestmentItem>(userId, INVESTMENTS_COLLECTION, itemId, dataToUpdate);
};

export const deleteInvestmentItem = (userId: string, itemId: string): Promise<void> => {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] deleteInvestmentItem: Operation attempted without User ID for collection '${INVESTMENTS_COLLECTION}', item ID '${itemId}'. Aborting.`;
    console.error(errorMsg);
    throw new Error("User ID is required to delete investment item.");
  }
  if (!itemId) {
    const errorMsg = `[Firestore FATAL] deleteInvestmentItem: Operation attempted without Item ID for collection '${INVESTMENTS_COLLECTION}'. Aborting.`;
    console.error(errorMsg, "User ID:", userId);
    throw new Error("Item ID is required to delete investment item.");
  }
  console.log(`[FinanceStorage] deleteInvestmentItem called for UserID: ${userId}, ItemID: ${itemId}`);
  return deleteItemFS(userId, INVESTMENTS_COLLECTION, itemId);
};


// --- Loans ---
const LOANS_COLLECTION = 'loanItems';

export const getLoanItems = async (userId: string): Promise<LoanItem[]> => {
  if (!userId) {
    console.error("[Firestore FATAL] getLoanItems: User ID is required. Returning empty array.");
    return [];
  }
  console.log(`[FinanceStorage] getLoanItems called for UserID: ${userId}`);
  const items = await getItemsFS<any>(userId, LOANS_COLLECTION);
  return items.map(item => ({
    ...item,
    startDate: item.startDate && item.startDate instanceof Timestamp ? item.startDate.toDate().toISOString() : undefined,
  }));
};

export const addLoanItem = (userId: string, item: Omit<LoanItem, 'id'>): Promise<LoanItem> => {
    if (!userId) {
        const errorMsg = `[Firestore FATAL] addLoanItem: Operation attempted without User ID for collection '${LOANS_COLLECTION}'. Aborting.`;
        console.error(errorMsg, "Item data:", item);
        throw new Error("User ID is required to add loan item.");
    }
    console.log(`[FinanceStorage] addLoanItem called for UserID: ${userId}`, item);
    const dataToSave: any = {
        name: item.name,
        type: item.type,
        outstandingBalance: item.outstandingBalance,
        monthlyPayment: item.monthlyPayment,
        interestRate: item.interestRate === undefined ? null : item.interestRate,
        originalAmount: item.originalAmount === undefined ? null : item.originalAmount,
        startDate: item.startDate ? Timestamp.fromDate(new Date(item.startDate)) : null,
    };
    return addItemFS<LoanItem>(userId, LOANS_COLLECTION, dataToSave);
};

export const updateLoanItem = (userId: string, itemId: string, updates: Partial<Omit<LoanItem, 'id'>>): Promise<void> => {
    if (!userId) {
        const errorMsg = `[Firestore FATAL] updateLoanItem: Operation attempted without User ID for collection '${LOANS_COLLECTION}', item ID '${itemId}'. Aborting.`;
        console.error(errorMsg, "Update data:", updates);
        throw new Error("User ID is required to update loan item.");
    }
    if (!itemId) {
        const errorMsg = `[Firestore FATAL] updateLoanItem: Operation attempted without Item ID for collection '${LOANS_COLLECTION}'. Aborting.`;
        console.error(errorMsg, "User ID:", userId, "Update data:", updates);
        throw new Error("Item ID is required to update loan item.");
    }
    console.log(`[FinanceStorage] updateLoanItem called for UserID: ${userId}, ItemID: ${itemId}`, updates);
    const dataToUpdate: any = {};
    for (const key in updates) {
        if (updates.hasOwnProperty(key)) {
            const k = key as keyof typeof updates;
            if (k === 'startDate') {
                dataToUpdate[k] = updates.startDate ? Timestamp.fromDate(new Date(updates.startDate)) : null;
            } else {
                 dataToUpdate[k] = (updates as any)[k] === undefined ? null : (updates as any)[k];
            }
        }
    }
    return updateItemFS<LoanItem>(userId, LOANS_COLLECTION, itemId, dataToUpdate);
};

export const deleteLoanItem = (userId: string, itemId: string): Promise<void> => {
  if (!userId) {
    const errorMsg = `[Firestore FATAL] deleteLoanItem: Operation attempted without User ID for collection '${LOANS_COLLECTION}', item ID '${itemId}'. Aborting.`;
    console.error(errorMsg);
    throw new Error("User ID is required to delete loan item.");
  }
   if (!itemId) {
    const errorMsg = `[Firestore FATAL] deleteLoanItem: Operation attempted without Item ID for collection '${LOANS_COLLECTION}'. Aborting.`;
    console.error(errorMsg, "User ID:", userId);
    throw new Error("Item ID is required to delete loan item.");
  }
  console.log(`[FinanceStorage] deleteLoanItem called for UserID: ${userId}, ItemID: ${itemId}`);
  return deleteItemFS(userId, LOANS_COLLECTION, itemId);
};
