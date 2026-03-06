// types/lotte-mart-delivery.ts
// Template for Lotte Mart - Delivery Note / Surat Jalan

// ─────────────────────────────────────────────
// Sub-types
// ─────────────────────────────────────────────

export interface LotteItem {
  item_code: string | null;       // PLU or Barcode
  description: string | null;     // Product Name
  quantity_ordered: number | null;
  quantity_delivered: number | null;
  uom: string | null;             // Unit of Measurement (e.g. PCS, CTN)
  remarks: string | null;
}

export interface LotteSignatory {
  nama: string | null;
  tanggal: string | null;
  jabatan: string | null;
}

// ─────────────────────────────────────────────
// Main Document Type
// ─────────────────────────────────────────────

export interface LotteMartDelivery {
  // ── Header ─────────────────────────────────
  header: {
    document_no: string | null;    // No. Surat Jalan
    date: string | null;           // Document Date
    store: {
      name: string | null;         // Store Name / Branch
      code: string | null;         // Store Code
      address: string | null;
    };
    sender: {
      name: string | null;         // e.g. PT. LOTTE SHOPPING INDONESIA
      address: string | null;
    };
  };

  // ── References ──────────────────────────────
  references: {
    po_no: string | null;          // Purchase Order Number
    so_no: string | null;          // Sales Order Number
    vehicle_no: string | null;     // License Plate
    driver_name: string | null;
    id_trip_mostrans: string | null;
    id_order: string | null;
    resi_number: string | null;
    origin: string | null;
    destination: string | null;
  };

  // ── Items Table ────────────────────────────
  items: LotteItem[];

  // ── Totals ─────────────────────────────────
  totals: {
    total_quantity: number | null;
    total_items: number | null;
  };

  // ── Signatories ────────────────────────────
  signatories: {
    prepared_by: LotteSignatory;
    driver: LotteSignatory;
    received_by: LotteSignatory;
  };

  note: string | null;
}

// ─────────────────────────────────────────────
// Empty Template
// ─────────────────────────────────────────────

export const emptyLotteMartDelivery: LotteMartDelivery = {
  header: {
    document_no: null,
    date: null,
    store: { name: null, code: null, address: null },
    sender: { name: "PT. LOTTE SHOPPING INDONESIA", address: null },
  },
  references: {
    po_no: null,
    so_no: null,
    vehicle_no: null,
    driver_name: null,
    id_trip_mostrans: null,
    id_order: null,
    resi_number: null,
    origin: null,
    destination: null,
  },
  items: [],
  totals: {
    total_quantity: null,
    total_items: null,
  },
  signatories: {
    prepared_by: { nama: null, tanggal: null, jabatan: null },
    driver: { nama: null, tanggal: null, jabatan: null },
    received_by: { nama: null, tanggal: null, jabatan: null },
  },
  note: null,
};
