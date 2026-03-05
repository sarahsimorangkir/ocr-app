import { getPineconeIndex } from "@/lib/pinecone";
import { embedText } from "@/lib/embed";
import { SamuderaBastb } from "@/types/samudera-bastb";
import { KimiaFarmaSkb } from "@/types/kimia-farma-skb";
import { KimiaFarmaDelivery } from "@/types/kimia-farma-delivery";
import { LotteMartDelivery } from "@/types/lotte-mart-delivery";
import { v4 as uuidv4 } from "uuid";

type DocFormat = "samudera-bastb" | "kimia-farma-skb" | "kimia-farma-delivery" | "lotte-mart-delivery";
type DocData = SamuderaBastb | KimiaFarmaSkb | KimiaFarmaDelivery | LotteMartDelivery;

// Convert each doc format into a plain searchable string
function docToText(format: DocFormat, data: DocData): string {
  if (format === "samudera-bastb") {
    const d = data as SamuderaBastb;
    return [
      `Berita Acara Serah Terima Barang`,
      `No Dokumen: ${d.metadata.no_dokumen}`,
      `Tanggal: ${d.header.hari} ${d.header.tanggal}/${d.header.bulan}/${d.header.tahun}`,
      `SKB/DO/PO/SO: ${d.shipment.skb_do_po_so}`,
      `Tujuan: ${d.shipment.nama_tujuan}`,
      `Jumlah Koli: ${d.shipment.jumlah_koli}`,
      `Berat: ${d.shipment.berat_kg} kg`,
      `Volume: ${d.shipment.volume_cbm} cbm`,
      `Origin: ${d.shipment.origin}`,
      `Nopol: ${d.shipment.nopol_truk_no_container}`,
      `Segel: ${d.shipment.nomor_segel_seal}`,
      `Supir: ${d.shipment.nama_no_telpon_supir}`,
      `Transporter: ${d.signatories.transporter.perusahaan}`,
      `Penerima: ${d.signatories.penerima.nama}`,
    ].filter(Boolean).join("\n");
  }

  if (format === "kimia-farma-skb") {
    const d = data as KimiaFarmaSkb;
    return [
      `Surat Kirim Barang`,
      `Tanggal: ${d.header.tanggal}`,
      `SKB No: ${d.referensi.skb_no}`,
      `Receiving Plant: ${d.header.receiving_plant.nama}`,
      `Supplying Plant: ${d.header.supplying_plant.nama}`,
      `Driver: ${d.referensi.driver_no_mobil}`,
      `Fwd Agent: ${d.referensi.fwd_agent}`,
      `Jumlah Koli: ${d.quantities.jumlah_koli}`,
      `Tonase: ${d.quantities.jumlah_tonase_kg} kg`,
      `Volume: ${d.quantities.jumlah_volume_m3} m3`,
      `DO Numbers: ${d.do_numbers.join(", ")}`,
      `Note: ${d.note}`,
    ].filter(Boolean).join("\n");
  }

  if (format === "kimia-farma-delivery") {
    const d = data as KimiaFarmaDelivery;
    const materials = d.materials.map(m =>
      `${m.material_name} (SO: ${m.so_no}, PO: ${m.po_no}, Qty: ${m.quantity_uom}, Batch: ${m.batch_edi_dom})`
    ).join("; ");
    return [
      `Delivery Local`,
      `Date: ${d.header.date}`,
      `DO No: ${d.referensi.do_no_via}`,
      `Receiving Plant: ${d.header.receiving_plant.nama}`,
      `Supplying Plant: ${d.header.supplying_plant.nama}`,
      `Driver: ${d.referensi.driver_no_mobil}`,
      `Fwd Agent: ${d.referensi.fwd_agent}`,
      `Materials: ${materials}`,
      `Total GW: ${d.total.gw_uom}`,
      `Total Volume: ${d.total.volume}`,
      `Note: ${d.note}`,
      `Apoteker: ${d.signatories.apoteker_penanggung_jawab.nama}`,
    ].filter(Boolean).join("\n");
  }

  if (format === "lotte-mart-delivery") {
    const d = data as LotteMartDelivery;
    const items = d.items.map(i =>
      `${i.description} (Code: ${i.item_code}, Qty: ${i.quantity_delivered} ${i.uom})`
    ).join("; ");
    return [
      `Lotte Mart Delivery Note`,
      `Document No: ${d.header.document_no}`,
      `Date: ${d.header.date}`,
      `Store: ${d.header.store.name} (${d.header.store.code})`,
      `PO No: ${d.references.po_no}`,
      `SO No: ${d.references.so_no}`,
      `Vehicle: ${d.references.vehicle_no}`,
      `Driver: ${d.references.driver_name}`,
      `Items: ${items}`,
      `Total Quantity: ${d.totals.total_quantity}`,
      `Note: ${d.note}`,
    ].filter(Boolean).join("\n");
  }

  return JSON.stringify(data);
}

