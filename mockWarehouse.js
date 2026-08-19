export function fetchWarehouseStock() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { sku: 'ITEM-001', stock: Math.floor(Math.random() * 100) },
        { sku: 'ITEM-002', stock: Math.floor(Math.random() * 50) },
        { sku: 'ITEM-003', stock: Math.floor(Math.random() * 200) },
      ]);
    }, 500);
  });
}