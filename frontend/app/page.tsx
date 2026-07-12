"use client";

import { useEffect, useState } from "react";

export default function Home() {
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
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

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

  const BACKEND_URL = "http://localhost:5000/api";

  const showNotification = (type: "success" | "error", message: string) => {
    if (type === "success") {
      setSuccessMsg(message);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch KPIs
      const kpisRes = await fetch(`${BACKEND_URL}/dashboard/kpis`);
      if (kpisRes.ok) setKpis(await kpisRes.json());

      // Fetch Vehicles
      const vehRes = await fetch(`${BACKEND_URL}/vehicles`);
      if (vehRes.ok) setVehicles(await vehRes.json());

      // Fetch Drivers
      const drvRes = await fetch(`${BACKEND_URL}/drivers`);
      if (drvRes.ok) setDrivers(await drvRes.json());

      // Fetch Trips
      const tripRes = await fetch(`${BACKEND_URL}/trips`);
      if (tripRes.ok) setTrips(await tripRes.json());

      // Fetch Maintenance
      const maintRes = await fetch(`${BACKEND_URL}/maintenance`);
      if (maintRes.ok) setMaintenance(await maintRes.json());

    } catch (err) {
      console.error(err);
      showNotification("error", "Could not connect to backend server. Make sure the API server is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Form Submissions
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/vehicles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vehicle");
      
      showNotification("success", "Vehicle registered successfully!");
      setShowVehicleModal(false);
      setVehicleForm({
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driverForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register driver");

      showNotification("success", "Driver registered successfully!");
      setShowDriverModal(false);
      setDriverForm({
        name: "",
        licenseNumber: "",
        licenseCategory: "",
        licenseExpiryDate: "",
        contactNumber: "",
        safetyScore: "100",
        status: "available"
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tripForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to schedule trip");

      showNotification("success", "Trip planned successfully!");
      setShowTripModal(false);
      setTripForm({
        source: "",
        destination: "",
        vehicleId: "",
        driverId: "",
        cargoWeight: "",
        plannedDistance: ""
      });
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  const handleDispatchTrip = async (tripId: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/trips/${tripId}/dispatch`, {
        method: "POST"
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
        headers: { "Content-Type": "application/json" },
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
        method: "POST"
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
        method: "DELETE"
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
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");

      showNotification("success", "Driver profile removed.");
      fetchData();
    } catch (err: any) {
      showNotification("error", err.message);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Alert Notifications */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-rose-500 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-emerald-500 animate-pulse">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Sidebar Layout */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M21 16v-4a1 1 0 00-1-1h-7m7 5H3"/></svg>
            <span className="text-xl font-bold tracking-tight text-white uppercase">TransitOps</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${activeTab === "dashboard" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z"/></svg>
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("vehicles")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${activeTab === "vehicles" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3m14 0V9a2 2 0 00-2-2h-2M5 16V9a2 2 0 012-2h2m10 9a2 2 0 01-2 2H7a2 2 0 01-2-2m14-5V7a2 2 0 00-2-2h-2M5 9V7a2 2 0 012-2h2m0 0V2h6v3M9 7h6"/></svg>
              Fleet Vehicles
            </button>
            <button
              onClick={() => setActiveTab("drivers")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${activeTab === "drivers" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              Drivers Directory
            </button>
            <button
              onClick={() => setActiveTab("trips")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${activeTab === "trips" ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
              Trip Planner
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-slate-500 text-xs flex flex-col gap-1 bg-slate-900/50">
          <div>Logged in as: <strong>Fleet Manager</strong></div>
          <div>TransitOps Platform v1.0</div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-100 capitalize">{activeTab}</h1>
            {loading && <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping ml-2"/>}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-lg text-sm transition-all border border-slate-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.2M4 9h5v5"/></svg>
              Sync Data
            </button>
            <button 
              onClick={() => {
                if (activeTab === "vehicles") setShowVehicleModal(true);
                else if (activeTab === "drivers") setShowDriverModal(true);
                else setShowTripModal(true);
              }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-md shadow-violet-600/20 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
              {activeTab === "vehicles" ? "Register Vehicle" : activeTab === "drivers" ? "Add Driver" : "Plan Trip"}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8 animate-fade-in">
              {/* KPIs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Active Vehicles */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-violet-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-xl translate-x-4 -translate-y-4 group-hover:bg-violet-500/20 transition-all"/>
                  <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase block">Active Vehicles</span>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-4xl font-extrabold text-slate-100">{kpis.active_vehicles}</span>
                    <span className="text-xs text-slate-500">In Fleet</span>
                  </div>
                </div>

                {/* Available Vehicles */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl translate-x-4 -translate-y-4 group-hover:bg-emerald-500/20 transition-all"/>
                  <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase block">Available Vehicles</span>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-4xl font-extrabold text-emerald-400">{kpis.available_vehicles}</span>
                    <span className="text-xs text-slate-500">Ready</span>
                  </div>
                </div>

                {/* Vehicles in Maintenance */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl translate-x-4 -translate-y-4 group-hover:bg-amber-500/20 transition-all"/>
                  <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase block">In Maintenance</span>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-4xl font-extrabold text-amber-500">{kpis.in_maintenance}</span>
                    <span className="text-xs text-slate-500">In Shop</span>
                  </div>
                </div>

                {/* Fleet Utilization */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl translate-x-4 -translate-y-4 group-hover:bg-indigo-500/20 transition-all"/>
                  <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase block">Fleet Utilization</span>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className="text-4xl font-extrabold text-indigo-400">{kpis.fleet_utilization.toFixed(1)}%</span>
                    <span className="text-xs text-slate-500">Active Logs</span>
                  </div>
                </div>
              </div>

              {/* Lower Section: Recent Trips */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-200">Recent Trip Operations (Last 10)</h3>
                  <button onClick={() => setActiveTab("trips")} className="text-violet-400 hover:text-violet-300 text-sm font-semibold flex items-center gap-1 transition-all">
                    View All Trips &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-950/40 border-b border-slate-800">
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Route</th>
                        <th className="px-6 py-4">Vehicle</th>
                        <th className="px-6 py-4">Driver</th>
                        <th className="px-6 py-4">Weight</th>
                        <th className="px-6 py-4">Distance</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                      {kpis.recent_trips.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-500 font-medium">No trips planned yet. Click "Plan Trip" to begin!</td>
                        </tr>
                      ) : (
                        kpis.recent_trips.map((trip: any) => (
                          <tr key={trip.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-100">{trip.name}</td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-200">{trip.source}</span>
                              <span className="mx-2 text-slate-500">&rarr;</span>
                              <span className="font-semibold text-slate-200">{trip.destination}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-400">{trip.vehicle?.name || "N/A"}</td>
                            <td className="px-6 py-4 text-slate-400">{trip.driver?.name || "N/A"}</td>
                            <td className="px-6 py-4">{trip.cargoWeight} kg</td>
                            <td className="px-6 py-4">{trip.plannedDistance} km</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                trip.state === "draft" ? "bg-slate-800 text-slate-400 border border-slate-700" :
                                trip.state === "dispatched" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                                trip.state === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}>
                                {trip.state}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {trip.state === "draft" && (
                                  <button 
                                    onClick={() => handleDispatchTrip(trip.id)}
                                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all shadow-md shadow-violet-600/10"
                                  >
                                    Dispatch
                                  </button>
                                )}
                                {trip.state === "dispatched" && (
                                  <button 
                                    onClick={() => {
                                      setSelectedTrip(trip);
                                      setShowCompleteModal(true);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all shadow-md shadow-emerald-600/10"
                                  >
                                    Complete
                                  </button>
                                )}
                                {(trip.state === "draft" || trip.state === "dispatched") && (
                                  <button 
                                    onClick={() => handleCancelTrip(trip.id)}
                                    className="bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-700 hover:border-rose-900/50 transition-all"
                                  >
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

          {/* TAB 2: VEHICLES */}
          {activeTab === "vehicles" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vehicles.map((v: any) => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          v.status === "available" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          v.status === "on_trip" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                          v.status === "in_shop" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          {v.status}
                        </span>
                        <button 
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-slate-100">{v.name}</h3>
                      <div className="text-sm font-mono text-slate-400 mt-1">{v.registrationNumber}</div>

                      <div className="grid grid-cols-2 gap-4 mt-6 border-t border-b border-slate-800/80 py-4">
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Max Load</div>
                          <div className="text-sm font-medium text-slate-200 mt-1">{v.maxLoadCapacity} kg</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Odometer</div>
                          <div className="text-sm font-medium text-slate-200 mt-1">{v.odometer} km</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Operational Cost</div>
                          <div className="text-sm font-medium text-slate-200 mt-1">${v.total_operational_cost?.toFixed(2) || "0.00"}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-xs uppercase tracking-wider font-semibold">ROI Impact</div>
                          <div className="text-sm font-bold text-violet-400 mt-1">{v.roi?.toFixed(1) || "0.0"}%</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mt-4 flex justify-between items-center">
                      <span>Region: <strong>{v.region || "Global"}</strong></span>
                      <span className="capitalize">Type: <strong>{v.vehicleType}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DRIVERS */}
          {activeTab === "drivers" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-950/40 border-b border-slate-800">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">License Number</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">License Expiration</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Safety Score</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                      {drivers.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-100">{d.name}</td>
                          <td className="px-6 py-4 font-mono">{d.licenseNumber}</td>
                          <td className="px-6 py-4 text-slate-400">{d.licenseCategory || "Standard"}</td>
                          <td className="px-6 py-4">
                            <span className={new Date(d.licenseExpiryDate) < new Date() ? "text-rose-500 font-bold" : "text-slate-300"}>
                              {new Date(d.licenseExpiryDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{d.contactNumber || "N/A"}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${d.safetyScore >= 80 ? "text-emerald-400" : d.safetyScore >= 50 ? "text-amber-500" : "text-rose-500"}`}>
                                {d.safetyScore}%
                              </span>
                              <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${d.safetyScore >= 80 ? "bg-emerald-500" : d.safetyScore >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${d.safetyScore}%` }}/>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              d.status === "available" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              d.status === "on_trip" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                              d.status === "off_duty" ? "bg-slate-800 text-slate-400 border border-slate-700" :
                              "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteDriver(d.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-md transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRIPS */}
          {activeTab === "trips" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-950/40 border-b border-slate-800">
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4">Route</th>
                        <th className="px-6 py-4">Vehicle</th>
                        <th className="px-6 py-4">Driver</th>
                        <th className="px-6 py-4">Weight</th>
                        <th className="px-6 py-4">Planned Dist</th>
                        <th className="px-6 py-4">Actual Dist</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                      {trips.map((trip: any) => (
                        <tr key={trip.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-100">{trip.name}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-slate-200">{trip.source}</span>
                            <span className="mx-2 text-slate-500">&rarr;</span>
                            <span className="font-semibold text-slate-200">{trip.destination}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{trip.vehicle?.name || "N/A"}</td>
                          <td className="px-6 py-4 text-slate-400">{trip.driver?.name || "N/A"}</td>
                          <td className="px-6 py-4">{trip.cargoWeight} kg</td>
                          <td className="px-6 py-4">{trip.plannedDistance} km</td>
                          <td className="px-6 py-4">{trip.actualDistance ? `${trip.actualDistance} km` : "-"}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              trip.state === "draft" ? "bg-slate-800 text-slate-400 border border-slate-700" :
                              trip.state === "dispatched" ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" :
                              trip.state === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                              "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {trip.state}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {trip.state === "draft" && (
                                <button 
                                  onClick={() => handleDispatchTrip(trip.id)}
                                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all shadow-md shadow-violet-600/10"
                                >
                                  Dispatch
                                </button>
                              )}
                              {trip.state === "dispatched" && (
                                <button 
                                  onClick={() => {
                                    setSelectedTrip(trip);
                                    setShowCompleteModal(true);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-all shadow-md shadow-emerald-600/10"
                                >
                                  Complete
                                </button>
                              )}
                              {(trip.state === "draft" || trip.state === "dispatched") && (
                                <button 
                                  onClick={() => handleCancelTrip(trip.id)}
                                  className="bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-slate-700 hover:border-rose-900/50 transition-all"
                                >
                                  Cancel
                                </button>
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
        </div>
      </main>

      {/* ==================== REGISTER VEHICLE MODAL ==================== */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-100">Register New Fleet Vehicle</h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateVehicle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Vehicle Name / Model</label>
                  <input 
                    type="text" 
                    required 
                    value={vehicleForm.name} 
                    onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})}
                    placeholder="e.g. Ford Transit L2H2" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Registration Number</label>
                  <input 
                    type="text" 
                    required 
                    value={vehicleForm.registrationNumber} 
                    onChange={e => setVehicleForm({...vehicleForm, registrationNumber: e.target.value})}
                    placeholder="e.g. MH-12-TR-9999" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Vehicle Type</label>
                  <select 
                    value={vehicleForm.vehicleType} 
                    onChange={e => setVehicleForm({...vehicleForm, vehicleType: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  >
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                    <option value="bike">Bike</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Max Load Capacity (kg)</label>
                  <input 
                    type="number" 
                    required 
                    value={vehicleForm.maxLoadCapacity} 
                    onChange={e => setVehicleForm({...vehicleForm, maxLoadCapacity: e.target.value})}
                    placeholder="e.g. 3500" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Odometer (km)</label>
                  <input 
                    type="number" 
                    value={vehicleForm.odometer} 
                    onChange={e => setVehicleForm({...vehicleForm, odometer: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Acquisition Cost ($)</label>
                  <input 
                    type="number" 
                    value={vehicleForm.acquisitionCost} 
                    onChange={e => setVehicleForm({...vehicleForm, acquisitionCost: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Region</label>
                  <input 
                    type="text" 
                    value={vehicleForm.region} 
                    onChange={e => setVehicleForm({...vehicleForm, region: e.target.value})}
                    placeholder="e.g. North Region" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setShowVehicleModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all border border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow-md shadow-violet-600/20 transition-all">
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ADD DRIVER MODAL ==================== */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-100">Register New Driver Profile</h3>
              <button onClick={() => setShowDriverModal(false)} className="text-slate-400 hover:text-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateDriver} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Driver's Name</label>
                  <input 
                    type="text" 
                    required 
                    value={driverForm.name} 
                    onChange={e => setDriverForm({...driverForm, name: e.target.value})}
                    placeholder="e.g. John Miller" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">License Number</label>
                  <input 
                    type="text" 
                    required 
                    value={driverForm.licenseNumber} 
                    onChange={e => setDriverForm({...driverForm, licenseNumber: e.target.value})}
                    placeholder="e.g. DL-1420190009" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">License Category</label>
                  <input 
                    type="text" 
                    value={driverForm.licenseCategory} 
                    onChange={e => setDriverForm({...driverForm, licenseCategory: e.target.value})}
                    placeholder="e.g. Heavy Commercial" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">License Expiry Date</label>
                  <input 
                    type="date" 
                    required 
                    value={driverForm.licenseExpiryDate} 
                    onChange={e => setDriverForm({...driverForm, licenseExpiryDate: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Contact Number</label>
                  <input 
                    type="text" 
                    value={driverForm.contactNumber} 
                    onChange={e => setDriverForm({...driverForm, contactNumber: e.target.value})}
                    placeholder="+91 98765 43210" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Safety Score (0-100)</label>
                  <input 
                    type="number" 
                    value={driverForm.safetyScore} 
                    onChange={e => setDriverForm({...driverForm, safetyScore: e.target.value})}
                    placeholder="100" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setShowDriverModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all border border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow-md shadow-violet-600/20 transition-all">
                  Add Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== PLAN TRIP MODAL ==================== */}
      {showTripModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-slate-100">Plan Delivery Route / Trip</h3>
              <button onClick={() => setShowTripModal(false)} className="text-slate-400 hover:text-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateTrip} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Source Location</label>
                  <input 
                    type="text" 
                    required 
                    value={tripForm.source} 
                    onChange={e => setTripForm({...tripForm, source: e.target.value})}
                    placeholder="e.g. Mumbai Hub" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Destination Location</label>
                  <input 
                    type="text" 
                    required 
                    value={tripForm.destination} 
                    onChange={e => setTripForm({...tripForm, destination: e.target.value})}
                    placeholder="e.g. Pune DC" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Select Available Vehicle</label>
                  <select 
                    required 
                    value={tripForm.vehicleId} 
                    onChange={e => setTripForm({...tripForm, vehicleId: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.filter((v: any) => v.status === "available").map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.registrationNumber}) - Max: {v.maxLoadCapacity}kg</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Select Available Driver</label>
                  <select 
                    required 
                    value={tripForm.driverId} 
                    onChange={e => setTripForm({...tripForm, driverId: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.filter((d: any) => d.status === "available" && new Date(d.licenseExpiryDate) > new Date()).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name} (Safety: {d.safetyScore}%)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Cargo Weight (kg)</label>
                  <input 
                    type="number" 
                    required 
                    value={tripForm.cargoWeight} 
                    onChange={e => setTripForm({...tripForm, cargoWeight: e.target.value})}
                    placeholder="e.g. 1500" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Planned Distance (km)</label>
                  <input 
                    type="number" 
                    required 
                    value={tripForm.plannedDistance} 
                    onChange={e => setTripForm({...tripForm, plannedDistance: e.target.value})}
                    placeholder="e.g. 150" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setShowTripModal(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all border border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow-md shadow-violet-600/20 transition-all">
                  Save &amp; Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== COMPLETE TRIP MODAL ==================== */}
      {showCompleteModal && selectedTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Complete Trip Assignment</h3>
                <span className="text-xs text-slate-500 font-mono mt-0.5 block">{selectedTrip.name}: {selectedTrip.source} &rarr; {selectedTrip.destination}</span>
              </div>
              <button onClick={() => {
                setShowCompleteModal(false);
                setSelectedTrip(null);
              }} className="text-slate-400 hover:text-slate-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleCompleteTrip} className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Actual Distance Travelled (km)</label>
                <input 
                  type="number" 
                  required 
                  value={completionForm.actualDistance} 
                  onChange={e => setCompletionForm({...completionForm, actualDistance: e.target.value})}
                  placeholder={`Planned: ${selectedTrip.plannedDistance} km`} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Fuel Consumed (Liters)</label>
                <input 
                  type="number" 
                  required 
                  value={completionForm.fuelConsumed} 
                  onChange={e => setCompletionForm({...completionForm, fuelConsumed: e.target.value})}
                  placeholder="e.g. 35" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 mt-1.5 focus:border-violet-600 focus:outline-none text-slate-100"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => {
                  setShowCompleteModal(false);
                  setSelectedTrip(null);
                }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-lg text-sm transition-all border border-slate-700">
                  Cancel
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm shadow-md shadow-emerald-600/20 transition-all">
                  Submit &amp; Close Trip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
