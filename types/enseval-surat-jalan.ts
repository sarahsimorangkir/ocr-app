// types/enseval-surat-jalan.ts
// Template for PT. Enseval Putera Megatrading TBK - Surat Jalan

// ─────────────────────────────────────────────
// Sub-types
// ─────────────────────────────────────────────

export interface EnsevalShiplistItem {
  kemasan: string | null;       // e.g. "DOOS"
  jumlah_koli: number | null;   // e.g. 1.00
  berat_kg: number | null;      // e.g. 0.30
  volume_m3: number | null;     // e.g. 0.01
  keterangan: string | null;    // e.g. "PHM"
}

export interface EnsevalSignatory {
  nama: string | null;
  ttd: boolean;                 // true if signed
  tanggal: string | null;       // format: DD/MM/YYYY or DD-Mon-YYYY
}

// ─────────────────────────────────────────────
// Main Document Type
// ─────────────────────────────────────────────

export interface EnsevalSuratJalan {
  // ── Pengirim (FROM) ────────────────────────
  pengirim: {
    nama: string | null;        // e.g. "PT. ENSEVAL PUTERA MEGATRADING TBK."
    cabang: string | null;      // e.g. "RDC JAKARTA"
    alamat: string | null;      // e.g. "Jl. Rawa Gelam IV No. 6"
    kawasan: string | null;     // e.g. "Kawasan Industri Pulo Gadung"
    kota: string | null;        // e.g. "JAKARTA 13930"
  };

  // ── Penerima (TO) ──────────────────────────
  penerima: {
    tanggal: string | null;     // e.g. "03-Nov-2025"
    nama: string | null;        // e.g. "PT (MGD) DHARMA BANDAR MANDALA"
    alamat: string | null;      // e.g. "JL Garuda No.76 Kemayoran Jakarta Pusat"
    kota: string | null;        // e.g. "Jakarta Pusat"
  };

  // ── Document Info ──────────────────────────
  no_surat_jalan: string | null;  // e.g. "202533588"

  // ── Shiplist Items ─────────────────────────
  shiplist: EnsevalShiplistItem[];

  // ── Totals ─────────────────────────────────
  total: {
    jumlah_koli: number | null;   // e.g. 1
    terbilang_koli: string | null;// e.g. "SATU"
    berat_kg: number | null;      // e.g. 0.30
    volume_m3: number | null;     // e.g. 0.01
  };

  // ── Pengiriman Info ────────────────────────
  pengiriman: {
    via: string | null;                   // e.g. "Udara"
    no_kendaraan: string | null;
    no_segel: string | null;
    no_container: string | null;
    perhitungan: string | null;           // e.g. "XKGU01-PER KG/UDARA"
    shiplist_no: string | null;           // e.g. "113274313"
    keterangan: string | null;            // e.g. "MAY 965097"
  };

  // ── Tujuan Pengiriman ──────────────────────
  tujuan: {
    nama: string | null;          // e.g. "PT. EPM BANDA ACEH"
    alamat: string | null;        // e.g. "JL. Lempeuneurut_Peukan Biluy Kec. Da"
    kota: string | null;          // e.g. "ACEH BESAR"
    negara: string | null;        // e.g. "INDONESIA"
  };

  // ── Signatories ────────────────────────────
  signatories: {
    penerima_cab: EnsevalSignatory;
    manager_ass_mgr: EnsevalSignatory;
    expeditur: EnsevalSignatory;
    adm_dist_desp_supv: EnsevalSignatory;
  };

  // ── Footer Info ────────────────────────────
  claim: "YA" | "TIDAK" | null;
  cetak: string | null;           // e.g. "15:10:51"
}

// ─────────────────────────────────────────────
// Empty Template
// ─────────────────────────────────────────────

export const emptyEnsevalSuratJalan: EnsevalSuratJalan = {
  pengirim: {
    nama: null,
    cabang: null,
    alamat: null,
    kawasan: null,
    kota: null,
  },
  penerima: {
    tanggal: null,
    nama: null,
    alamat: null,
    kota: null,
  },
  no_surat_jalan: null,
  shiplist: [],
  total: {
    jumlah_koli: null,
    terbilang_koli: null,
    berat_kg: null,
    volume_m3: null,
  },
  pengiriman: {
    via: null,
    no_kendaraan: null,
    no_segel: null,
    no_container: null,
    perhitungan: null,
    shiplist_no: null,
    keterangan: null,
  },
  tujuan: {
    nama: null,
    alamat: null,
    kota: null,
    negara: null,
  },
  signatories: {
    penerima_cab: { nama: null, ttd: false, tanggal: null },
    manager_ass_mgr: { nama: null, ttd: false, tanggal: null },
    expeditur: { nama: null, ttd: false, tanggal: null },
    adm_dist_desp_supv: { nama: null, ttd: false, tanggal: null },
  },
  claim: null,
  cetak: null,
};

// ─────────────────────────────────────────────
// Sample Output (based on uploaded document)
// ─────────────────────────────────────────────

export const sampleEnsevalSuratJalan: EnsevalSuratJalan = {
  pengirim: {
    nama: "PT. ENSEVAL PUTERA MEGATRADING TBK.",
    cabang: "RDC JAKARTA",
    alamat: "Jl. Rawa Gelam IV No. 6",
    kawasan: "Kawasan Industri Pulo Gadung",
    kota: "JAKARTA 13930",
  },
  penerima: {
    tanggal: "03-Nov-2025",
    nama: "PT (MGD) DHARMA BANDAR MANDALA",
    alamat: "JL Garuda No.76 Kemayoran Jakarta Pusat",
    kota: "Jakarta Pusat",
  },
  no_surat_jalan: "202533588",
  shiplist: [
    {
      kemasan: "DOOS",
      jumlah_koli: 1.0,
      berat_kg: 0.30,
      volume_m3: 0.01,
      keterangan: "PHM",
    },
  ],
  total: {
    jumlah_koli: 1,
    terbilang_koli: "SATU",
    berat_kg: 0.30,
    volume_m3: 0.01,
  },
  pengiriman: {
    via: "Udara",
    no_kendaraan: null,
    no_segel: null,
    no_container: null,
    perhitungan: "XKGU01-PER KG/UDARA",
    shiplist_no: "113274313",
    keterangan: "MAY 965097",
  },
  tujuan: {
    nama: "PT. EPM BANDA ACEH",
    alamat: "JL. Lempeuneurut_Peukan Biluy Kec. Da",
    kota: "ACEH BESAR",
    negara: "INDONESIA",
  },
  signatories: {
    penerima_cab: { nama: null, ttd: true, tanggal: "03/11/2025" },
    manager_ass_mgr: { nama: null, ttd: true, tanggal: "03/11/2025" },
    expeditur: { nama: null, ttd: true, tanggal: null },
    adm_dist_desp_supv: { nama: null, ttd: true, tanggal: "02/11/2025" },
  },
  claim: null,
  cetak: "15:10:51",
};