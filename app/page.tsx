"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Printer, RefreshCw, Truck, Plus, Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase"; // adjust path as needed

interface Client {
  id: number;
  client_name: string;
  short_name?: string;
  address?: string;
  vat_number?: string;
  bank_name?: string;
  iban?: string;
  swift?: string;
}

interface CompanySettings {
  id: number;
  name: string;
  address?: string;
  vat?: string;
  bank?: string;
  iban?: string;
  swift?: string;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  sender: Partial<CompanySettings>;
  client: {
    name: string;
    address: string;
    vat: string;
    bank: string;
    iban: string;
    swift: string;
  };
  trip: {
    plate: string;
    orderRef: string;
    loadFull: string;
    unloadFull: string;
    routeTitle: string;
  };
  price: string | number;
  vatRate: string;
  currency: string;
}

// MOCK TEST DATA
const MOCK_TRIPS: string[][] = [
  [
    "Exp",
    "Speed NCA",
    "KRUG",
    "CB6034CX/KH0I",
    "26/3 CZ",
    "Rakovnik",
    "31/3 GR",
    "Aspropyrgos",
    "€3",
    "0",
    "",
    "€3",
    "0",
    "FALSE",
  ],
  [
    "Exp",
    "Nutri",
    "",
    "CB6034CX/KH0I",
    "27/4 GR",
    "Athens",
    "29/4 CZ",
    "Lipnik",
    "€3",
    "300",
    "€250",
    "€3",
    "50",
    "FALSE",
  ],
];