// Flatten metadata for Pinecone (only primitive values allowed)
function docToMetadata(format: DocFormat, data: DocData): Record<string, string | number | boolean> {
  const base = { format, stored_at: new Date().toISOString() };

  if (format === "samudera-bastb") {
    const d = data as SamuderaBastb;
    return {
      ...base,
      no_dokumen: d.metadata.no_dokumen ?? "",
      tanggal: `${d.header.tanggal}/${d.header.bulan}/${d.header.tahun}`,
      nama_tujuan: d.shipment.nama_tujuan ?? "",
      skb_do_po_so: d.shipment.skb_do_po_so ?? "",
      jumlah_koli: d.shipment.jumlah_koli ?? 0,
      berat_kg: d.shipment.berat_kg ?? 0,
      nopol: d.shipment.nopol_truk_no_container ?? "",
      transporter: d.signatories.transporter.perusahaan ?? "",
    };
  }

  if (format === "kimia-farma-skb") {
    const d = data as KimiaFarmaSkb;
    return {
      ...base,
      tanggal: d.header.tanggal ?? "",
      skb_no: d.referensi.skb_no ?? "",
      receiving_plant: d.header.receiving_plant.nama ?? "",
      jumlah_koli: d.quantities.jumlah_koli ?? 0,
      tonase_kg: d.quantities.jumlah_tonase_kg ?? 0,
      driver: d.referensi.driver_no_mobil ?? "",
      do_count: d.do_numbers.length,
    };
  }

  if (format === "kimia-farma-delivery") {
    const d = data as KimiaFarmaDelivery;
    return {
      ...base,
      date: d.header.date ?? "",
      do_no: d.referensi.do_no_via ?? "",
      receiving_plant: d.header.receiving_plant.nama ?? "",
      driver: d.referensi.driver_no_mobil ?? "",
      material_count: d.materials.length,
      apoteker: d.signatories.apoteker_penanggung_jawab.nama ?? "",
    };
  }

  if (format === "lotte-mart-delivery") {
    const d = data as LotteMartDelivery;
    return {
      ...base,
      document_no: d.header.document_no ?? "",
      date: d.header.date ?? "",
      store_name: d.header.store.name ?? "",
      po_no: d.references.po_no ?? "",
      total_quantity: d.totals.total_quantity ?? 0,
      item_count: d.items.length,
    };
  }

  return base;
}

// Main store function
export async function storeDocument(
  format: DocFormat,
  data: DocData,
  documentId?: string
): Promise<string> {
  const index = getPineconeIndex();

  const text = docToText(format, data);
  console.log("1. Text to embed:", text.slice(0, 100));

  const vector = await embedText(text);
  console.log("2. Vector length:", vector.length);

  const id = documentId ?? `${format}-${uuidv4()}`;
  console.log("3. Document ID:", id);

  const metadata = docToMetadata(format, data);
  console.log("4. Metadata:", metadata);

  try {
    const upsertResult = await index.upsert({
      records: [{
        id,
        values: vector,
        metadata,
      }]
    });
    console.log("5. Upsert result:", JSON.stringify(upsertResult));
  } catch (err) {
    console.error("5. Upsert FAILED:", err);
    throw err;
  }

  const stats = await getPineconeIndex().describeIndexStats();
  console.log("6. Total vectors after upsert:", stats.totalRecordCount);

  return id;
}