"use client";

import { useState, useRef } from "react";
import { SamuderaBastb } from "@/types/samudera-bastb";
import { KimiaFarmaSkb } from "@/types/kimia-farma-skb";
import { KimiaFarmaDelivery } from "@/types/kimia-farma-delivery";
import { LotteMartDelivery } from "@/types/lotte-mart-delivery";
import { DbmCargoInvoice } from "@/types/dbm-cargo-invoice";

type DocFormat = "samudera-bastb" | "kimia-farma-skb" | "kimia-farma-delivery" | "lotte-mart-delivery" | "dbm-cargo-invoice";
type Status = "idle" | "converting" | "processing" | "done" | "error";
type ResultData = SamuderaBastb | KimiaFarmaSkb | KimiaFarmaDelivery | LotteMartDelivery | DbmCargoInvoice | null;

async function pdfToImages(file: File): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  // Limit to first 5 pages to avoid massive payloads, adjust as needed
  const pagesToProcess = Math.min(pdf.numPages, 5);

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d")!;

    await page.render({ canvasContext: context, viewport, canvas }).promise;
    images.push(canvas.toDataURL("image/png").split(",")[1]);
  }
  return images;
}

const FORMAT_CONFIG: Record<DocFormat, { label: string; description: string; endpoint: string; color: string }> = {
  "samudera-bastb": {
    label: "Samudera MKT",
    description: "Berita Acara Serah Terima Barang",
    endpoint: "/api/ocr/samudera",
    color: "blue",
  },
  "kimia-farma-skb": {
    label: "Kimia Farma SKB",
    description: "Surat Kirim Barang",
    endpoint: "/api/ocr/kimia-farma",
    color: "green",
  },
  "kimia-farma-delivery": {
    label: "Kimia Farma Delivery",
    description: "Delivery Local",
    endpoint: "/api/ocr/kimia-farma-delivery",
    color: "purple",
  },
  "lotte-mart-delivery": {
    label: "Lotte Mart Delivery",
    description: "Surat Jalan / Delivery Note",
    endpoint: "/api/ocr/lotte-mart-delivery",
    color: "red",
  },
  "dbm-cargo-invoice": {
    label: "DBM Cargo Invoice",
    description: "Invoice DBM Cargo & Logistics",
    endpoint: "/api/ocr/dbm-cargo",
    color: "orange",
  },
};

