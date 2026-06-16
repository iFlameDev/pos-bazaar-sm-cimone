import { supabase } from './supabaseClient';

/**
 * Fetch all master data (Products and Customers) from Supabase
 * @returns {Promise<{ products: Object[], customers: Object[] }>}
 */
export async function fetchMasterData() {
  const [productsRes, customersRes] = await Promise.all([
    supabase.from('products').select('*').order('namaProduk', { ascending: true }),
    supabase.from('customers').select('*').order('nama', { ascending: true })
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);

  return {
    products: productsRes.data || [],
    customers: customersRes.data || []
  };
}

/**
 * Fetch a single customer by ID from Supabase
 * @param {string} idCustomer
 * @returns {Promise<Object>}
 */
export async function fetchCustomer(idCustomer) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', idCustomer)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Batch-add multiple new transaction rows at once using RPC
 * This ensures atomic stock and balance deduction without race conditions.
 * @param {Array<{ idTransaksi: string, idProduk: string, qty: number, idCustomer: string, transaksiPic: string }>} transactions
 * @returns {Promise<{ success: boolean }>}
 */
export async function batchAddTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    return { success: true };
  }

  // Call the custom RPC function we defined in Supabase SQL
  const { data, error } = await supabase.rpc('process_pos_batch', {
    payload: transactions
  });

  if (error) {
    console.error('Batch transaction failed:', error);
    throw new Error(error.message);
  }

  return { success: data };
}

/**
 * Fetch all transactions for a specific customer
 * @param {string} idCustomer
 * @returns {Promise<{ transactions: Object[] }>}
 */
export async function getCustomerCart(idCustomer) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('idCustomer', idCustomer)
    .gt('qty', 0);

  if (error) {
    console.error('Failed to get customer cart:', error);
    throw new Error(error.message);
  }

  return { transactions: data || [] };
}

/**
 * Batch update cart transactions
 * @param {Array<{ idTransaksi: string, qty: number }>} changedItems
 * @returns {Promise<{ success: boolean }>}
 */
export async function batchUpdateCart(changedItems) {
  if (!changedItems || changedItems.length === 0) {
    return { success: true };
  }

  const updates = changedItems.map(item => {
    if (item.qty === 0) {
      return supabase
        .from('transactions')
        .delete()
        .eq('idTransaksi', item.idTransaksi);
    } else {
      return supabase
        .from('transactions')
        .update({ qty: item.qty })
        .eq('idTransaksi', item.idTransaksi);
    }
  });

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);
  
  if (errors.length > 0) {
    console.error('Batch update failed for some items:', errors);
    throw new Error('Some updates failed');
  }

  return { success: true };
}