export default function InvoiceApp() {
  const [activeTab, setActiveTab] = useState<
    "invoices" | "clients" | "settings"
  >("invoices");
  const [sheetData, setSheetData] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [myCompany, setMyCompany] = useState<Partial<CompanySettings>>({
    name: '"VENTO TRANSPORT" OOD',
    address: '"Otec Paisii n. 51 2850 Petrich, Bulgaria',
    vat: "BG207324277",
    bank: "Unicredit Bulbank",
    iban: "BG23UNCR70001526680716",
    swift: "UNCRBGSF",
  });
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [editingClient, setEditingClient] = useState<Partial<Client> | null>(
    null,
  );
  const componentRef = useRef<HTMLDivElement>(null);

  // ADD THIS HELPER FUNCTION
  const formatDateWithYear = (dateStr: string) => {
    if (!dateStr) return "";

    const clean = dateStr.trim();

    // Match "DD/MM", "DD.MM", or "DD-MM" format
    const match = clean.match(/^(\d{1,2})[./-](\d{1,2})$/);

    if (match) {
      const day = match[1].padStart(2, "0");
      const month = match[2].padStart(2, "0");
      const year = new Date().getFullYear();

      return `${day}.${month}.${year}`;
    }

    return clean;
  };

  // 1. FETCH CLIENTS ON MOUNT
  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients:", error);
      } else if (data) {
        setClients(data as Client[]);
      }
    };

    fetchClients();
  }, []);

  const loadSheetData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sheets");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setSheetData(data.data || []);
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-10);
    return `:${timestamp}`;
  };

  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const toNumber = (v: any) => {
    const s = String(v ?? "")
      .replace(/[^\d.,-]/g, "")
      .replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const selectTrip = (trip: any) => {
    console.log("Trip clicked:", trip);
    console.log("Income value:", trip.income);

    const clientShortName = trip.client;
    const matchedClient = clients.find(
      (c) =>
        c.short_name?.toLowerCase() === clientShortName.toLowerCase() ||
        c.client_name?.toLowerCase().includes(clientShortName.toLowerCase()),
    );

    // FORMAT DATES WITH YEAR
    const fLoadDate = formatDateWithYear(trip.loadDate);
    const fUnloadDate = formatDateWithYear(trip.unloadDate);

    const loadLocation =
      `${fLoadDate} ${trip.loadCountry || ""} ${trip.loadCity || ""}`.trim();
    const unloadLocation =
      `${fUnloadDate} ${trip.unloadCountry || ""} ${trip.unloadCity || ""}`.trim();
    const plate = trip.plates;
    const orderRef = trip.orderNumber;
    const routeTitle = `${trip.loadCity || "?"}, ${trip.loadCountry || "?"} - ${trip.unloadCity || "?"}, ${trip.unloadCountry || "?"}`;

    setInvoiceData({
      invoiceNumber: generateInvoiceNumber(),
      date: getTodayDate(),
      sender: { ...myCompany },
      client: {
        name: matchedClient?.client_name || clientShortName || "Unknown Client",
        address: matchedClient?.address || "",
        vat: matchedClient?.vat_number || "",
        bank: matchedClient?.bank_name || "",
        iban: matchedClient?.iban || "",
        swift: matchedClient?.swift || "",
      },
      trip: {
        plate,
        orderRef,
        loadFull: loadLocation,
        unloadFull: unloadLocation,
        routeTitle,
      },
      price: toNumber(trip.income),
      vatRate: 0,
      currency: "eur",
    });
  };

  const handleEdit = (
    section: "client" | "sender" | "trip" | "root",
    field: string,
    value: string,
  ) => {
    if (!invoiceData) return;

    setInvoiceData((prev: any) => {
      if (!prev) return prev;
      if (section === "root") {
        return { ...prev, [field]: value };
      }
      return {
        ...prev,
        [section]: { ...prev[section], [field]: value },
      };
    });
  };

  // --- FIXED: SIMPLE NATIVE PRINT ---
  const handlePrint = () => {
    window.print();
  };

  const totals = useMemo(() => {
    if (!invoiceData) return { base: "0.00", vat: "0.00", total: "0.00" };
    const base = parseFloat(invoiceData.price.toString()) || 0;
    const rate = parseFloat(invoiceData.vatRate) || 0;
    const vatAmount = (base * rate) / 100;
    const total = base + vatAmount;
    return {
      base: base.toFixed(2),
      vat: vatAmount.toFixed(2),
      total: total.toFixed(2),
    };
  }, [invoiceData]);

  const inputClass =
    "border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:bg-yellow-50 px-1 py-0.5 rounded w-full";

  const addClient = () => {
    setEditingClient({
      client_name: "",
      short_name: "",
      address: "",
      vat_number: "",
      bank_name: "",
      iban: "",
      swift: "",
    });
  };

  const saveClient = async () => {
    if (!editingClient?.client_name) {
      alert("Client name is required");
      return;
    }

    try {
      const clientData: any = {
        client_name: editingClient.client_name,
        short_name: editingClient.short_name,
        address: editingClient.address,
        vat_number: editingClient.vat_number,
        bank_name: editingClient.bank_name,
        iban: editingClient.iban,
        swift: editingClient.swift,
      };

      // Only include ID if it's an existing client (update)
      if (editingClient.id) {
        clientData.id = editingClient.id;
      }

      const { data, error } = await supabase
        .from("clients")
        .upsert(clientData)
        .select();

      if (error) {
        alert("Error saving: " + error.message);
        return;
      }

      if (data && data.length > 0) {
        setClients((prev) => {
          if (editingClient.id) {
            // Update existing
            return prev.map((c) =>
              c.id === editingClient.id ? (data[0] as Client) : c,
            );
          }
          // Add new
          return [data[0] as Client, ...prev];
        });
        setEditingClient(null);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save client");
    }
  };

  const deleteClient = async (id: number) => {
    if (!confirm("Delete this client?")) return;

    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);

      if (error) {
        alert("Error deleting: " + error.message);
        return;
      }

      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete client");
    }
  };

  const editClient = (client: Client) => {
    setEditingClient({ ...client });
  };

  return (
    <>
      <style jsx global>{`
        /* --- FIXED: PRINT STYLING --- */
        @media print {
          /* Hide everything by default */
          body * {
            visibility: hidden;
          }

          /* Show ONLY the invoice area and its children */
          #invoice-print-area,
          #invoice-print-area * {
            visibility: visible;
          }

          /* Position the invoice at the very top-left of the paper */
          #invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px; /* Optional padding for paper edge */
          }

          /* Reset page margins */
          @page {
            size: A4;
            margin: 0;
          }

          /* Hide scrollbars and backgrounds */
          body,
          html {
            background: white;
            height: 100%;
            overflow: hidden;
          }

          /* Remove input borders and highlights */
          input,
          textarea {
            border: none !important;
            outline: none !important;
            background: transparent !important;
            -webkit-appearance: none !important;
          }
        }

        /* Yellow highlights ONLY on screen */
        @media screen {
          input:focus,
          textarea:focus {
            background: #fef9c3 !important;
            outline: 1px solid #fbbf24 !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10 shadow-sm print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Invoice Generator
                </h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "invoices"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setActiveTab("clients")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "clients"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Clients
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === "settings"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === "invoices" && (
            <div className="flex gap-6 h-[calc(100vh-140px)]">
              {/* Sidebar */}
              <div className="w-80 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col print:hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-900 mb-3">
                    Available Trips
                  </h2>
                  <button
                    onClick={loadSheetData}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Load Trips
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {sheetData.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      👉 Click button above to load trips
                    </div>
                  ) : (
                    sheetData.map((trip: any, idx) => {
                      const clientName = trip.client || "Unknown";
                      const loadLocation = trip.loadCity || "?";
                      const unloadLocation = trip.unloadCity || "?";
                      const diff = trip.income || "0";
                      const orderRef = trip.orderNumber || "";

                      return (
                        <button
                          key={idx}
                          onClick={() => selectTrip(trip)}
                          className="w-full p-3 border-b hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="font-medium text-gray-900 text-sm mb-1">
                            {clientName}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            {loadLocation} → {unloadLocation}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">#{orderRef}</span>
                            <span className="font-semibold text-green-600">
                              {diff}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-auto">
                {!invoiceData ? (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">
                        Select a trip from the left to generate invoice
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8">
                    <div className="mb-4 flex justify-end print:hidden">
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <Printer className="w-4 h-4" />
                        Print / Save PDF
                      </button>
                    </div>

                    {/* Invoice Document - ADDED ID FOR PRINTING */}
                    <div
                      id="invoice-print-area"
                      ref={componentRef}
                      className="invoice-container bg-white max-w-[21cm] mx-auto"
                      style={{
                        fontFamily: "Arial, sans-serif",
                        fontSize: "11px",
                        lineHeight: "1.4",
                      }}
                    >
                      {/* Logo - THIS WILL NOW PRINT EXACTLY 80PX */}
                      <div className="mb-6">
                        <img
                          src="/black.png"
                          alt="VENTO"
                          style={{ height: "80px", width: "auto" }}
                        />
                      </div>

                      {/* Company Name */}
                      <div className="text-center mb-4">
                        <h1
                          className="text-3xl font-bold tracking-wide mb-3"
                          style={{ letterSpacing: "0.05em" }}
                        >
                          <input
                            type="text"
                            value={invoiceData.sender.name || ""}
                            onChange={(e) =>
                              handleEdit("sender", "name", e.target.value)
                            }
                            className={inputClass}
                            style={{
                              fontSize: "24px",
                              fontWeight: "bold",
                              textAlign: "center",
                            }}
                          />
                        </h1>
                        <input
                          type="text"
                          value={invoiceData.sender.address || ""}
                          onChange={(e) =>
                            handleEdit("sender", "address", e.target.value)
                          }
                          className={inputClass}
                          style={{ fontSize: "11px", textAlign: "center" }}
                        />
                      </div>

                      {/* Horizontal Line */}
                      <div
                        className="my-6"
                        style={{
                          borderTop: "2px solid #000",
                          marginTop: "20px",
                          marginBottom: "20px",
                        }}
                      ></div>

                      {/* Invoice Details Grid */}
                      <div className="grid grid-cols-2 gap-8 mb-6">
                        {/* Left: TO */}
                        <div>
                          <div
                            className="font-bold mb-4"
                            style={{ fontSize: "13px" }}
                          >
                            TO
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={invoiceData.client.name}
                              onChange={(e) =>
                                handleEdit("client", "name", e.target.value)
                              }
                              className={inputClass}
                              style={{ fontSize: "11px", fontWeight: "500" }}
                            />
                            <input
                              type="text"
                              value={invoiceData.client.address}
                              onChange={(e) =>
                                handleEdit("client", "address", e.target.value)
                              }
                              className={inputClass}
                              style={{ fontSize: "11px" }}
                            />
                            <input
                              type="text"
                              value={invoiceData.client.vat}
                              onChange={(e) =>
                                handleEdit("client", "vat", e.target.value)
                              }
                              className={inputClass}
                              style={{ fontSize: "11px" }}
                            />
                          </div>
                        </div>

                        {/* Right: Invoice Info */}
                        <div className="text-right space-y-2">
                          <div className="flex justify-between">
                            <span style={{ fontSize: "11px" }}>
                              INVOICE NO.
                            </span>
                            <input
                              type="text"
                              value={invoiceData.invoiceNumber}
                              onChange={(e) =>
                                handleEdit(
                                  "root",
                                  "invoiceNumber",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                              style={{
                                fontSize: "11px",
                                textAlign: "right",
                                width: "150px",
                              }}
                            />
                          </div>
                          <div className="flex justify-between">
                            <span style={{ fontSize: "11px" }}>DATE</span>
                            <input
                              type="text"
                              value={invoiceData.date}
                              onChange={(e) =>
                                handleEdit("root", "date", e.target.value)
                              }
                              className={inputClass}
                              style={{
                                fontSize: "11px",
                                textAlign: "right",
                                width: "150px",
                              }}
                            />
                          </div>
                          <div className="flex justify-between">
                            <span style={{ fontSize: "11px" }}>VAT</span>
                            <input
                              type="text"
                              value={invoiceData.sender.vat || ""}
                              onChange={(e) =>
                                handleEdit("sender", "vat", e.target.value)
                              }
                              className={inputClass}
                              style={{
                                fontSize: "11px",
                                textAlign: "right",
                                width: "150px",
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Invoice/Фактура Title */}
                      <div
                        className="text-right mb-8 mt-6"
                        style={{ fontSize: "32px", fontWeight: "400" }}
                      >
                        Invoice/Фактура
                      </div>

                      {/* Horizontal Line */}
                      <div
                        className="my-6"
                        style={{ borderTop: "2px solid #000" }}
                      ></div>

                      {/* Table */}
                      {/* Table */}
                      <table
                        style={{
                          width: "100%",
                          marginBottom: "24px",
                          borderCollapse: "collapse",
                        }}
                      >
                        <thead>
                          <tr style={{ borderBottom: "2px solid #000" }}>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "8px 0",
                                fontSize: "11px",
                                fontWeight: "bold",
                              }}
                            >
                              TRAVEL DESCRIPTION
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: "8px 12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                width: "100px",
                              }}
                            >
                              Price
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: "8px 12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                width: "80px",
                              }}
                            >
                              VAT %
                            </th>
                            <th
                              style={{
                                textAlign: "right",
                                padding: "8px 12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                width: "100px",
                              }}
                            >
                              TOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td
                              style={{
                                padding: "12px 0",
                                fontSize: "10px",
                                verticalAlign: "top",
                              }}
                            >
                              <input
                                type="text"
                                value={invoiceData.trip.routeTitle}
                                onChange={(e) =>
                                  handleEdit(
                                    "trip",
                                    "routeTitle",
                                    e.target.value,
                                  )
                                }
                                className={inputClass}
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  marginBottom: "6px",
                                }}
                              />
                              <div style={{ fontSize: "10px", color: "#555" }}>
                                <div style={{ marginBottom: "4px" }}>
                                  <span>Loading date: </span>
                                  <input
                                    type="text"
                                    value={invoiceData.trip.loadFull}
                                    onChange={(e) =>
                                      handleEdit(
                                        "trip",
                                        "loadFull",
                                        e.target.value,
                                      )
                                    }
                                    className={inputClass}
                                    style={{
                                      fontSize: "10px",
                                      display: "inline-block",
                                      width: "200px",
                                      marginLeft: "4px",
                                    }}
                                  />
                                </div>
                                <div style={{ marginBottom: "4px" }}>
                                  <span>Delivery date: </span>
                                  <input
                                    type="text"
                                    value={invoiceData.trip.unloadFull}
                                    onChange={(e) =>
                                      handleEdit(
                                        "trip",
                                        "unloadFull",
                                        e.target.value,
                                      )
                                    }
                                    className={inputClass}
                                    style={{
                                      fontSize: "10px",
                                      display: "inline-block",
                                      width: "200px",
                                      marginLeft: "4px",
                                    }}
                                  />
                                </div>
                                <div style={{ marginBottom: "4px" }}>
                                  <span>Plates: </span>
                                  <input
                                    type="text"
                                    value={invoiceData.trip.plate}
                                    onChange={(e) =>
                                      handleEdit(
                                        "trip",
                                        "plate",
                                        e.target.value,
                                      )
                                    }
                                    className={inputClass}
                                    style={{
                                      fontSize: "10px",
                                      display: "inline-block",
                                      width: "150px",
                                      marginLeft: "4px",
                                    }}
                                  />
                                </div>
                                <div>
                                  <span>order: </span>
                                  <input
                                    type="text"
                                    value={invoiceData.trip.orderRef}
                                    onChange={(e) =>
                                      handleEdit(
                                        "trip",
                                        "orderRef",
                                        e.target.value,
                                      )
                                    }
                                    className={inputClass}
                                    style={{
                                      fontSize: "10px",
                                      display: "inline-block",
                                      width: "120px",
                                      marginLeft: "4px",
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "11px",
                                textAlign: "right",
                                verticalAlign: "top",
                              }}
                            >
                              <input
                                type="number"
                                value={invoiceData.price}
                                onChange={(e) =>
                                  handleEdit("root", "price", e.target.value)
                                }
                                className={inputClass}
                                style={{
                                  fontSize: "11px",
                                  textAlign: "right",
                                  width: "100%",
                                  color: "#000", // ← ADD THIS to make sure text is visible
                                }}
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontSize: "11px",
                                textAlign: "right",
                                verticalAlign: "top",
                              }}
                            >
                              <input
                                type="number"
                                value={invoiceData.vatRate}
                                onChange={(e) =>
                                  handleEdit("root", "vatRate", e.target.value)
                                }
                                className={inputClass}
                                style={{
                                  fontSize: "11px",
                                  textAlign: "right",
                                  width: "100%",
                                }}
                                min="0"
                                max="100"
                                step="0.1"
                              />
                            </td>
                            <td
                              style={{
                                padding: "12px 12px 12px 0",
                                fontSize: "11px",
                                fontWeight: "600",
                                textAlign: "right",
                                verticalAlign: "top",
                              }}
                            >
                              {totals.total}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* VAT Exemption Note */}
                      

                      {/* Bank Details */}
                      <div className="mb-6" style={{ fontSize: "10px" }}>
                        <div className="mb-2">
                          <span className="font-semibold">Iban: </span>
                          <input
                            type="text"
                            value={invoiceData.sender.iban || ""}
                            onChange={(e) =>
                              handleEdit("sender", "iban", e.target.value)
                            }
                            className={inputClass}
                            style={{
                              fontSize: "10px",
                              display: "inline-block",
                              width: "300px",
                            }}
                          />
                        </div>
                        <div className="mb-2">
                          <span className="font-semibold">SWIFT: </span>
                          <input
                            type="text"
                            value={invoiceData.sender.swift || ""}
                            onChange={(e) =>
                              handleEdit("sender", "swift", e.target.value)
                            }
                            className={inputClass}
                            style={{
                              fontSize: "10px",
                              display: "inline-block",
                              width: "150px",
                            }}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={invoiceData.sender.bank || ""}
                            onChange={(e) =>
                              handleEdit("sender", "bank", e.target.value)
                            }
                            className={inputClass}
                            style={{ fontSize: "10px" }}
                          />
                        </div>
                      </div>

                      {/* Payment Terms */}
                      <div style={{ fontSize: "10px" }}>payment 45 days</div>

                      {/* Total Due */}
                      <div
                        className="text-right mt-8"
                        style={{ fontSize: "12px", fontWeight: "bold" }}
                      >
                        TOTAL DUE {totals.total} eur
                      </div>

                      {/* Footer */}
                      <div
                        className="text-center mt-8 pt-4"
                        style={{
                          fontSize: "9px",
                          color: "#666",
                          borderTop: "1px solid #ddd",
                        }}
                      >
                        Make all checks payable to "{invoiceData.sender.name}"{" "}
                        {invoiceData.sender.address}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "clients" && (
            <div className="max-w-5xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    Client Management
                  </h2>
                  <button
                    onClick={addClient}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Client
                  </button>
                </div>

                {editingClient && (
                  <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                    <h3 className="font-semibold mb-3 text-gray-900">
                      {editingClient.id &&
                      clients.find((c) => c.id === editingClient.id)
                        ? "Edit Client"
                        : "New Client"}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Legal Name *
                        </label>
                        <input
                          type="text"
                          value={editingClient.client_name || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              client_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Full legal company name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Short Name / Nickname
                        </label>
                        <input
                          type="text"
                          value={editingClient.short_name || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              short_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Short name for quick selection"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={editingClient.address || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              address: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Full address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          VAT Number
                        </label>
                        <input
                          type="text"
                          value={editingClient.vat_number || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              vat_number: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="VAT/Tax ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={editingClient.bank_name || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              bank_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Bank name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IBAN
                        </label>
                        <input
                          type="text"
                          value={editingClient.iban || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              iban: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="IBAN"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          SWIFT/BIC
                        </label>
                        <input
                          type="text"
                          value={editingClient.swift || ""}
                          onChange={(e) =>
                            setEditingClient({
                              ...editingClient,
                              swift: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="SWIFT code"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveClient}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingClient(null)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Sheet Nickname
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Legal Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Address
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        VAT
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-8 text-gray-500"
                        >
                          No clients added yet. Click "Add Client" to create
                          one.
                        </td>
                      </tr>
                    ) : (
                      clients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 font-medium">
                            {client.short_name || "—"}
                          </td>
                          <td className="py-3 px-4">{client.client_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {client.address || "—"}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {client.vat_number || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => editClient(client)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteClient(client.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Company Settings
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  These details will appear on all invoices as the sender
                  information. Update them to match your company&apos;s legal
                  details.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={myCompany.name || ""}
                      onChange={(e) =>
                        setMyCompany({ ...myCompany, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={myCompany.address || ""}
                      onChange={(e) =>
                        setMyCompany({ ...myCompany, address: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={myCompany.vat || ""}
                      onChange={(e) =>
                        setMyCompany({ ...myCompany, vat: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={myCompany.bank || ""}
                      onChange={(e) =>
                        setMyCompany({ ...myCompany, bank: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={myCompany.iban || ""}
                      onChange={(e) =>
                        setMyCompany({ ...myCompany, iban: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SWIFT/BIC
                    </label>
                    <input
                      type="text"
                      value={myCompany.swift || ""}
                      onChange={(e) =>
                        setMyCompany({ ...myCompany, swift: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
