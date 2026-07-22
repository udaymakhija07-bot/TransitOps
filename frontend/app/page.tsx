"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "./components/ThemeToggle";

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // API Data States
  const [kpis, setKpis] = useState({
    active_vehicles: 0,
    available_vehicles: 0,
    in_maintenance: 0,
    active_trips: 0,
    pending_trips: 0,
    drivers_on_duty: 0,
    fleet_utilization: 0,
    recent_trips: []
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [financeSubTab, setFinanceSubTab] = useState("fuel"); // "fuel" | "expenses" | "analytics"
  const [fuelForm, setFuelForm] = useState({ vehicleId: "", tripId: "", liters: "", cost: "", date: new Date().toISOString().split('T')[0] });
  const [expenseForm, setExpenseForm] = useState({ vehicleId: "", expenseType: "toll", amount: "", date: new Date().toISOString().split('T')[0] });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modals States
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);

  // Forms States
  const [vehicleForm, setVehicleForm] = useState({
    name: "",
    registrationNumber: "",
    vehicleType: "van",
    maxLoadCapacity: "",
    odometer: "0",
    acquisitionCost: "0",
    status: "available",
    region: "",
    revenue: "0"
  });
  const [driverForm, setDriverForm] = useState({
    name: "",
    licenseNumber: "",
    licenseCategory: "",
    licenseExpiryDate: "",
    contactNumber: "",
    safetyScore: "100",
    status: "available"
  });
  const [tripForm, setTripForm] = useState({
    source: "",
    destination: "",
    vehicleId: "",
    driverId: "",
    cargoWeight: "",
    plannedDistance: ""
  });
  const [completionForm, setCompletionForm] = useState({
    actualDistance: "",
    fuelConsumed: ""
  });

  const BACKEND_URL = typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:5005/api"
      : "https://transitops-backend-5f1v.onrender.com/api";

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const getHeaders = (jwtToken?: string) => {
    const activeToken = jwtToken || token;
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${activeToken}`
    };
  };

  const fetchData = async (jwtToken?: string) => {
    setLoading(true);
    const activeToken = jwtToken || token;
    if (!activeToken) return;

    try {
      const headers = getHeaders(activeToken);

      const kpisRes = await fetch(`${BACKEND_URL}/dashboard/kpis`, { headers });
      if (kpisRes.ok) setKpis(await kpisRes.json());

      // Fetch Vehicles
      const vehRes = await fetch(`${BACKEND_URL}/vehicles`, { headers });
      if (vehRes.ok) {
        const list = await vehRes.json();
        setVehicles(list);
        if (list.length > 0) {
          setFuelForm(f => ({ ...f, vehicleId: list[0].id.toString() }));
          setExpenseForm(e => ({ ...e, vehicleId: list[0].id.toString() }));
        }
      }

      const drvRes = await fetch(`${BACKEND_URL}/drivers`, { headers });
      if (drvRes.ok) setDrivers(await drvRes.json());

      const tripRes = await fetch(`${BACKEND_URL}/trips`, { headers });
      if (tripRes.ok) setTrips(await tripRes.json());

      // Fetch Compliance Alerts
      const alertsRes = await fetch(`${BACKEND_URL}/drivers/compliance-alerts`, { headers });
      if (alertsRes.ok) setComplianceAlerts(await alertsRes.json());

      // Fetch Fuel Logs and Expenses (Manager & Analyst only)
      const userStr = localStorage.getItem("transitops_user");
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (userObj?.role === 'manager' || userObj?.role === 'analyst') {
        const fuelRes = await fetch(`${BACKEND_URL}/fuel-logs`, { headers });
        if (fuelRes.ok) setFuelLogs(await fuelRes.json());

        const expRes = await fetch(`${BACKEND_URL}/expenses`, { headers });
        if (expRes.ok) setExpenses(await expRes.json());
      }

    } catch (err) {
      console.error(err);
      showNotification("error", "Could not connect to backend server. Make sure the API server is running on port 5005.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("transitops_token");
    const savedUser = localStorage.getItem("transitops_user");

    if (!savedToken || !savedUser) {
      router.push("/login");
      return;
    }

    setToken(savedToken);
    setCurrentUser(JSON.parse(savedUser));
    fetchData(savedToken);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("transitops_token");
    localStorage.removeItem("transitops_user");
    router.push("/login");
  };

  // CSV Export Utility
  const handleExportCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      showNotification("error", "No data available to export.");
      return;
    }

    const cleanData = data.map(({ trips, maintenanceLogs, fuelLogs, expenses, vehicle, driver, ...rest }) => ({
      ...rest,
      vehicleName: vehicle ? vehicle.name : undefined,
      driverName: driver ? driver.name : undefined
    }));

    const headers = Object.keys(cleanData[0]).join(",");
    const rows = cleanData.map(row =>
      Object.values(row).map(value => {
        const str = value === null || value === undefined ? "" : String(value).replace(/"/g, '""');
        return str.includes(",") || str.includes("\n") ? `"${str}"` : str;
      }).join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("success", `CSV Exported as ${filename}`);
  };

  const handleCreateFuelLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: parseInt(fuelForm.vehicleId),
        liters: parseFloat(fuelForm.liters),
        cost: parseFloat(fuelForm.cost),
        date: fuelForm.date,
        tripId: fuelForm.tripId ? parseInt(fuelForm.tripId) : null
      };

      const res = await fetch(`${BACKEND_URL}/fuel-logs`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create fuel log");

      showNotification("success", "Fuel log added successfully!");
      setShowFuelModal(false);
      setFuelForm({
        vehicleId: vehicles[0]?.id?.toString() || "",
        tripId: "",
        liters: "",
        cost: "",
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        vehicleId: parseInt(expenseForm.vehicleId),
        expenseType: expenseForm.expenseType,
        amount: parseFloat(expenseForm.amount),
        date: expenseForm.date
      };

      const res = await fetch(`${BACKEND_URL}/expenses`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create expense");

      showNotification("success", "Expense log added successfully!");
      setShowExpenseModal(false);
      setExpenseForm({
        vehicleId: vehicles[0]?.id?.toString() || "",
        expenseType: "toll",
        amount: "",
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  // Form Submissions
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/vehicles`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(vehicleForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vehicle");

      showNotification("success", "Vehicle registered successfully!");
      setShowVehicleModal(false);
      setVehicleForm({
        name: "", registrationNumber: "", vehicleType: "van",
        maxLoadCapacity: "", odometer: "0", acquisitionCost: "0",
        status: "available", region: "", revenue: "0"
      });
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/drivers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(driverForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register driver");

      showNotification("success", "Driver registered successfully!");
      setShowDriverModal(false);
      setDriverForm({
        name: "", licenseNumber: "", licenseCategory: "",
        licenseExpiryDate: "", contactNumber: "", safetyScore: "100", status: "available"
      });
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/trips`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(tripForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule trip");

      showNotification("success", "Trip planned successfully!");
      setShowTripModal(false);
      setTripForm({ source: "", destination: "", vehicleId: "", driverId: "", cargoWeight: "", plannedDistance: "" });
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleDispatchTrip = async (tripId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/trips/${tripId}/dispatch`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch trip");

      showNotification("success", "Trip successfully Dispatched!");
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;
    try {
      const res = await fetch(`${BACKEND_URL}/trips/${selectedTrip.id}/complete`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(completionForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete trip");

      showNotification("success", "Trip marked as Completed! Fuel log generated.");
      setShowCompleteModal(false);
      setCompletionForm({ actualDistance: "", fuelConsumed: "" });
      setSelectedTrip(null);
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleCancelTrip = async (tripId: number) => {
    if (!confirm("Are you sure you want to cancel this trip?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/trips/${tripId}/cancel`, {
        method: "POST",
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel trip");

      showNotification("success", "Trip successfully cancelled.");
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm("Delete this vehicle registry?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/vehicles/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      showNotification("success", "Vehicle registry removed.");
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleDeleteDriver = async (id: number) => {
    if (!confirm("Delete this driver profile?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/drivers/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      showNotification("success", "Driver profile removed.");
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const getFilteredVehicles = () => {
    return vehicles.filter((v: any) => {
      const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (v.region && v.region.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      const matchesType = typeFilter === "all" || v.vehicleType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  };

  const getFilteredDrivers = () => {
    return drivers.filter((d: any) => {
      const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const getFilteredTrips = () => {
    return trips.filter((t: any) => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.vehicle?.name && t.vehicle.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (t.driver?.name && t.driver.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "all" || t.state === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  if (!currentUser) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm font-medium"
        style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-spin" style={{ color: "#2563eb" }} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading Session...
        </div>
      </div>
    );
  }

  const isTabAllowed = (tab: string) => {
    if (currentUser.role === 'driver' || currentUser.role === 'dispatcher') {
      return tab === 'dashboard' || tab === 'trips';
    }
    if (tab === 'finance') {
      return currentUser.role === 'manager' || currentUser.role === 'analyst';
    }
    return true;
  };

  const totalVehiclesCount = vehicles.length;
  const availableCount = vehicles.filter((v: any) => v.status === "available").length;
  const onTripCount = vehicles.filter((v: any) => v.status === "on_trip").length;
  const inShopCount = vehicles.filter((v: any) => v.status === "in_shop").length;
  const retiredCount = vehicles.filter((v: any) => v.status === "retired").length;

  // Shared styles
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-base)",
    border: "1px solid var(--border-default)",
    borderRadius: "8px",
    padding: "9px 14px",
    color: "var(--text-primary)",
    fontSize: "13px",
    outline: "none",
    marginTop: "6px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-muted)",
  };

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"/>,
    },
    {
      id: "vehicles",
      label: "Fleet Vehicles",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3m14 0V9a2 2 0 00-2-2h-2M5 16V9a2 2 0 012-2h2m10 9a2 2 0 01-2 2H7a2 2 0 01-2-2m14-5V7a2 2 0 00-2-2h-2M5 9V7a2 2 0 012-2h2m0 0V2h6v3M9 7h6"/>,
    },
    {
      id: "drivers",
      label: "Drivers Directory",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>,
    },
    {
      id: "trips",
      label: "Trip Planner",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>,
    },
    {
      id: "finance",
      label: "Finance & Reports",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    },
  ];

  const getStatusBadge = (status: string, type: "vehicle" | "driver" | "trip") => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      available:  { bg: "rgba(16,185,129,0.08)",  color: "#34d399", border: "rgba(16,185,129,0.2)"  },
      on_trip:    { bg: "rgba(6,182,212,0.08)",   color: "#22d3ee", border: "rgba(6,182,212,0.2)"   },
      in_shop:    { bg: "rgba(245,158,11,0.08)",  color: "#fbbf24", border: "rgba(245,158,11,0.2)"  },
      retired:    { bg: "rgba(244,63,94,0.08)",   color: "#fb7185", border: "rgba(244,63,94,0.2)"   },
      off_duty:   { bg: "rgba(100,116,139,0.1)",  color: "#94a3b8", border: "rgba(100,116,139,0.2)" },
      suspended:  { bg: "rgba(244,63,94,0.08)",   color: "#fb7185", border: "rgba(244,63,94,0.2)"   },
      draft:      { bg: "rgba(100,116,139,0.1)",  color: "#94a3b8", border: "rgba(100,116,139,0.2)" },
      dispatched: { bg: "rgba(6,182,212,0.08)",   color: "#22d3ee", border: "rgba(6,182,212,0.2)"   },
      completed:  { bg: "rgba(16,185,129,0.08)",  color: "#34d399", border: "rgba(16,185,129,0.2)"  },
      cancelled:  { bg: "rgba(244,63,94,0.08)",   color: "#fb7185", border: "rgba(244,63,94,0.2)"   },
    };
    const s = map[status] || map["draft"];
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: "999px",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          background: s.bg,
          color: s.color,
          border: `1px solid ${s.border}`,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}
    >

      {/* ── Toast Notifications ── */}
      {errorMsg && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold animate-fade-in"
          style={{
            background: "rgba(244,63,94,0.12)",
            border: "1px solid rgba(244,63,94,0.3)",
            color: "#fb7185",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl text-sm font-semibold animate-fade-in"
          style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#34d399",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
          }}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {successMsg}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col justify-between shrink-0"
        style={{
          width: "var(--sidebar-width)",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          {/* Logo */}
          <div
            className="flex items-center gap-3 p-5"
            style={{
              background: "var(--sidebar-brand-bg)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="p-2 rounded-xl shrink-0"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a1 1 0 00-1-1h-7m7 5H3"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">TransitOps</div>
              <div className="text-[10px] font-medium" style={{ color: "#60a5fa", opacity: 0.8 }}>Enterprise Platform</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-3 space-y-1">
            {navItems.map(item =>
              isTabAllowed(item.id) ? (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    textAlign: "left",
                    fontSize: "13px",
                    fontWeight: activeTab === item.id ? 600 : 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    background: activeTab === item.id
                      ? "linear-gradient(135deg, rgba(29,78,216,0.35) 0%, rgba(37,99,235,0.25) 100%)"
                      : "transparent",
                    color: activeTab === item.id ? "#93c5fd" : "var(--text-muted)",
                    borderLeft: activeTab === item.id ? "2px solid #2563eb" : "2px solid transparent",
                    boxShadow: activeTab === item.id ? "0 2px 12px rgba(37,99,235,0.15)" : "none",
                  }}
                >
                  <svg className="w-4.5 h-4.5 shrink-0" style={{ width: "18px", height: "18px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                  {item.label}
                </button>
              ) : null
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div
          className="p-4"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <div className="mb-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-muted)" }}>
              Signed In As
            </div>
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {currentUser.name}
            </div>
            <div className="text-[11px] font-mono mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
              {currentUser.email}
            </div>
            <div className="mt-2">
              <span
                className="badge"
                style={{
                  background: "rgba(37,99,235,0.12)",
                  color: "#60a5fa",
                  border: "1px solid rgba(37,99,235,0.25)",
                }}
              >
                {currentUser.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "9px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(244,63,94,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fb7185";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(244,63,94,0.25)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top Header */}
        <header
          className="flex items-center justify-between px-8"
          style={{
            height: "60px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-3">
            <h1
              className="text-lg font-semibold capitalize"
              style={{ color: "var(--text-primary)" }}
            >
              {activeTab === "dashboard" ? "Operations Dashboard" :
               activeTab === "vehicles"  ? "Fleet Vehicles" :
               activeTab === "drivers"   ? "Drivers Directory" : "Trip Planner"}
            </h1>
            {loading && (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full ml-1"
                style={{ background: "#2563eb", animation: "pulseGlow 1.2s ease-in-out infinite" }}
              />
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => fetchData()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                background: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2M4 9h5v5"/>
              </svg>
              Sync
            </button>

            {/* CSV Export */}
            {(activeTab === "vehicles" || activeTab === "drivers" || activeTab === "trips") && (
              <button
                onClick={() => {
                  if (activeTab === "vehicles") handleExportCSV(vehicles, "vehicles_registry.csv");
                  else if (activeTab === "drivers") handleExportCSV(drivers, "drivers_directory.csv");
                  else handleExportCSV(trips, "trips_logs.csv");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "rgba(16,185,129,0.08)",
                  color: "#34d399",
                  border: "1px solid rgba(16,185,129,0.2)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Export CSV
              </button>
            )}

            {/* Add / Plan Button */}
            {(currentUser.role !== 'driver' && currentUser.role !== 'dispatcher' && currentUser.role !== 'safety' && currentUser.role !== 'analyst') && (
              <button
                onClick={() => {
                  if (activeTab === "vehicles") setShowVehicleModal(true);
                  else if (activeTab === "drivers") setShowDriverModal(true);
                  else setShowTripModal(true);
                }}
                className="btn-primary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.3)",
                  transition: "all 0.2s",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                {activeTab === "vehicles" ? "Register Vehicle" : activeTab === "drivers" ? "Add Driver" : "Plan Trip"}
              </button>
            )}
            {(currentUser.role === 'driver' || currentUser.role === 'dispatcher') && activeTab === "trips" && (
              <button
                onClick={() => setShowTripModal(true)}
                className="btn-primary"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                  background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                  color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(37,99,235,0.3)",
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                Plan Trip
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div
          className="flex-1 overflow-y-auto p-7"
          style={{ background: "var(--bg-base)" }}
        >
          {/* Compliance Expiry Alert Banner */}
          {complianceAlerts.length > 0 && (currentUser.role === 'manager' || currentUser.role === 'safety') && (
            <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg shadow-amber-500/5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <h4 className="font-bold text-amber-400">Driver License Compliance Alert</h4>
                  <p className="text-slate-300 text-sm mt-0.5">
                    We detected <strong>{complianceAlerts.length} driver(s)</strong> whose license is expiring within the next 15 days. Simulated alert email(s) have been successfully sent to the Safety Officer (`safety@transitops.com`).
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveTab("drivers");
                  setStatusFilter("all");
                  setSearchQuery("Expiring");
                }}
                className="shrink-0 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all"
              >
                Resolve Alerts
              </button>
            </div>
          )}
          {activeTab === "dashboard" && (
            <div className="space-y-7 animate-fade-in">

              {/* KPI Cards */}
              {currentUser.role !== 'driver' && currentUser.role !== 'dispatcher' && currentUser.role !== 'safety' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    {
                      label: "Active Vehicles",
                      value: kpis.active_vehicles,
                      suffix: "In Fleet",
                      color: "#60a5fa",
                      glow: "rgba(37,99,235,0.2)",
                      border: "rgba(37,99,235,0.25)",
                      bg: "rgba(37,99,235,0.06)",
                      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3m14 0V9a2 2 0 00-2-2h-2M5 16V9a2 2 0 012-2h2m10 9a2 2 0 01-2 2H7a2 2 0 01-2-2m14-5V7a2 2 0 00-2-2h-2M5 9V7a2 2 0 012-2h2m0 0V2h6v3M9 7h6"/>
                    },
                    {
                      label: "Available",
                      value: kpis.available_vehicles,
                      suffix: "Ready",
                      color: "#34d399",
                      glow: "rgba(16,185,129,0.2)",
                      border: "rgba(16,185,129,0.25)",
                      bg: "rgba(16,185,129,0.06)",
                      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    },
                    {
                      label: "In Maintenance",
                      value: kpis.in_maintenance,
                      suffix: "In Shop",
                      color: "#fbbf24",
                      glow: "rgba(245,158,11,0.2)",
                      border: "rgba(245,158,11,0.25)",
                      bg: "rgba(245,158,11,0.06)",
                      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>,
                    },
                    {
                      label: "Fleet Utilization",
                      value: `${kpis.fleet_utilization.toFixed(1)}%`,
                      suffix: "Active",
                      color: "#a78bfa",
                      glow: "rgba(139,92,246,0.2)",
                      border: "rgba(139,92,246,0.25)",
                      bg: "rgba(139,92,246,0.06)",
                      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    },
                  ].map(card => (
                    <div
                      key={card.label}
                      className="enterprise-card"
                      style={{
                        padding: "24px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Left accent bar */}
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: "3px", background: card.color, borderRadius: "0 2px 2px 0",
                      }} />
                      {/* Glow orb */}
                      <div style={{
                        position: "absolute", top: "-20px", right: "-20px",
                        width: "80px", height: "80px", borderRadius: "50%",
                        background: card.glow, filter: "blur(20px)",
                      }} />
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                            {card.label}
                          </div>
                          <div className="text-4xl font-extrabold" style={{ color: card.color }}>
                            {card.value}
                          </div>
                          <div className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                            {card.suffix}
                          </div>
                        </div>
                        <div
                          className="p-2.5 rounded-xl"
                          style={{ background: card.bg, border: `1px solid ${card.border}` }}
                        >
                          <svg className="w-5 h-5" style={{ color: card.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {card.icon}
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl">
                  <div className="enterprise-card" style={{ padding: "24px" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#22d3ee" }} />
                    <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Active Dispatched Trips</div>
                    <div className="text-4xl font-extrabold" style={{ color: "#22d3ee" }}>{kpis.active_trips}</div>
                  </div>
                  <div className="enterprise-card" style={{ padding: "24px" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#94a3b8" }} />
                    <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Planned Draft Trips</div>
                    <div className="text-4xl font-extrabold" style={{ color: "var(--text-secondary)" }}>{kpis.pending_trips}</div>
                  </div>
                </div>
              )}

              {/* Charts */}
              {currentUser.role !== 'driver' && currentUser.role !== 'dispatcher' && currentUser.role !== 'safety' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* Donut Chart */}
                  <div
                    className="enterprise-card"
                    style={{ padding: "24px" }}
                  >
                    <h3 className="text-sm font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                      Vehicle Status Distribution
                    </h3>
                    <div className="flex items-center justify-around gap-6">
                      <div className="relative w-36 h-36">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--bg-elevated)" strokeWidth="3"/>
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.2"
                            strokeDasharray={`${totalVehiclesCount > 0 ? (availableCount / totalVehiclesCount) * 100 : 0} ${100 - (totalVehiclesCount > 0 ? (availableCount / totalVehiclesCount) * 100 : 0)}`}
                            strokeDashoffset="0"
                          />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#06b6d4" strokeWidth="3.2"
                            strokeDasharray={`${totalVehiclesCount > 0 ? (onTripCount / totalVehiclesCount) * 100 : 0} ${100 - (totalVehiclesCount > 0 ? (onTripCount / totalVehiclesCount) * 100 : 0)}`}
                            strokeDashoffset={`-${totalVehiclesCount > 0 ? (availableCount / totalVehiclesCount) * 100 : 0}`}
                          />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.2"
                            strokeDasharray={`${totalVehiclesCount > 0 ? (inShopCount / totalVehiclesCount) * 100 : 0} ${100 - (totalVehiclesCount > 0 ? (inShopCount / totalVehiclesCount) * 100 : 0)}`}
                            strokeDashoffset={`-${totalVehiclesCount > 0 ? ((availableCount + onTripCount) / totalVehiclesCount) * 100 : 0}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{totalVehiclesCount}</span>
                          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--text-muted)" }}>Total</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Available", count: availableCount, color: "#10b981" },
                          { label: "On Trip",   count: onTripCount,   color: "#06b6d4" },
                          { label: "In Shop",   count: inShopCount,   color: "#f59e0b" },
                          { label: "Retired",   count: retiredCount,  color: "#475569" },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }}/>
                            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                              {item.label}: <strong style={{ color: "var(--text-primary)" }}>{item.count}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div className="enterprise-card" style={{ padding: "24px" }}>
                    <h3 className="text-sm font-semibold mb-6" style={{ color: "var(--text-primary)" }}>
                      Operational Cost per Vehicle
                    </h3>
                    <div className="space-y-4">
                      {vehicles.slice(0, 5).map((v: any) => {
                        const cost = v.total_operational_cost || 0;
                        const maxCost = Math.max(...vehicles.map((veh: any) => veh.total_operational_cost || 0), 100);
                        const pct = (cost / maxCost) * 100;
                        return (
                          <div key={v.id} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                              <span>{v.name}</span>
                              <span className="font-mono font-bold" style={{ color: "#60a5fa" }}>${cost.toFixed(2)}</span>
                            </div>
                            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${pct}%`,
                                  background: "linear-gradient(90deg, #1d4ed8, #2563eb, #38bdf8)",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Trips Table */}
              <div
                className="enterprise-card"
                style={{ borderRadius: "12px", overflow: "hidden" }}
              >
                <div
                  className="flex justify-between items-center px-6 py-4"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {currentUser.role === 'driver' ? "My Assigned Trips" : "Recent Trip Operations (Last 10)"}
                  </h3>
                  {isTabAllowed("trips") && (
                    <button
                      onClick={() => setActiveTab("trips")}
                      className="text-xs font-semibold flex items-center gap-1 transition-colors"
                      style={{ color: "#60a5fa", background: "none", border: "none", cursor: "pointer" }}
                    >
                      View All &rarr;
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                        {["Reference", "Route", "Vehicle", "Driver", "Weight", "Distance", "Status", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.recent_trips.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
                            No trips planned yet. Click "Plan Trip" to begin.
                          </td>
                        </tr>
                      ) : (
                        kpis.recent_trips.map((trip: any) => (
                          <tr
                            key={trip.id}
                            className="transition-colors"
                            style={{ borderBottom: "1px solid var(--border-subtle)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)"}
                            onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                          >
                            <td className="px-5 py-4 font-mono font-bold text-sm" style={{ color: "var(--text-primary)" }}>{trip.name}</td>
                            <td className="px-5 py-4 text-sm">
                              <span style={{ color: "var(--text-secondary)" }}>{trip.source}</span>
                              <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>→</span>
                              <span style={{ color: "var(--text-secondary)" }}>{trip.destination}</span>
                            </td>
                            <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{trip.vehicle?.name || "N/A"}</td>
                            <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{trip.driver?.name || "N/A"}</td>
                            <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{trip.cargoWeight} kg</td>
                            <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{trip.plannedDistance} km</td>
                            <td className="px-5 py-4">{getStatusBadge(trip.state, "trip")}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                {trip.state === "draft" && (
                                  <button onClick={() => handleDispatchTrip(trip.id)} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)", cursor: "pointer" }}>
                                    Dispatch
                                  </button>
                                )}
                                {trip.state === "dispatched" && (
                                  <button onClick={() => { setSelectedTrip(trip); setShowCompleteModal(true); }} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer" }}>
                                    Complete
                                  </button>
                                )}
                                {(trip.state === "draft" || trip.state === "dispatched") && (
                                  <button onClick={() => handleCancelTrip(trip.id)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-default)", cursor: "pointer" }}>
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── VEHICLES TAB ── */}
          {activeTab === "vehicles" && (
            <div className="space-y-5 animate-fade-in">
              {/* Filters */}
              <div
                className="flex flex-wrap gap-3 items-center p-4 rounded-xl"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by vehicle name, registration, or region..."
                  style={{ ...inputStyle, flex: "1", minWidth: "200px", marginTop: 0 }}
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "160px", marginTop: 0 }}>
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="on_trip">On Trip</option>
                  <option value="in_shop">In Shop</option>
                  <option value="retired">Retired</option>
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inputStyle, width: "140px", marginTop: 0 }}>
                  <option value="all">All Types</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                  <option value="bike">Bike</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {getFilteredVehicles().map((v: any) => (
                  <div key={v.id} className="enterprise-card" style={{ padding: "20px" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: v.status === "available" ? "#10b981" : v.status === "on_trip" ? "#06b6d4" : v.status === "in_shop" ? "#f59e0b" : "#475569" }} />
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(v.status, "vehicle")}
                      {currentUser.role === 'manager' && (
                        <button onClick={() => handleDeleteVehicle(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
                          <svg className="w-4.5 h-4.5" style={{ width: "18px", height: "18px", color: "inherit" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{v.name}</h3>
                    <div className="text-xs font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>{v.registrationNumber}</div>
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      {[
                        { label: "Max Load", val: `${v.maxLoadCapacity} kg` },
                        { label: "Odometer", val: `${v.odometer} km` },
                        ...(currentUser.role !== 'driver' && currentUser.role !== 'dispatcher' && currentUser.role !== 'safety' ? [
                          { label: "Op. Cost", val: `$${v.total_operational_cost?.toFixed(2) || "0.00"}` },
                          { label: "ROI", val: `${v.roi?.toFixed(1) || "0.0"}%`, highlight: true },
                        ] : []),
                      ].map(item => (
                        <div key={item.label}>
                          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.label}</div>
                          <div className="text-sm font-semibold mt-0.5" style={{ color: (item as any).highlight ? "#60a5fa" : "var(--text-secondary)" }}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 pt-3 text-xs" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                      <span>Region: <strong style={{ color: "var(--text-secondary)" }}>{v.region || "Global"}</strong></span>
                      <span className="capitalize">Type: <strong style={{ color: "var(--text-secondary)" }}>{v.vehicleType}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DRIVERS TAB ── */}
          {activeTab === "drivers" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-3 items-center p-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by driver name or license number..." style={{ ...inputStyle, flex: "1", marginTop: 0 }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "160px", marginTop: 0 }}>
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="on_trip">On Trip</option>
                  <option value="off_duty">Off Duty</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="enterprise-card" style={{ borderRadius: "12px", overflow: "hidden" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                        {["Name", "License Number", "Category", "Expiry Date", "Contact", ...(currentUser.role !== 'driver' && currentUser.role !== 'dispatcher' ? ["Safety Score"] : []), "Status", ...(currentUser.role === 'manager' ? ["Delete"] : [])].map(h => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredDrivers().map((d: any) => (
                        <tr
                          key={d.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid var(--border-subtle)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)"}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                        >
                          <td className="px-5 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{d.name}</td>
                          <td className="px-5 py-4 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>{d.licenseNumber}</td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{d.licenseCategory || "Standard"}</td>
                          <td className="px-5 py-4 text-sm">
                            <span style={{ color: new Date(d.licenseExpiryDate) < new Date() ? "#fb7185" : "var(--text-secondary)", fontWeight: new Date(d.licenseExpiryDate) < new Date() ? 700 : 500 }}>
                              {new Date(d.licenseExpiryDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{d.contactNumber || "N/A"}</td>
                          {currentUser.role !== 'driver' && currentUser.role !== 'dispatcher' && (
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: d.safetyScore >= 80 ? "#34d399" : d.safetyScore >= 50 ? "#fbbf24" : "#fb7185" }}>
                                  {d.safetyScore}%
                                </span>
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                                  <div className="h-full rounded-full" style={{ width: `${d.safetyScore}%`, background: d.safetyScore >= 80 ? "#10b981" : d.safetyScore >= 50 ? "#f59e0b" : "#f43f5e" }} />
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="px-5 py-4">{getStatusBadge(d.status, "driver")}</td>
                          {currentUser.role === 'manager' && (
                            <td className="px-5 py-4 text-right">
                              <button onClick={() => handleDeleteDriver(d.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                                <svg className="w-4.5 h-4.5" style={{ width: "17px", height: "17px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TRIPS TAB ── */}
          {activeTab === "trips" && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex gap-3 items-center p-4 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by trip reference, route, driver or vehicle..." style={{ ...inputStyle, flex: "1", marginTop: 0 }} />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, width: "160px", marginTop: 0 }}>
                  <option value="all">All States</option>
                  <option value="draft">Draft</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="enterprise-card" style={{ borderRadius: "12px", overflow: "hidden" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                        {["Reference", "Route", "Vehicle", "Driver", "Weight", "Planned", "Actual", "Status", "Actions"].map(h => (
                          <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredTrips().map((trip: any) => (
                        <tr
                          key={trip.id}
                          className="transition-colors"
                          style={{ borderBottom: "1px solid var(--border-subtle)" }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)"}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                        >
                          <td className="px-5 py-4 font-mono font-bold text-sm" style={{ color: "var(--text-primary)" }}>{trip.name}</td>
                          <td className="px-5 py-4 text-sm">
                            <span style={{ color: "var(--text-secondary)" }}>{trip.source}</span>
                            <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>→</span>
                            <span style={{ color: "var(--text-secondary)" }}>{trip.destination}</span>
                          </td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{trip.vehicle?.name || "N/A"}</td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{trip.driver?.name || "N/A"}</td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{trip.cargoWeight} kg</td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{trip.plannedDistance} km</td>
                          <td className="px-5 py-4 text-sm" style={{ color: "var(--text-muted)" }}>{trip.actualDistance ? `${trip.actualDistance} km` : "—"}</td>
                          <td className="px-5 py-4">{getStatusBadge(trip.state, "trip")}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {trip.state === "draft" && (
                                <button onClick={() => handleDispatchTrip(trip.id)} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(37,99,235,0.12)", color: "#60a5fa", border: "1px solid rgba(37,99,235,0.25)", cursor: "pointer" }}>Dispatch</button>
                              )}
                              {trip.state === "dispatched" && (
                                <button onClick={() => { setSelectedTrip(trip); setShowCompleteModal(true); }} style={{ padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)", cursor: "pointer" }}>Complete</button>
                              )}
                              {(trip.state === "draft" || trip.state === "dispatched") && (
                                <button onClick={() => handleCancelTrip(trip.id)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--border-default)", cursor: "pointer" }}>Cancel</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="space-y-6 animate-fade-in">
              {/* Finance Sub-Tab Bar */}
              <div className="flex gap-4 border-b border-[var(--border-subtle)] pb-4">
                {[
                  { id: "fuel", label: "Fuel Logs", count: fuelLogs.length },
                  { id: "expenses", label: "Other Expenses", count: expenses.length },
                  { id: "analytics", label: "Financial Analytics" }
                ].map(subTab => (
                  <button
                    key={subTab.id}
                    onClick={() => setFinanceSubTab(subTab.id)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      background: financeSubTab === subTab.id ? "var(--bg-elevated)" : "transparent",
                      color: financeSubTab === subTab.id ? "var(--text-primary)" : "var(--text-muted)",
                      border: "1px solid",
                      borderColor: financeSubTab === subTab.id ? "var(--border-strong)" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {subTab.label}
                    {subTab.count !== undefined && (
                      <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                        {subTab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Finance Sub-Tab Content */}
              {financeSubTab === "fuel" && (
                <div className="space-y-4">
                  {/* Actions Header */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fuel Consumption Directory</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportCSV(fuelLogs, "fuel_logs.csv")}
                        className="btn-secondary"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          background: "var(--bg-elevated)", color: "var(--text-secondary)",
                          border: "1px solid var(--border-default)", cursor: "pointer"
                        }}
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => setShowFuelModal(true)}
                        className="btn-primary"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff",
                          border: "none", cursor: "pointer"
                        }}
                      >
                        Log Fuel
                      </button>
                    </div>
                  </div>

                  {/* Fuel Logs Table */}
                  <div className="enterprise-card" style={{ borderRadius: "12px", overflow: "hidden" }}>
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                          {["Date", "Vehicle", "Liters", "Cost", "Price/L", "Trip Reference"].map(h => (
                            <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fuelLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                              No fuel logs recorded yet.
                            </td>
                          </tr>
                        ) : (
                          fuelLogs.map((log: any) => (
                            <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{new Date(log.date).toLocaleDateString()}</td>
                              <td className="px-5 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{log.vehicle?.name || "N/A"}</td>
                              <td className="px-5 py-4 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{log.liters} L</td>
                              <td className="px-5 py-4 text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>${log.cost.toFixed(2)}</td>
                              <td className="px-5 py-4 text-sm font-mono" style={{ color: "var(--text-muted)" }}>${(log.cost / log.liters).toFixed(2)}</td>
                              <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                                {log.trip ? (
                                  <span className="font-mono text-xs px-2 py-1 rounded bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-accent)]">
                                    {log.trip.reference}
                                  </span>
                                ) : (
                                  <span className="text-xs italic" style={{ color: "var(--text-muted)" }}>Manual Entry</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {financeSubTab === "expenses" && (
                <div className="space-y-4">
                  {/* Actions Header */}
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Operational Expense Directory</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportCSV(expenses, "expenses.csv")}
                        className="btn-secondary"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          background: "var(--bg-elevated)", color: "var(--text-secondary)",
                          border: "1px solid var(--border-default)", cursor: "pointer"
                        }}
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => setShowExpenseModal(true)}
                        className="btn-primary"
                        style={{
                          display: "flex", alignItems: "center", gap: "6px",
                          padding: "7px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff",
                          border: "none", cursor: "pointer"
                        }}
                      >
                        Log Expense
                      </button>
                    </div>
                  </div>

                  {/* Expenses Table */}
                  <div className="enterprise-card" style={{ borderRadius: "12px", overflow: "hidden" }}>
                    <table className="w-full text-left">
                      <thead>
                        <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                          {["Date", "Vehicle", "Expense Type", "Amount"].map(h => (
                            <th key={h} className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                              No additional expenses recorded yet.
                            </td>
                          </tr>
                        ) : (
                          expenses.map((exp: any) => (
                            <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{new Date(exp.date).toLocaleDateString()}</td>
                              <td className="px-5 py-4 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{exp.vehicle?.name || "N/A"}</td>
                              <td className="px-5 py-4 text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{exp.expenseType}</td>
                              <td className="px-5 py-4 text-sm font-mono font-semibold" style={{ color: "var(--text-primary)" }}>${exp.amount.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {financeSubTab === "analytics" && (
                <div className="space-y-6">
                  {/* Analytics KPI cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Total Fuel Cost",
                        val: `$${fuelLogs.reduce((sum: number, log: any) => sum + log.cost, 0).toFixed(2)}`,
                        color: "#60a5fa"
                      },
                      {
                        label: "Other Expenses",
                        val: `$${expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0).toFixed(2)}`,
                        color: "#fbbf24"
                      },
                      {
                        label: "Avg Fuel Efficiency",
                        val: (() => {
                          const completed = trips.filter((t: any) => t.state === "completed" && t.actualDistance && t.fuelConsumed);
                          if (completed.length === 0) return "N/A";
                          const totalDist = completed.reduce((sum: number, t: any) => sum + t.actualDistance, 0);
                          const totalFuel = completed.reduce((sum: number, t: any) => sum + t.fuelConsumed, 0);
                          return `${(totalDist / totalFuel).toFixed(2)} km/L`;
                        })(),
                        color: "#10b981"
                      },
                      {
                        label: "Average Vehicle ROI",
                        val: `${(vehicles.reduce((sum: number, v: any) => sum + (v.roi || 0), 0) / (vehicles.length || 1)).toFixed(1)}%`,
                        color: "#a78bfa"
                      }
                    ].map(card => (
                      <div key={card.label} className="enterprise-card" style={{ padding: "20px" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: card.color }} />
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{card.label}</div>
                        <div className="text-2xl font-bold mt-2" style={{ color: card.color }}>{card.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* SVG Analytics Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cost Breakdown Chart */}
                    <div className="enterprise-card" style={{ padding: "24px" }}>
                      <h3 className="text-sm font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Cost Breakdown per Vehicle</h3>
                      <div className="space-y-4">
                        {vehicles.slice(0, 5).map((v: any) => {
                          const fuelCost = fuelLogs.filter((l: any) => l.vehicleId === v.id).reduce((s: number, l: any) => s + l.cost, 0);
                          const otherCost = expenses.filter((e: any) => e.vehicleId === v.id).reduce((s: number, e: any) => s + e.amount, 0);
                          const mainCost = v.total_operational_cost ? Math.max(0, v.total_operational_cost - fuelCost - otherCost) : 0;
                          
                          const total = (fuelCost + otherCost + mainCost) || 1;
                          const fuelPct = (fuelCost / total) * 100;
                          const otherPct = (otherCost / total) * 100;
                          const mainPct = (mainCost / total) * 100;
                          
                          return (
                            <div key={v.id} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                                <span>{v.name}</span>
                                <span className="font-mono text-[var(--text-primary)]">${total.toFixed(2)}</span>
                              </div>
                              <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: "var(--bg-elevated)" }}>
                                <div style={{ width: `${fuelPct}%`, background: "#3b82f6" }} title={`Fuel: $${fuelCost.toFixed(2)}`} />
                                <div style={{ width: `${mainPct}%`, background: "#10b981" }} title={`Maintenance: $${mainCost.toFixed(2)}`} />
                                <div style={{ width: `${otherPct}%`, background: "#fbbf24" }} title={`Other: $${otherCost.toFixed(2)}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fuel Efficiency Chart */}
                    <div className="enterprise-card" style={{ padding: "24px" }}>
                      <h3 className="text-sm font-semibold mb-6" style={{ color: "var(--text-primary)" }}>Vehicle Fuel Efficiency (km/L)</h3>
                      <div className="space-y-4">
                        {vehicles.slice(0, 5).map((v: any) => {
                          const vehTrips = trips.filter((t: any) => t.vehicle?.id === v.id && t.state === "completed" && t.actualDistance && t.fuelConsumed);
                          const dist = vehTrips.reduce((s: number, t: any) => s + t.actualDistance, 0);
                          const fuel = vehTrips.reduce((s: number, t: any) => s + t.fuelConsumed, 0);
                          const efficiency = fuel > 0 ? dist / fuel : 0;
                          const maxEff = 15; // Max scale value for visualization
                          const pct = Math.min(100, (efficiency / maxEff) * 100);
                          
                          return (
                            <div key={v.id} className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                                <span>{v.name}</span>
                                <span className="font-mono" style={{ color: "#10b981" }}>{efficiency > 0 ? `${efficiency.toFixed(1)} km/L` : "No completed trips"}</span>
                              </div>
                              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #10b981, #34d399)" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* ============================================================
          MODALS
          ============================================================ */}
      {/* Modal overlay + card shared styles */}
      {[
        {
          show: showVehicleModal,
          title: "Register New Fleet Vehicle",
          onClose: () => setShowVehicleModal(false),
          onSubmit: handleCreateVehicle,
          submitLabel: "Register Vehicle",
          submitColor: "#2563eb",
          body: (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label style={labelStyle}>Vehicle Name / Model</label>
                <input type="text" required value={vehicleForm.name} onChange={e => setVehicleForm({ ...vehicleForm, name: e.target.value })} placeholder="e.g. Ford Transit L2H2" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Registration Number</label>
                <input type="text" required value={vehicleForm.registrationNumber} onChange={e => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })} placeholder="e.g. MH-12-TR-9999" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Vehicle Type</label>
                <select value={vehicleForm.vehicleType} onChange={e => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} style={inputStyle}>
                  <option value="van">Van</option><option value="truck">Truck</option><option value="bike">Bike</option><option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Max Load Capacity (kg)</label>
                <input type="number" required value={vehicleForm.maxLoadCapacity} onChange={e => setVehicleForm({ ...vehicleForm, maxLoadCapacity: e.target.value })} placeholder="e.g. 3500" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Odometer (km)</label>
                <input type="number" value={vehicleForm.odometer} onChange={e => setVehicleForm({ ...vehicleForm, odometer: e.target.value })} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Acquisition Cost ($)</label>
                <input type="number" value={vehicleForm.acquisitionCost} onChange={e => setVehicleForm({ ...vehicleForm, acquisitionCost: e.target.value })} placeholder="0" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Region</label>
                <input type="text" value={vehicleForm.region} onChange={e => setVehicleForm({ ...vehicleForm, region: e.target.value })} placeholder="e.g. North Region" style={inputStyle} />
              </div>
            </div>
          ),
        },
        {
          show: showDriverModal,
          title: "Register New Driver Profile",
          onClose: () => setShowDriverModal(false),
          onSubmit: handleCreateDriver,
          submitLabel: "Add Driver",
          submitColor: "#2563eb",
          body: (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label style={labelStyle}>Driver's Name</label>
                <input type="text" required value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} placeholder="e.g. John Miller" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>License Number</label>
                <input type="text" required value={driverForm.licenseNumber} onChange={e => setDriverForm({ ...driverForm, licenseNumber: e.target.value })} placeholder="e.g. DL-1420190009" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>License Category</label>
                <input type="text" value={driverForm.licenseCategory} onChange={e => setDriverForm({ ...driverForm, licenseCategory: e.target.value })} placeholder="e.g. Heavy Commercial" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>License Expiry Date</label>
                <input type="date" required value={driverForm.licenseExpiryDate} onChange={e => setDriverForm({ ...driverForm, licenseExpiryDate: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact Number</label>
                <input type="text" value={driverForm.contactNumber} onChange={e => setDriverForm({ ...driverForm, contactNumber: e.target.value })} placeholder="+91 98765 43210" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Safety Score (0–100)</label>
                <input type="number" value={driverForm.safetyScore} onChange={e => setDriverForm({ ...driverForm, safetyScore: e.target.value })} placeholder="100" style={inputStyle} />
              </div>
            </div>
          ),
        },
        {
          show: showTripModal,
          title: "Plan Delivery Route / Trip",
          onClose: () => setShowTripModal(false),
          onSubmit: handleCreateTrip,
          submitLabel: "Save & Plan",
          submitColor: "#2563eb",
          body: (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Source Location</label>
                <input type="text" required value={tripForm.source} onChange={e => setTripForm({ ...tripForm, source: e.target.value })} placeholder="e.g. Mumbai Hub" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Destination Location</label>
                <input type="text" required value={tripForm.destination} onChange={e => setTripForm({ ...tripForm, destination: e.target.value })} placeholder="e.g. Pune DC" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Select Available Vehicle</label>
                <select required value={tripForm.vehicleId} onChange={e => setTripForm({ ...tripForm, vehicleId: e.target.value })} style={inputStyle}>
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.filter((v: any) => v.status === "available").map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) – Max: {v.maxLoadCapacity}kg</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Select Available Driver</label>
                <select required value={tripForm.driverId} onChange={e => setTripForm({ ...tripForm, driverId: e.target.value })} style={inputStyle}>
                  <option value="">-- Choose Driver --</option>
                  {drivers.filter((d: any) => d.status === "available" && new Date(d.licenseExpiryDate) > new Date()).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cargo Weight (kg)</label>
                <input type="number" required value={tripForm.cargoWeight} onChange={e => setTripForm({ ...tripForm, cargoWeight: e.target.value })} placeholder="e.g. 1500" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Planned Distance (km)</label>
                <input type="number" required value={tripForm.plannedDistance} onChange={e => setTripForm({ ...tripForm, plannedDistance: e.target.value })} placeholder="e.g. 150" style={inputStyle} />
              </div>
            </div>
          ),
        },
        {
          show: showFuelModal,
          title: "Log Fuel Purchase / Consumption",
          onClose: () => setShowFuelModal(false),
          onSubmit: handleCreateFuelLog,
          submitLabel: "Save Fuel Log",
          submitColor: "#10b981",
          body: (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label style={labelStyle}>Select Vehicle</label>
                <select required value={fuelForm.vehicleId} onChange={e => setFuelForm({ ...fuelForm, vehicleId: e.target.value })} style={inputStyle}>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Associated Trip (Optional)</label>
                <select value={fuelForm.tripId} onChange={e => setFuelForm({ ...fuelForm, tripId: e.target.value })} style={inputStyle}>
                  <option value="">No Associated Trip (Manual Entry)</option>
                  {trips.filter((t: any) => t.vehicle?.id === parseInt(fuelForm.vehicleId) && t.state === "completed").map((t: any) => (
                    <option key={t.id} value={t.id}>{t.reference} ({t.source} → {t.destination})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Liters (L)</label>
                <input type="number" required step="0.01" value={fuelForm.liters} onChange={e => setFuelForm({ ...fuelForm, liters: e.target.value })} placeholder="e.g. 45.5" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Total Cost ($)</label>
                <input type="number" required step="0.01" value={fuelForm.cost} onChange={e => setFuelForm({ ...fuelForm, cost: e.target.value })} placeholder="e.g. 68.25" style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Purchase Date</label>
                <input type="date" required value={fuelForm.date} onChange={e => setFuelForm({ ...fuelForm, date: e.target.value })} style={inputStyle} />
              </div>
            </div>
          )
        },
        {
          show: showExpenseModal,
          title: "Log Fleet Expense",
          onClose: () => setShowExpenseModal(false),
          onSubmit: handleCreateExpense,
          submitLabel: "Save Expense",
          submitColor: "#fbbf24",
          body: (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label style={labelStyle}>Select Vehicle</label>
                <select required value={expenseForm.vehicleId} onChange={e => setExpenseForm({ ...expenseForm, vehicleId: e.target.value })} style={inputStyle}>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label style={labelStyle}>Expense Type</label>
                <select required value={expenseForm.expenseType} onChange={e => setExpenseForm({ ...expenseForm, expenseType: e.target.value })} style={inputStyle}>
                  <option value="toll">Toll</option>
                  <option value="parking">Parking</option>
                  <option value="insurance">Insurance</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Amount ($)</label>
                <input type="number" required step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="e.g. 15.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} style={inputStyle} />
              </div>
            </div>
          )
        },
      ].map(modal =>
        modal.show ? (
          <div
            key={modal.title}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="w-full max-w-lg rounded-2xl overflow-hidden animate-scale-up"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--modal-shadow)",
              }}
            >
              {/* Modal accent line */}
              <div style={{ height: "2px", background: "linear-gradient(90deg, #1d4ed8, #2563eb, #38bdf8, transparent)" }} />
              <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{modal.title}</h3>
                <button onClick={modal.onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={modal.onSubmit} className="p-6 space-y-4">
                {modal.body}
                <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <button type="button" onClick={modal.onClose}
                    style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary"
                    style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: `linear-gradient(135deg, #1d4ed8, ${modal.submitColor})`, color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.35)" }}>
                    {modal.submitLabel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null
      )}

      {/* Complete Trip Modal */}
      {showCompleteModal && selectedTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "var(--overlay-bg)", backdropFilter: "blur(8px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden animate-scale-up"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "var(--modal-shadow)" }}
          >
            <div style={{ height: "2px", background: "linear-gradient(90deg, #059669, #10b981, #34d399, transparent)" }} />
            <div className="flex justify-between items-start px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Complete Trip Assignment</h3>
                <span className="text-[11px] font-mono mt-0.5 block" style={{ color: "var(--text-muted)" }}>
                  {selectedTrip.name}: {selectedTrip.source} → {selectedTrip.destination}
                </span>
              </div>
              <button onClick={() => { setShowCompleteModal(false); setSelectedTrip(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCompleteTrip} className="p-6 space-y-4">
              <div>
                <label style={labelStyle}>Actual Distance Travelled (km)</label>
                <input type="number" required value={completionForm.actualDistance} onChange={e => setCompletionForm({ ...completionForm, actualDistance: e.target.value })} placeholder={`Planned: ${selectedTrip.plannedDistance} km`} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fuel Consumed (Liters)</label>
                <input type="number" required value={completionForm.fuelConsumed} onChange={e => setCompletionForm({ ...completionForm, fuelConsumed: e.target.value })} placeholder="e.g. 35" style={inputStyle} />
              </div>
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <button type="button" onClick={() => { setShowCompleteModal(false); setSelectedTrip(null); }}
                  style={{ padding: "9px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border-default)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary"
                  style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                  Submit & Close Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