export default function Home() {
  const [format, setFormat] = useState<DocFormat>("samudera-bastb");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ResultData>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shouldStore, setShouldStore] = useState(false);

  async function handleExtract() {
    if (!file) return;
    setStatus("converting");
    setError(null);
    setResult(null);

    try {
      const imagesBase64 = await pdfToImages(file);
      
      setStatus("processing");

      const res = await fetch(FORMAT_CONFIG[format].endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          imageBase64: imagesBase64, // Now an array
          store: shouldStore 
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Extraction failed");

      setResult(json.data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  function downloadJSON() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${format}-${Date.now()}.json`;
    a.click();
  }

  function reset() {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const isLoading = status === "converting" || status === "processing";
  const cfg = FORMAT_CONFIG[format];

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">

        <h1 className="text-3xl font-bold mb-1">PDF OCR Extractor</h1>
        <p className="text-gray-400 mb-8">Extract structured JSON from MKT Document</p>

        <div className="mb-6">
          <p className="text-sm text-gray-400 mb-3">Select document format:</p>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(FORMAT_CONFIG) as DocFormat[]).map((key) => (
              <button
                key={key}
                onClick={() => { setFormat(key); reset(); }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  format === key
                    ? "border-blue-500 bg-blue-900/20"
                    : "border-gray-700 bg-gray-900 hover:border-gray-500"
                }`}
              >
                <p className="font-semibold text-white text-sm">{FORMAT_CONFIG[key].label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{FORMAT_CONFIG[key].description}</p>
              </button>
            ))}
          </div>
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f?.type === "application/pdf") setFile(f);
          }}
          className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-xl p-10 text-center cursor-pointer transition-colors mb-6"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          {file
            ? <p className="text-blue-400 font-medium">📄 {file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
            : (
              <div>
                <p className="text-gray-400 mb-1">Drop <span className="text-white font-medium">{cfg.label}</span> PDF here</p>
                <p className="text-gray-600 text-sm">or click to browse</p>
              </div>
            )
          }
        </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={shouldStore}
            onChange={(e) => setShouldStore(e.target.checked)}
            className="accent-blue-500"
          />
          Save to Pinecone after extraction
        </label>
        {status === "converting" && <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mb-4 text-blue-300 text-sm">⏳ Rendering PDF...</div>}
        {status === "processing" && <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4 text-yellow-300 text-sm">🔍 Extracting fields via OpenRouter ({cfg.label})...</div>}
        {status === "error" && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-300 text-sm">❌ {error}</div>}

        <div className="flex gap-3 mb-8">
          <button onClick={handleExtract} disabled={!file || isLoading}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm">
            {isLoading ? "Processing..." : "Extract →"}
          </button>
          {result && <>
            <button onClick={downloadJSON} className="bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm">⬇ Download JSON</button>
            <button onClick={reset} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-2.5 rounded-lg text-sm">Reset</button>
          </>}
        </div>

        {/* ── Results: Samudera BASTB ─────────────── */}
        {result && format === "samudera-bastb" && (
          <SamuderaResult data={result as SamuderaBastb} />
        )}

        {/* ── Results: Kimia Farma SKB ────────────── */}
        {result && format === "kimia-farma-skb" && (
          <KimiaFarmaResult data={result as KimiaFarmaSkb} />
        )}

        {/* ── Results: Kimia Farma Delivery ──────── */}
        {result && format === "kimia-farma-delivery" && (
          <KimiaFarmaDeliveryResult data={result as KimiaFarmaDelivery} />
        )}

        {/* ── Results: Lotte Mart Delivery ───────── */}
        {result && format === "lotte-mart-delivery" && (
          <LotteMartResult data={result as LotteMartDelivery} />
        )}

        {/* ── Results: DBM Cargo Invoice ──────────── */}
        {result && format === "dbm-cargo-invoice" && (
          <DbmCargoResult data={result as DbmCargoInvoice} />
        )}

        {/* Raw JSON */}
        {result && (
          <details className="bg-gray-900 rounded-xl p-4 border border-gray-800 mt-4">
            <summary className="cursor-pointer text-gray-400 text-sm font-medium">View Raw JSON</summary>
            <pre className="mt-4 text-xs text-green-400 overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
          </details>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────
// Samudera BASTB Result View
// ─────────────────────────────────────────────

function SamuderaResult({ data }: { data: SamuderaBastb }) {
  return (
    <div className="space-y-4">
      <Section title="Document Info">
        <Row label="No. Dokumen" value={data.metadata.no_dokumen} />
        <Row label="No. Dok" value={data.metadata.no_dok} />
        <Row label="Revisi" value={data.metadata.revisi} />
      </Section>
      <Section title="Tanggal">
        <Row label="Hari" value={data.header.hari} />
        <Row label="Tanggal" value={`${data.header.tanggal} / ${data.header.bulan} / ${data.header.tahun}`} />
      </Section>
      <Section title="Data Pengiriman">
        <Row label="SKB/DO/PO/SO" value={data.shipment.skb_do_po_so} />
        <Row label="Nama Tujuan" value={data.shipment.nama_tujuan} />
        <Row label="Jumlah Koli" value={data.shipment.jumlah_koli?.toString()} />
        <Row label="Berat (kg)" value={data.shipment.berat_kg?.toString()} />
        <Row label="Volume (cbm)" value={data.shipment.volume_cbm?.toString()} />
        <Row label="Origin" value={data.shipment.origin} />
        <Row label="Moda Transportasi" value={data.shipment.moda_transportasi} />
        <Row label="Nopol / Container" value={data.shipment.nopol_truk_no_container} />
        <Row label="Nomor Segel" value={data.shipment.nomor_segel_seal} />
        <Row label="Supir" value={data.shipment.nama_no_telpon_supir} />
      </Section>
      <Section title="Pelaksanaan Pengiriman">
        <Row label="Jenis" value={data.pelaksanaan_pengiriman.jenis} />
      </Section>
      <Section title="Kondisi Kemasan">
        <Row label="Sesuai Dokumen" value={data.kondisi_kemasan.sesuai_dokumen} />
        <Row label="Keterangan Lain" value={data.kondisi_kemasan.keterangan_lain} />
      </Section>
      <Section title="Tanda Tangan">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Yang Menyerahkan</p>
        <Row label="Tanggal" value={data.signatories.yang_menyerahkan.tanggal} />
        <Row label="Perusahaan" value={data.signatories.yang_menyerahkan.perusahaan} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Transporter</p>
        <Row label="Nama" value={data.signatories.transporter.nama} />
        <Row label="Tanggal" value={data.signatories.transporter.tanggal} />
        <Row label="Perusahaan" value={data.signatories.transporter.perusahaan} />
        <Row label="No. HP" value={data.signatories.transporter.no_handphone} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Penerima</p>
        <Row label="Nama" value={data.signatories.penerima.nama} />
        <Row label="Tanggal" value={data.signatories.penerima.tanggal} />
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────
// Kimia Farma SKB Result View
// ─────────────────────────────────────────────

function KimiaFarmaResult({ data }: { data: KimiaFarmaSkb }) {
  return (
    <div className="space-y-4">
      <Section title="Header">
        <Row label="Tanggal" value={data.header.tanggal} />
        <Row label="Perusahaan" value={data.header.perusahaan} />
        <Row label="NPWP" value={data.header.npwp} />
        <Row label="Licence" value={data.header.licence} />
      </Section>
      <Section title="Receiving Plant">
        <Row label="Nama" value={data.header.receiving_plant.nama} />
        <Row label="Alamat" value={data.header.receiving_plant.alamat} />
        <Row label="Kota" value={data.header.receiving_plant.kota} />
        <Row label="Phone" value={data.header.receiving_plant.phone} />
      </Section>
      <Section title="Supplying Plant">
        <Row label="Nama" value={data.header.supplying_plant.nama} />
        <Row label="Alamat" value={data.header.supplying_plant.alamat} />
        <Row label="Kota" value={data.header.supplying_plant.kota} />
        <Row label="Phone" value={data.header.supplying_plant.phone} />
        <Row label="Fax" value={data.header.supplying_plant.fax} />
      </Section>
      <Section title="Referensi">
        <Row label="SKB No" value={data.referensi.skb_no} />
        <Row label="Driver / No. Mobil" value={data.referensi.driver_no_mobil} />
        <Row label="Fwd Agent" value={data.referensi.fwd_agent} />
      </Section>
      <Section title="Quantities">
        <Row label="Jumlah Koli" value={data.quantities.jumlah_koli?.toString()} />
        <Row label="Jumlah Tonase (KG)" value={data.quantities.jumlah_tonase_kg?.toString()} />
        <Row label="Jumlah Volume (M3)" value={data.quantities.jumlah_volume_m3?.toString()} />
      </Section>
      <Section title={`DO Numbers (${data.do_numbers.length})`}>
        <div className="flex flex-wrap gap-2 mt-1">
          {data.do_numbers.map((no) => (
            <span key={no} className="bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded font-mono">{no}</span>
          ))}
        </div>
      </Section>
      {data.note && (
        <Section title="Note">
          <pre className="text-gray-200 text-sm whitespace-pre-wrap">{data.note}</pre>
        </Section>
      )}
      <Section title="Tanda Tangan">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Received By</p>
        <Row label="Nama" value={data.signatories.received_by.nama} />
        <Row label="Tanggal" value={data.signatories.received_by.tanggal} />
        <Row label="Jabatan" value={data.signatories.received_by.jabatan} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Issued By</p>
        <Row label="Nama" value={data.signatories.issued_by.nama} />
        <Row label="Tanggal" value={data.signatories.issued_by.tanggal} />
        <Row label="Jabatan" value={data.signatories.issued_by.jabatan} />
      </Section>
      {data.tembusan.length > 0 && (
        <Section title="Tembusan">
          {data.tembusan.map((t, i) => (
            <p key={i} className="text-gray-300 text-sm py-0.5">{t}</p>
          ))}
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Kimia Farma Delivery Result View
// ─────────────────────────────────────────────

function KimiaFarmaDeliveryResult({ data }: { data: KimiaFarmaDelivery }) {
  return (
    <div className="space-y-4">
      <Section title="Header">
        <Row label="Actual GI Date" value={data.header.actual_gi_date} />
        <Row label="Date" value={data.header.date} />
        <Row label="Perusahaan" value={data.header.perusahaan} />
        <Row label="NPWP" value={data.header.npwp} />
        <Row label="Licence" value={data.header.licence} />
      </Section>
      <Section title="Receiving Plant">
        <Row label="Nama" value={data.header.receiving_plant.nama} />
        <Row label="Alamat" value={data.header.receiving_plant.alamat} />
        <Row label="Kota" value={data.header.receiving_plant.kota} />
        <Row label="Phone" value={data.header.receiving_plant.phone} />
      </Section>
      <Section title="Supplying Plant">
        <Row label="Nama" value={data.header.supplying_plant.nama} />
        <Row label="Alamat" value={data.header.supplying_plant.alamat} />
        <Row label="Kota" value={data.header.supplying_plant.kota} />
        <Row label="Phone" value={data.header.supplying_plant.phone} />
        <Row label="Fax" value={data.header.supplying_plant.fax} />
      </Section>
      <Section title="Referensi">
        <Row label="DO No / Via" value={data.referensi.do_no_via} />
        <Row label="Driver / No. Mobil" value={data.referensi.driver_no_mobil} />
        <Row label="Fwd Agent" value={data.referensi.fwd_agent} />
      </Section>

      {/* Materials Table */}
      <Section title={`Materials (${data.materials.length} item${data.materials.length !== 1 ? "s" : ""})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-2 pr-3">SO / PO / Material</th>
                <th className="text-right text-gray-400 py-2 px-2">Qty</th>
                <th className="text-left text-gray-400 py-2 px-2">Batch/EDI/DOM</th>
                <th className="text-right text-gray-400 py-2 px-2">GW</th>
                <th className="text-right text-gray-400 py-2 px-2">Karton</th>
                <th className="text-right text-gray-400 py-2 px-2">Dus</th>
                <th className="text-right text-gray-400 py-2 px-2">Eceran</th>
                <th className="text-right text-gray-400 py-2">Volume</th>
              </tr>
            </thead>
            <tbody>
              {data.materials.map((m, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 pr-3">
                    <p className="text-gray-200 font-medium">{m.material_name}</p>
                    <p className="text-gray-500">SO: {m.so_no} | PO: {m.po_no}</p>
                    <p className="text-gray-500">Code: {m.material_code}</p>
                  </td>
                  <td className="text-right text-gray-200 py-2 px-2">{m.quantity_uom}</td>
                  <td className="text-gray-300 py-2 px-2 font-mono">{m.batch_edi_dom}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{m.gw_uom}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{m.karton}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{m.dus}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{m.eceran}</td>
                  <td className="text-right text-gray-200 py-2">{m.volume}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-gray-800/50 font-semibold">
                <td className="py-2 pr-3 text-gray-300">Total</td>
                <td className="py-2 px-2"></td>
                <td className="py-2 px-2"></td>
                <td className="text-right text-gray-200 py-2 px-2">{data.total.gw_uom}</td>
                <td className="text-right text-gray-200 py-2 px-2">{data.total.karton}</td>
                <td className="text-right text-gray-200 py-2 px-2">{data.total.dus}</td>
                <td className="text-right text-gray-200 py-2 px-2">{data.total.eceran}</td>
                <td className="text-right text-gray-200 py-2">{data.total.volume}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {data.note && (
        <Section title="Note">
          <pre className="text-gray-200 text-sm whitespace-pre-wrap">{data.note}</pre>
        </Section>
      )}

      <Section title="Tanda Tangan">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Received By</p>
        <Row label="Nama" value={data.signatories.received_by.nama} />
        <Row label="Jabatan" value={data.signatories.received_by.jabatan} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Apoteker Penanggung Jawab</p>
        <Row label="Nama" value={data.signatories.apoteker_penanggung_jawab.nama} />
        <Row label="No. SIPA" value={data.signatories.apoteker_penanggung_jawab.no_sipa} />
        <Row label="Jabatan" value={data.signatories.apoteker_penanggung_jawab.jabatan} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Issued By</p>
        <Row label="Nama" value={data.signatories.issued_by.nama} />
        <Row label="Tanggal" value={data.signatories.issued_by.tanggal} />
        <Row label="Jabatan" value={data.signatories.issued_by.jabatan} />
      </Section>

      {data.tembusan.length > 0 && (
        <Section title="Tembusan">
          {data.tembusan.map((t, i) => (
            <p key={i} className="text-gray-300 text-sm py-0.5">{t}</p>
          ))}
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Lotte Mart Delivery Result View
// ─────────────────────────────────────────────

function LotteMartResult({ data }: { data: LotteMartDelivery }) {
  return (
    <div className="space-y-4">
      <Section title="Header">
        <Row label="No. Surat Jalan" value={data.header.document_no} />
        <Row label="Tanggal" value={data.header.date} />
        <Row label="Store" value={`${data.header.store.name} (${data.header.store.code})`} />
        <Row label="Alamat Store" value={data.header.store.address} />
        <Row label="Sender" value={data.header.sender.name} />
      </Section>
      <Section title="Referensi">
        <Row label="No. Polisi" value={data.references.vehicle_no} />
        <Row label="Supir" value={data.references.driver_name} />
        <Row label="Mostrans Trip ID" value={data.references.id_trip_mostrans} />
        <Row label="Mostrans Order ID" value={data.references.id_order} />
        <Row label="Resi / AWB" value={data.references.resi_number} />
        <Row label="Origin" value={data.references.origin} />
        <Row label="Destination" value={data.references.destination} />
      </Section>

      {/* Items Table */}
      <Section title={`Items (${data.items.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-2 pr-3">Item / Code</th>
                <th className="text-right text-gray-400 py-2 px-2">Ordered</th>
                <th className="text-right text-gray-400 py-2 px-2">Delivered</th>
                <th className="text-left text-gray-400 py-2 px-2">Unit</th>
                <th className="text-left text-gray-400 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 pr-3">
                    <p className="text-gray-200 font-medium">{item.description}</p>
                    <p className="text-gray-500">{item.item_code}</p>
                  </td>
                  <td className="text-right text-gray-200 py-2 px-2">{item.quantity_ordered}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{item.quantity_delivered}</td>
                  <td className="text-gray-300 py-2 px-2">{item.uom}</td>
                  <td className="text-gray-400 py-2">{item.remarks}</td>
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-gray-800/50 font-semibold">
                <td className="py-2 pr-3 text-gray-300">Total</td>
                <td className="py-2 px-2"></td>
                <td className="text-right text-gray-200 py-2 px-2">{data.totals.total_quantity}</td>
                <td className="py-2 px-2"></td>
                <td className="py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {data.note && (
        <Section title="Note">
          <pre className="text-gray-200 text-sm whitespace-pre-wrap">{data.note}</pre>
        </Section>
      )}

      <Section title="Tanda Tangan">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Prepared By</p>
        <Row label="Nama" value={data.signatories.prepared_by.nama} />
        <Row label="Tanggal" value={data.signatories.prepared_by.tanggal} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Driver</p>
        <Row label="Nama" value={data.signatories.driver.nama} />
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-3 mb-2">Received By</p>
        <Row label="Nama" value={data.signatories.received_by.nama} />
        <Row label="Tanggal" value={data.signatories.received_by.tanggal} />
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────
// DBM Cargo Invoice Result View
// ─────────────────────────────────────────────

function DbmCargoResult({ data }: { data: DbmCargoInvoice }) {
  return (
    <div className="space-y-4">
      <Section title="Header Invoice">
        <Row label="No. Invoice" value={data.header.no_invoice} />
        <Row label="Tanggal" value={data.header.tanggal} />
        <Row label="Jatuh Tempo" value={data.header.jatuh_tempo} />
      </Section>
      <Section title="Penerima (TO)">
        <Row label="Nama" value={data.to.nama} />
        <Row label="Alamat" value={data.to.alamat} />
      </Section>
      <Section title="Info Transfer">
        <Row label="Perusahaan" value={data.transfer.nama_perusahaan} />
        <Row label="No. Rekening" value={data.transfer.no_rekening} />
        <Row label="Bank" value={data.transfer.nama_bank} />
      </Section>
      <Section title={`Items (${data.items.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 py-2 pr-3">Tgl / AWB</th>
                <th className="text-left text-gray-400 py-2 px-2">Jenis</th>
                <th className="text-left text-gray-400 py-2 px-2">Dest</th>
                <th className="text-right text-gray-400 py-2 px-2">KG</th>
                <th className="text-right text-gray-400 py-2 px-2">Barang</th>
                <th className="text-right text-gray-400 py-2 px-2">Packing</th>
                <th className="text-right text-gray-400 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-2 pr-3">
                    <p className="text-gray-200 font-medium">{item.tanggal}</p>
                    <p className="text-gray-500 font-mono">{item.no_awb}</p>
                  </td>
                  <td className="text-gray-300 py-2 px-2">{item.jenis}</td>
                  <td className="text-gray-300 py-2 px-2">{item.dest}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{item.barang.kg}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{item.barang.jumlah?.toLocaleString("id-ID")}</td>
                  <td className="text-right text-gray-200 py-2 px-2">{item.packing.jumlah?.toLocaleString("id-ID")}</td>
                  <td className="text-right text-gray-200 py-2">{item.total?.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Summary">
        <Row label="Gross Barang" value={data.summary.gross_barang?.toLocaleString("id-ID")} />
        <Row label="Gross Packing" value={data.summary.gross_packing?.toLocaleString("id-ID")} />
        <Row label="Gross Total" value={data.summary.gross_total?.toLocaleString("id-ID")} />
        <Row label="Discount" value={data.summary.discount?.toLocaleString("id-ID")} />
        <Row label="Netto" value={data.summary.netto?.toLocaleString("id-ID")} />
        <Row label={`PPN ${data.summary.ppn_persen}%`} value={data.summary.ppn_nominal?.toLocaleString("id-ID")} />
        <Row label="Materai" value={data.summary.materai?.toLocaleString("id-ID")} />
        <Row label="Total" value={data.summary.total?.toLocaleString("id-ID")} />
      </Section>
      {data.terbilang && (
        <Section title="Terbilang">
          <p className="text-gray-200 text-sm italic">{data.terbilang}</p>
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-800 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-gray-100 text-sm font-medium text-right max-w-[60%]">
        {value ?? <span className="text-gray-600 italic">—</span>}
      </span>
    </div>
  );
}